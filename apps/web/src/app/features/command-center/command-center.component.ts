import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { interval, of } from 'rxjs';
import { map, startWith, switchMap } from 'rxjs/operators';

import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { PulseService } from '../../core/services/pulse.service';
import { CAN, hasRole } from '../../core/models/roles';
import { API } from '../../core/models/endpoints';
import { AttendanceRecord, Company, Inspection, Person } from '../../core/models/domain';
import {
  clock,
  currencyCompact,
  duration,
  elapsedClock,
  firstName,
  greeting,
  longDate,
  relativeTime,
} from '../../core/utils/format';

import { NetroIcon } from '../../ui/icon';
import { NetroAlert, NetroIdentity, NetroMeter, NetroSkeleton, NetroState, NetroStatus } from '../../ui/primitives';
import { NetroMetric, NetroPageHeader, NetroPanel } from '../../ui/patterns';
import { NetroPulseBand } from '../../ui/pulse-band';
import { NetroActivityFeed, activityFrom } from '../../ui/activity-feed';

/**
 * The Dashboard.
 *
 * Not a dashboard of tiles. It answers, in reading order: what is happening
 * right now, who needs attention, and what activity is flowing through the
 * business. Composition is role-aware — a platform admin opens on tenants, a
 * manager on their reporting line, an employee on their own shift — but the
 * language, spacing and components are identical across all of them.
 */
@Component({
  selector: 'app-command-center',
  standalone: true,
  imports: [
    NgIf,
    NgClass,
    RouterLink,
    NetroIcon,
    NetroPageHeader,
    NetroPanel,
    NetroMetric,
    NetroStatus,
    NetroIdentity,
    NetroMeter,
    NetroAlert,
    NetroState,
    NetroSkeleton,
    NetroPulseBand,
    NetroActivityFeed,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './command-center.component.html',
  styleUrl: './command-center.component.css',
})
export class CommandCenterComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  readonly pulse = inject(PulseService);

  ngOnInit(): void {
    this.pulse.refresh();
  }

  onComingSoon(label: string): void {
    this.toast.info(
      `${label} — Coming Soon`,
      'This feature is currently in active development and will be released in an upcoming update.',
    );
  }

  readonly user = this.api.user;
  readonly persona = this.api.persona;

  readonly greeting = computed(() => `${greeting()}, ${firstName(this.user()?.name)}`);
  readonly today = longDate();

  readonly canSeeTeam = computed(() => hasRole(this.api.role(), CAN.viewTeamOperations));
  readonly canReview = computed(() => hasRole(this.api.role(), CAN.reviewApprovals));
  readonly isPlatform = computed(() => this.persona() === 'platform');

  /** Ticks once a second purely so the live shift timer stays honest. */
  private readonly tick = toSignal(interval(1000).pipe(startWith(0)), { initialValue: 0 });

  // ---- Data the Dashboard owns beyond the shared pulse ---------------

  private readonly inspections = toSignal(
    toObservable(this.user).pipe(
      switchMap(u => (u ? this.api.list<Inspection>('/inspections/today') : of([] as Inspection[]))),
    ),
    { initialValue: [] as Inspection[] },
  );

  /** Platform view: tenants are the operational unit rather than employees. */
  private readonly companies = toSignal(
    toObservable(this.user).pipe(
      switchMap(u => (u && this.isPlatform() ? this.api.list<Company>('/companies') : of([] as Company[]))),
    ),
    { initialValue: [] as Company[] },
  );

  /** Roster gaps need the headcount, which only the directory can give us. */
  private readonly people = toSignal(
    toObservable(this.user).pipe(
      switchMap(u =>
        u && hasRole(u.role, CAN.manageWorkforce)
          ? this.api.list<Person>(API.workforce, { pageSize: 100 })
          : of([] as Person[]),
      ),
    ),
    { initialValue: [] as Person[] },
  );

  // ---- Derived operational state -----------------------------------------

  readonly onDuty = this.pulse.onDuty;
  readonly closed = this.pulse.closed;
  readonly roster = computed(() => this.pulse.state().roster);

  readonly ownShift = computed(() => this.pulse.state().ownShift);
  readonly ownShiftClock = computed(() => {
    this.tick();
    const shift = this.ownShift();
    return shift ? elapsedClock(shift.punchInTime) : '00:00:00';
  });

  /** People expected today who have not punched at all. */
  readonly notPunched = computed<Person[]>(() => {
    const punchedIds = new Set(this.roster().map(r => r.userId));
    return this.people().filter(
      p =>
        p.status !== 'INACTIVE' &&
        !punchedIds.has(p.id) &&
        // Admin roles are excluded from attendance by the API, so they are not
        // absentees — showing them here would be a permanent false alarm.
        p.role !== 'COMPANY_ADMIN' &&
        p.role !== 'SUPER_ADMIN' &&
        p.role !== 'MASTER_SUPER_ADMIN',
    );
  });

  /** Shifts still open well past a normal working day. */
  readonly longRunning = computed<AttendanceRecord[]>(() =>
    this.onDuty().filter(r => Date.now() - new Date(r.punchInTime).getTime() > 10 * 60 * 60 * 1000),
  );

  readonly attendanceRate = computed(() => {
    const expected = this.people().length ? this.notPunched().length + this.roster().length : this.pulse.workforce();
    if (!expected) return null;
    return Math.round((this.roster().length / expected) * 100);
  });

  readonly expectedHeadcount = computed(
    () => this.notPunched().length + this.roster().length || (this.pulse.workforce() ?? 0),
  );

  readonly activity = computed(() =>
    activityFrom(this.pulse.state().visits, this.pulse.state().sales, this.inspections()),
  );

  readonly revenueToday = computed(() => this.pulse.revenueToday());
  readonly revenueLabel = computed(() => {
    const value = this.revenueToday();
    return value === null ? '—' : currencyCompact(value);
  });

  /** Exceptions, most urgent first. Empty means the day is genuinely clean. */
  readonly exceptions = computed(() => {
    const out: Array<{ id: string; tone: 'warn' | 'risk'; title: string; body: string; route: string; cta: string }> = [];

    const pending = this.pulse.pendingApprovals();
    if (this.canReview() && pending > 0) {
      out.push({
        id: 'approvals',
        tone: 'warn',
        title: `${pending} regularization ${pending === 1 ? 'request is' : 'requests are'} waiting on you`,
        body: 'Attendance records stay incorrect until these are decided.',
        route: '/approvals',
        cta: 'Review queue',
      });
    }

    const stuck = this.longRunning();
    if (stuck.length) {
      out.push({
        id: 'long-shifts',
        tone: 'warn',
        title: `${stuck.length} shift${stuck.length === 1 ? '' : 's'} open beyond 10 hours`,
        body: `${stuck
          .slice(0, 3)
          .map(s => s.user?.name ?? 'Unknown')
          .join(', ')}${stuck.length > 3 ? ` and ${stuck.length - 3} more` : ''} may have forgotten to punch out.`,
        route: '/attendance',
        cta: 'Open attendance',
      });
    }

    const missing = this.notPunched();
    if (this.canSeeTeam() && missing.length) {
      out.push({
        id: 'no-punch',
        tone: missing.length > this.roster().length ? 'risk' : 'warn',
        title: `${missing.length} ${missing.length === 1 ? 'person has' : 'people have'} not punched in`,
        body: `${missing
          .slice(0, 3)
          .map(p => p.name)
          .join(', ')}${missing.length > 3 ? ` and ${missing.length - 3} more` : ''}.`,
        route: '/attendance',
        cta: 'See roster',
      });
    }

    return out;
  });

  // ---- Platform view ------------------------------------------------------

  readonly tenants = computed(() => this.companies());
  readonly activeTenants = computed(() => this.tenants().filter(c => (c.status ?? 'ACTIVE') === 'ACTIVE').length);

  // ---- Presentation helpers ----------------------------------------------

  readonly syncLabel = computed(() => {
    const at = this.pulse.lastSyncedAt();
    return at ? `Live · updated ${relativeTime(at)}` : 'Connecting to live data…';
  });

  readonly busy = computed(() => this.pulse.loading() && !this.pulse.loaded());

  refresh(): void {
    this.pulse.refresh();
  }

  shiftLength(record: AttendanceRecord): string {
    return duration(record.punchInTime, record.punchOutTime);
  }

  since(record: AttendanceRecord): string {
    return clock(record.punchInTime);
  }
}
