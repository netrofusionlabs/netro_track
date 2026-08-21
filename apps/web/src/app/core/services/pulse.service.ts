import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ApiService } from './api.service';
import { CAN, hasRole } from '../models/roles';
import {
  AttendanceRecord,
  DashboardSummary,
  Regularization,
  Sale,
  TeamSummary,
  Visit,
} from '../models/domain';

/**
 * Netro Pulse — the shared operational read-out.
 *
 * Presence → movement → activity → outcome, read once from the real API and
 * shared by the nav badge, the Dashboard and the live board so those
 * surfaces can never disagree with each other.
 *
 * Scope follows the signed-in role: an admin gets the company, a manager gets
 * their reporting line, an employee gets their own day. Anything the role may
 * not read stays `null` rather than becoming a zero, so the UI can distinguish
 * "nothing happened" from "you cannot see this".
 */

export interface PulseState {
  /** Today's punch sessions in the viewer's scope. */
  roster: AttendanceRecord[];
  /** Pending regularizations the viewer can act on. */
  pending: Regularization[];
  visits: Visit[];
  sales: Sale[];
  summary: DashboardSummary | null;
  team: TeamSummary | null;
  /** The viewer's own open shift, if they have one. */
  ownShift: AttendanceRecord | null;
}

const EMPTY: PulseState = {
  roster: [],
  pending: [],
  visits: [],
  sales: [],
  summary: null,
  team: null,
  ownShift: null,
};

/** Slow enough to be kind to a multi-tenant API, fresh enough to be operational. */
const POLL_MS = 120_000;

@Injectable({ providedIn: 'root' })
export class PulseService {
  private readonly api = inject(ApiService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = signal<PulseState>(EMPTY);
  readonly loading = signal(false);
  readonly loaded = signal(false);
  readonly lastSyncedAt = signal<Date | null>(null);
  /** True when the last refresh could not reach the API at all. */
  readonly offline = signal(false);

  /** Does this viewer see other people's work, or only their own? */
  readonly hasScope = computed(() => hasRole(this.api.role(), CAN.viewTeamOperations));

  readonly onDuty = computed(() => this.state().roster.filter(r => !r.punchOutTime));
  readonly closed = computed(() => this.state().roster.filter(r => !!r.punchOutTime));

  /** Headcount the viewer is accountable for, when the API reports one. */
  readonly workforce = computed(() => {
    const s = this.state();
    return s.team?.teamSize ?? s.summary?.totalEmployees ?? null;
  });

  readonly notPunched = computed(() => {
    const total = this.workforce();
    if (total === null) return null;
    return Math.max(0, total - this.state().roster.length);
  });

  readonly attendanceRate = computed(() => {
    const total = this.workforce();
    if (!total) return null;
    return Math.round((this.state().roster.length / total) * 100);
  });

  readonly pendingApprovals = computed(() => this.state().pending.length);

  readonly revenueToday = computed(() => {
    const s = this.state();
    if (s.sales.length) return s.sales.reduce((sum, sale) => sum + toNumber(sale.totalAmount), 0);
    return s.team?.revenueToday ?? s.summary?.revenue ?? null;
  });

  readonly visitsToday = computed(() => {
    const s = this.state();
    if (s.visits.length) return s.visits.length;
    return s.team?.visitsToday ?? s.summary?.visitsToday ?? null;
  });

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.api.currentUser$.subscribe(user => {
      this.stop();
      if (!user?.role) {
        this.state.set(EMPTY);
        this.loaded.set(false);
        this.lastSyncedAt.set(null);
        return;
      }
      this.refresh();
      this.timer = setInterval(() => this.refresh(), POLL_MS);
    });

    this.destroyRef.onDestroy(() => this.stop());
  }

  private stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  refresh(): void {
    const role = this.api.role() ?? this.api.currentUser$.value?.role;
    if (!role) {
      if (this.api.isAuthenticated()) {
        this.api.fetchCurrentUser().subscribe({
          next: () => this.refresh(),
        });
      }
      return;
    }

    const canSeeCompany = hasRole(role, CAN.viewCompanyOperations);
    const canSeeTeam = hasRole(role, CAN.viewTeamOperations);

    this.loading.set(true);

    // Managers see their reporting line; HR and above see the whole company.
    const rosterUrl = canSeeCompany ? '/attendance/company' : '/attendance/team';

    forkJoin({
      roster: canSeeTeam ? this.api.list<AttendanceRecord>(rosterUrl) : of<AttendanceRecord[]>([]),
      // The endpoint scopes itself: reviewers get their queue, everyone else
      // gets their own outstanding requests.
      pending: this.api.list<Regularization>('/attendance/regularization', { status: 'PENDING' }),
      visits: this.api.list<Visit>('/customer-visits/today'),
      sales: this.api.list<Sale>('/product-sales/today'),
      summary: canSeeTeam ? this.api.one<DashboardSummary>('/dashboard/summary') : of(null),
      team: role === 'MANAGER' ? this.api.one<TeamSummary>('/dashboard/team-summary') : of(null),
      ownShift: this.api.one<AttendanceRecord>('/attendance/active'),
    })
      .pipe(catchError(() => of(null)))
      .subscribe(result => {
        this.loading.set(false);
        if (!result) {
          this.offline.set(true);
          return;
        }
        this.offline.set(false);
        this.state.set(result);
        this.loaded.set(true);
        this.lastSyncedAt.set(new Date());
      });
  }
}

function toNumber(value: number | string | null | undefined): number {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) ? n : 0;
}
