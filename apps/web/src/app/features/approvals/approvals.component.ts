import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LowerCasePipe, NgClass, NgIf, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService, apiError } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { PulseService } from '../../core/services/pulse.service';
import { ApprovalAction, Regularization, RegularizationStatus } from '../../core/models/domain';
import { API } from '../../core/models/endpoints';
import { clock, dayLabel, duration, relativeTime } from '../../core/utils/format';

import { NetroIcon } from '../../ui/icon';
import { NetroAvatar, NetroBadge, NetroSkeletonRows, NetroState } from '../../ui/primitives';
import { NetroPageHeader, NetroPanel, NetroTabs } from '../../ui/patterns';
import { NetroDrawer } from '../../ui/overlays';
import { NetroToolbar } from '../../ui/toolbar';

type Decision = 'APPROVED' | 'REJECTED';

interface Change {
  label: string;
  from: string;
  to: string;
  changed: boolean;
}

/**
 * The approvals queue.
 *
 * A regularization request is a claim that an attendance record is wrong. The
 * reviewer's job is to compare what was recorded against what is claimed, so
 * the queue leads with that comparison rather than with a table of ids. Bulk
 * decisions exist for the routine cases; the drawer exists for the ones that
 * need reading.
 */
@Component({
  selector: 'app-approvals',
  standalone: true,
  imports: [
    NgIf,
    NgClass,
    LowerCasePipe,
    TitleCasePipe,
    FormsModule,
    NetroIcon,
    NetroPageHeader,
    NetroPanel,
    NetroTabs,
    NetroToolbar,
    NetroAvatar,
    NetroBadge,
    NetroState,
    NetroSkeletonRows,
    NetroDrawer,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './approvals.component.html',
  styleUrl: './approvals.component.css',
})
export class ApprovalsComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly pulse = inject(PulseService);

  readonly requests = signal<Regularization[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly working = signal(false);

  readonly status = signal<RegularizationStatus>('PENDING');
  readonly search = signal('');
  readonly selected = signal<Set<string>>(new Set());

  /** The request open in the review drawer. */
  readonly reviewing = signal<Regularization | null>(null);
  readonly remarks = signal('');
  readonly approvalHistory = signal<ApprovalAction[]>([]);
  readonly loadingHistory = signal(false);

  readonly tabs = computed(() => [
    { value: 'PENDING', label: 'Awaiting decision', icon: 'clock' as const, count: this.pendingCount(), urgent: true },
    { value: 'APPROVED', label: 'Approved', icon: 'check-circle' as const },
    { value: 'REJECTED', label: 'Rejected', icon: 'x-circle' as const },
  ]);

  private readonly pendingCount = signal<number | null>(null);

  readonly visible = computed(() => {
    const q = this.search().trim().toLowerCase();
    if (!q) return this.requests();
    return this.requests().filter(
      r =>
        r.user?.name?.toLowerCase().includes(q) ||
        r.user?.employeeId?.toLowerCase().includes(q) ||
        r.reason?.toLowerCase().includes(q),
    );
  });

  readonly allSelected = computed(
    () => this.visible().length > 0 && this.visible().every(r => this.selected().has(r.id)),
  );
  readonly someSelected = computed(() => this.selected().size > 0 && !this.allSelected());
  readonly selectionCount = computed(() => this.selected().size);

  readonly canDecide = computed(() => this.status() === 'PENDING');

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.selected.set(new Set());

    this.api.get<Regularization[]>('/attendance/regularization', { status: this.status() }).subscribe({
      next: res => {
        const rows = Array.isArray(res.data) ? res.data : [];
        this.requests.set(rows);
        if (this.status() === 'PENDING') this.pendingCount.set(rows.length);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(apiError(err, 'Could not load the approvals queue.'));
        this.loading.set(false);
      },
    });
  }

  setStatus(value: string): void {
    this.status.set(value as RegularizationStatus);
    this.load();
  }

  // ---- Selection ----------------------------------------------------------

  toggleRow(id: string): void {
    this.selected.update(current => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  toggleAll(): void {
    this.selected.update(current =>
      current.size === this.visible().length ? new Set() : new Set(this.visible().map(r => r.id)),
    );
  }

  clearSelection(): void {
    this.selected.set(new Set());
  }

  isSelected(id: string): boolean {
    return this.selected().has(id);
  }

  // ---- Review -------------------------------------------------------------

  open(request: Regularization): void {
    this.reviewing.set(request);
    this.remarks.set('');
    this.approvalHistory.set([]);
    this.loadingHistory.set(true);
    this.api
      .get<ApprovalAction[]>(API.approvalHistory('REGULARIZATION', request.id))
      .subscribe({
        next: res => {
          this.approvalHistory.set(Array.isArray(res.data) ? res.data : []);
          this.loadingHistory.set(false);
        },
        error: () => {
          this.approvalHistory.set([]);
          this.loadingHistory.set(false);
        },
      });
  }

  close(): void {
    this.reviewing.set(null);
  }

  decide(request: Regularization, action: Decision): void {
    if (action === 'REJECTED' && !this.remarks().trim()) {
      this.toast.warning('A reason is required', 'Tell the employee why the request was rejected.');
      return;
    }

    this.working.set(true);
    this.api
      .post(`/attendance/regularization/${request.id}/review`, {
        action,
        remarks: this.remarks().trim() || null,
      })
      .subscribe({
        next: () => {
          this.working.set(false);
          this.close();
          this.toast.success(
            action === 'APPROVED' ? 'Request approved' : 'Request rejected',
            action === 'APPROVED'
              ? `${request.user?.name}'s attendance record for ${dayLabel(request.date)} has been corrected.`
              : `${request.user?.name} has been told why.`,
          );
          this.load();
          this.pulse.refresh();
        },
        error: err => {
          this.working.set(false);
          this.toast.error('Could not record the decision', apiError(err));
        },
      });
  }

  async bulk(action: Decision): Promise<void> {
    const ids = [...this.selected()];
    if (!ids.length) return;

    const remarks = this.remarks().trim();
    if (action === 'REJECTED' && !remarks) {
      this.toast.warning(
        'A reason is required to reject',
        'Open a single request to write the reason, or approve instead.',
      );
      return;
    }

    const ok = await this.confirm.ask({
      title: action === 'APPROVED' ? `Approve ${ids.length} requests?` : `Reject ${ids.length} requests?`,
      body:
        action === 'APPROVED'
          ? 'Approving rewrites each attendance record with the requested punch times. This is recorded against your name.'
          : 'Each employee will see this decision against their request.',
      confirmLabel: action === 'APPROVED' ? `Approve ${ids.length}` : `Reject ${ids.length}`,
      tone: action === 'APPROVED' ? 'default' : 'danger',
      facts: [{ label: 'Requests', value: String(ids.length) }],
    });
    if (!ok) return;

    this.working.set(true);
    this.api
      .post('/attendance/regularization/bulk-review', { ids, action, remarks: remarks || null })
      .subscribe({
        next: () => {
          this.working.set(false);
          this.toast.success(
            action === 'APPROVED' ? `${ids.length} approved` : `${ids.length} rejected`,
            'The queue has been updated.',
          );
          this.load();
          this.pulse.refresh();
        },
        error: err => {
          this.working.set(false);
          this.toast.error('Bulk decision failed', apiError(err));
        },
      });
  }

  // ---- Presentation -------------------------------------------------------

  /** The heart of the review: recorded versus requested, difference marked. */
  changesFor(request: Regularization): Change[] {
    const rows: Change[] = [
      {
        label: 'Punch in',
        from: clock(request.originalPunchIn),
        to: clock(request.requestedPunchIn),
        changed: !same(request.originalPunchIn, request.requestedPunchIn),
      },
      {
        label: 'Punch out',
        from: clock(request.originalPunchOut),
        to: clock(request.requestedPunchOut),
        changed: !same(request.originalPunchOut, request.requestedPunchOut),
      },
    ];

    if (request.originalPunchInOdometer != null || request.requestedPunchInOdometer != null) {
      rows.push({
        label: 'Odometer in',
        from: numberOrDash(request.originalPunchInOdometer),
        to: numberOrDash(request.requestedPunchInOdometer),
        changed: request.originalPunchInOdometer !== request.requestedPunchInOdometer,
      });
    }
    if (request.originalPunchOutOdometer != null || request.requestedPunchOutOdometer != null) {
      rows.push({
        label: 'Odometer out',
        from: numberOrDash(request.originalPunchOutOdometer),
        to: numberOrDash(request.requestedPunchOutOdometer),
        changed: request.originalPunchOutOdometer !== request.requestedPunchOutOdometer,
      });
    }

    return rows;
  }

  /** A missed day is a different decision from a time correction; label it. */
  kindOf(request: Regularization): string {
    return request.attendanceId ? 'Time correction' : 'Missed punch';
  }

  requestedSpan(request: Regularization): string {
    if (!request.requestedPunchIn || !request.requestedPunchOut) return '—';
    return duration(request.requestedPunchIn, request.requestedPunchOut);
  }

  day(value: string): string {
    return dayLabel(value);
  }

  time(value: string | null | undefined): string {
    return clock(value);
  }

  ago(value: string): string {
    return relativeTime(value);
  }

  toneFor(status: RegularizationStatus): 'ok' | 'risk' | 'warn' {
    return status === 'APPROVED' ? 'ok' : status === 'REJECTED' ? 'risk' : 'warn';
  }
}

function same(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
}

function numberOrDash(value: number | null | undefined): string {
  return value == null ? '—' : String(value);
}
