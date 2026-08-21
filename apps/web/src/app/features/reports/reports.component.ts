import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { DatePipe, NgFor, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiService, apiError } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { API } from '../../core/models/endpoints';
import { AttendanceReport, SalesReport, VisitsReport } from '../../core/models/domain';
import { addDays, clock, currency, duration, isoDate } from '../../core/utils/format';

import { NetroIcon, IconName } from '../../ui/icon';
import { NetroAlert, NetroBadge, NetroSkeletonRows, NetroState } from '../../ui/primitives';
import { NetroMetric, NetroPageHeader, NetroPanel, NetroTabs } from '../../ui/patterns';

type ReportKind = 'attendance' | 'visits' | 'sales';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DatePipe,
    FormsModule,
    NetroIcon,
    NetroPageHeader,
    NetroPanel,
    NetroTabs,
    NetroMetric,
    NetroBadge,
    NetroState,
    NetroAlert,
    NetroSkeletonRows,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reports.component.html',
})
export class ReportsComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);

  readonly kind = signal<ReportKind>('attendance');
  readonly startDate = signal(isoDate(addDays(new Date(), -6)));
  readonly endDate = signal(isoDate());
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly ran = signal(false);

  readonly attendance = signal<AttendanceReport | null>(null);
  readonly visits = signal<VisitsReport | null>(null);
  readonly sales = signal<SalesReport | null>(null);

  readonly tabs: Array<{ value: ReportKind; label: string; icon: IconName }> = [
    { value: 'attendance', label: 'Attendance', icon: 'clock' },
    { value: 'visits', label: 'Visits', icon: 'pin' },
    { value: 'sales', label: 'Sales', icon: 'orders' },
  ];

  readonly endpoint = computed(() => {
    switch (this.kind()) {
      case 'visits':
        return API.reportsVisits;
      case 'sales':
        return API.reportsSales;
      default:
        return API.reportsAttendance;
    }
  });

  money = currency;
  hours = duration;
  time = clock;

  select(kind: string): void {
    this.kind.set(kind as ReportKind);
  }

  generate(): void {
    if (this.startDate() > this.endDate()) {
      this.toast.warning('Check the dates', 'The start date cannot be after the end date.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.ran.set(true);
    const query = { startDate: this.startDate(), endDate: this.endDate() };

    this.api.get<AttendanceReport | VisitsReport | SalesReport>(this.endpoint(), query).subscribe({
      next: res => {
        this.loading.set(false);
        if (this.kind() === 'attendance') this.attendance.set((res.data as AttendanceReport) ?? null);
        if (this.kind() === 'visits') this.visits.set((res.data as VisitsReport) ?? null);
        if (this.kind() === 'sales') this.sales.set((res.data as SalesReport) ?? null);
      },
      error: err => {
        this.loading.set(false);
        this.error.set(apiError(err, 'Could not generate this report.'));
      },
    });
  }
}
