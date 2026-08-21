import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService, CurrentUser, apiError } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { API } from '../../core/models/endpoints';
import { roleLabel } from '../../core/models/roles';
import { PersonTimelineEvent } from '../../core/models/domain';
import { titleCase } from '../../core/utils/format';

import { NetroIcon, IconName } from '../../ui/icon';
import { NetroAvatar, NetroBadge, NetroAlert, Tone, NetroSkeletonRows } from '../../ui/primitives';
import { NetroPageHeader, NetroPanel, NetroTimeline, TimelineEvent } from '../../ui/patterns';
import { NetroDrawer } from '../../ui/overlays';

const TIMELINE_STYLE: Record<string, { icon: IconName; tone: Tone }> = {
  ONBOARDING: { icon: 'user-plus', tone: 'info' },
  PROMOTION: { icon: 'arrow-up-right', tone: 'ok' },
  DESIGNATION_ASSIGNED: { icon: 'briefcase', tone: 'neutral' },
  DESIGNATION_CHANGED: { icon: 'briefcase', tone: 'neutral' },
  ACCESS_ROLE_ASSIGNED: { icon: 'shield', tone: 'neutral' },
  ACCESS_ROLE_CHANGED: { icon: 'shield', tone: 'warn' },
  MANAGER_ASSIGNED: { icon: 'hierarchy', tone: 'neutral' },
  MANAGER_CHANGED: { icon: 'hierarchy', tone: 'warn' },
  ATTENDANCE_POLICY_CHANGED: { icon: 'policy', tone: 'neutral' },
  DEACTIVATION: { icon: 'lock', tone: 'risk' },
  REACTIVATION: { icon: 'check-circle', tone: 'ok' },
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    NetroIcon,
    NetroPageHeader,
    NetroPanel,
    NetroAvatar,
    NetroBadge,
    NetroAlert,
    NetroTimeline,
    NetroSkeletonRows,
    NetroDrawer,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);

  readonly user = this.api.user;
  readonly uploading = signal(false);
  readonly uploadError = signal<string | null>(null);
  readonly savingMpin = signal(false);
  readonly savingPassword = signal(false);

  readonly history = signal<PersonTimelineEvent[]>([]);
  readonly historyLoading = signal(false);

  readonly legalModal = signal<'terms' | 'privacy' | null>(null);

  readonly mpinForm = this.fb.nonNullable.group(
    {
      mpin: ['', [Validators.required, Validators.pattern(/^\d{4,6}$/)]],
      confirm: ['', Validators.required],
    },
    {
      validators: group => (group.get('mpin')?.value === group.get('confirm')?.value ? null : { mismatch: true }),
    },
  );

  readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: [''],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    {
      validators: group => (group.get('newPassword')?.value === group.get('confirmPassword')?.value ? null : { mismatch: true }),
    },
  );

  readonly timelineEvents = computed<TimelineEvent[]>(() =>
    this.history().map(event => {
      const style = TIMELINE_STYLE[event.eventType] ?? { icon: 'note' as IconName, tone: 'neutral' as Tone };
      return {
        title: event.title || titleCase(event.eventType),
        meta: [
          new Date(event.effectiveDate || event.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          }),
          event.changedByName ? `by ${event.changedByName}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        note: event.description || (event.previousValue && event.newValue ? `${event.previousValue} → ${event.newValue}` : null),
        icon: style.icon,
        tone: style.tone,
      };
    }),
  );

  label = roleLabel;

  constructor() {
    this.loadTimeline();
  }

  loadTimeline(): void {
    const u = this.user();
    if (!u?.id) return;
    this.historyLoading.set(true);
    this.api.list<PersonTimelineEvent>(API.personTimeline(u.id)).subscribe({
      next: res => {
        this.history.set(res);
        this.historyLoading.set(false);
      },
      error: () => this.historyLoading.set(false),
    });
  }

  onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.uploadError.set('Only image files are allowed.');
      return;
    }
    this.uploading.set(true);
    this.uploadError.set(null);

    this.api.post<{ uploadUrl: string; fileId: string }>(API.profilePictureUploadUrl, { mimeType: file.type }).subscribe({
      next: res => {
        const data = res.data;
        if (!data?.uploadUrl || !data.fileId) {
          this.uploading.set(false);
          this.uploadError.set('Could not start the upload.');
          return;
        }
        fetch(data.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
          .then(uploadRes => {
            if (!uploadRes.ok) throw new Error('Upload failed');
            return this.api.post(API.profilePictureComplete, { fileId: data.fileId }).toPromise();
          })
          .then(() => {
            this.uploading.set(false);
            this.toast.success('Photo updated', 'Your profile picture is now visible across NetroTrack.');
            this.api.fetchCurrentUser().subscribe({ error: () => undefined });
          })
          .catch(err => {
            this.uploading.set(false);
            this.uploadError.set(err instanceof Error ? err.message : 'Upload failed.');
          });
      },
      error: err => {
        this.uploading.set(false);
        this.uploadError.set(apiError(err, 'Could not start the upload.'));
      },
    });
  }

  saveMpin(): void {
    if (this.mpinForm.invalid) {
      this.mpinForm.markAllAsTouched();
      return;
    }
    this.savingMpin.set(true);
    this.api.post(API.mpinSetup, { mpin: this.mpinForm.controls.mpin.value }).subscribe({
      next: () => {
        this.savingMpin.set(false);
        this.mpinForm.reset();
        this.toast.success('MPIN saved', 'You can now sign in with your MPIN from this browser.');
      },
      error: err => {
        this.savingMpin.set(false);
        this.toast.error('Could not save MPIN', apiError(err));
      },
    });
  }

  savePassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    const u = this.user();
    if (!u?.id) return;
    this.savingPassword.set(true);
    this.api.put(API.person(u.id), { password: this.passwordForm.controls.newPassword.value }).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordForm.reset();
        this.toast.success('Password changed', 'Your new password has been saved securely.');
      },
      error: err => {
        this.savingPassword.set(false);
        this.toast.error('Could not change password', apiError(err));
      },
    });
  }

  openLegal(doc: 'terms' | 'privacy'): void {
    this.legalModal.set(doc);
  }

  closeLegal(): void {
    this.legalModal.set(null);
  }

  u(): CurrentUser | null {
    return this.user();
  }
}

