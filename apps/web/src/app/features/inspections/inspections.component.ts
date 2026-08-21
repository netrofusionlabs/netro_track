import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService, apiError } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { API } from '../../core/models/endpoints';
import {
  INSPECTION_CATEGORIES,
  Inspection,
  inspectionAdvice,
  inspectionNote,
} from '../../core/models/domain';
import { clock, dayLabel, mapsLink, titleCase, uuid } from '../../core/utils/format';
import { locate } from '../../core/utils/geo';

import { NetroIcon } from '../../ui/icon';
import { NetroAvatar, NetroBadge, NetroSkeletonRows, NetroState, NetroAlert } from '../../ui/primitives';
import { NetroPageHeader, NetroPanel } from '../../ui/patterns';
import { NetroDrawer } from '../../ui/overlays';
import { NetroToolbar } from '../../ui/toolbar';

@Component({
  selector: 'app-inspections',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    FormsModule,
    NetroIcon,
    NetroPageHeader,
    NetroPanel,
    NetroToolbar,
    NetroAvatar,
    NetroBadge,
    NetroState,
    NetroAlert,
    NetroSkeletonRows,
    NetroDrawer,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inspections.component.html',
})
export class InspectionsComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly categories = INSPECTION_CATEGORIES;
  readonly inspections = signal<Inspection[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly viewing = signal<Inspection | null>(null);
  readonly editorOpen = signal(false);
  readonly saving = signal(false);

  readonly siteName = signal('');
  readonly category = signal('QUALITY_CONTROL');
  readonly observation = signal('');
  readonly recommendation = signal('');

  readonly rows = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.inspections();
    return this.inspections().filter(row =>
      [row.siteName, row.category, row.user?.name, inspectionNote(row)].join(' ').toLowerCase().includes(q),
    );
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.get<Inspection[]>(API.inspections).subscribe({
      next: res => {
        this.inspections.set(Array.isArray(res.data) ? res.data : []);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(apiError(err, 'Could not load inspections.'));
        this.loading.set(false);
      },
    });
  }

  note = inspectionNote;
  advice = inspectionAdvice;
  label = titleCase;
  maps = mapsLink;
  when = (row: Inspection) => dayLabel(row.createdAt) + ' · ' + clock(row.createdAt);

  view(row: Inspection): void {
    this.viewing.set(row);
  }
  closeView(): void {
    this.viewing.set(null);
  }

  startCreate(): void {
    this.siteName.set('');
    this.category.set('QUALITY_CONTROL');
    this.observation.set('');
    this.recommendation.set('');
    this.editorOpen.set(true);
    this.closeView();
  }

  async closeEditor(): Promise<void> {
    if (this.siteName() || this.observation()) {
      const ok = await this.confirm.ask({
        title: 'Discard this inspection?',
        body: 'The site and observations will not be kept.',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
        tone: 'danger',
      });
      if (!ok) return;
    }
    this.editorOpen.set(false);
  }

  async submit(): Promise<void> {
    if (!this.siteName().trim() || !this.observation().trim()) {
      this.toast.warning('Site and observation are required', 'Say where you were and what you saw.');
      return;
    }
    this.saving.set(true);
    try {
      const coords = await locate();
      this.api
        .post<Inspection>(API.inspections, {
          localId: uuid(),
          siteName: this.siteName().trim(),
          category: this.category(),
          latitude: coords.latitude,
          longitude: coords.longitude,
          observation: this.observation().trim(),
          recommendation: this.recommendation().trim() || undefined,
          imageUrls: [],
        })
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.editorOpen.set(false);
            this.toast.success('Inspection logged', 'Recorded at your current location.');
            this.load();
          },
          error: err => {
            this.saving.set(false);
            this.toast.error('Could not record this inspection', apiError(err));
          },
        });
    } catch (err) {
      this.saving.set(false);
      this.toast.error('Location needed', err instanceof Error ? err.message : 'Could not read your location.');
    }
  }

  applySearch(value: string): void {
    this.search.set(value);
  }
}
