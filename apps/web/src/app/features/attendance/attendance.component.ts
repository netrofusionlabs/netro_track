import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { DecimalPipe, LowerCasePipe, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';

import { ApiService, apiError } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { PulseService } from '../../core/services/pulse.service';
import { CAN, hasRole } from '../../core/models/roles';
import { API } from '../../core/models/endpoints';
import {
  AttendanceRecord,
  DEFAULT_PUNCH_CONFIG,
  DEFAULT_REGULARIZATION_CONFIG,
  EffectivePolicy,
  MonthDay,
  MonthSummary,
  POLICY_SOURCE_LABEL,
  PUNCH_COMPONENTS,
  Person,
  PunchComponentStatus,
  PunchConfig,
  Regularization,
  RegularizationConfig,
  RegularizationStatus,
  clonePunch,
} from '../../core/models/domain';
import {
  clock,
  dayLabel,
  duration,
  elapsedClock,
  isoDate,
  longDate,
  mapsLink,
  percent,
  relativeTime,
  titleCase,
} from '../../core/utils/format';

import { NetroIcon, IconName } from '../../ui/icon';
import {
  NetroAlert,
  NetroAvatar,
  NetroBadge,
  NetroSkeletonRows,
  NetroState,
  NetroStatus,
  Tone,
} from '../../ui/primitives';
import { NetroMetric, NetroPageHeader, NetroPanel, NetroTabs } from '../../ui/patterns';
import { NetroDrawer } from '../../ui/overlays';
import { NetroPulseBand } from '../../ui/pulse-band';
import { PunchEvidenceModalComponent } from './punch-evidence-modal.component';

type Tab = 'me' | 'roster';

/** A single evidence value, ready to render. */
interface EvidenceRow {
  label: string;
  value: string;
  link: string | null;
}

/** A person in scope who has no punch on the selected day. */
interface Exception {
  person: Person;
  reason: string;
}

/** The correction request being composed. */
interface RequestForm {
  date: string;
  punchIn: string;
  punchOut: string;
  includePunchIn: boolean;
  includePunchOut: boolean;
  odometerIn: string;
  odometerOut: string;
  reason: string;
}

const COMPONENT_LABEL = new Map(PUNCH_COMPONENTS.map(c => [c.key, c.label]));

/** Roles the API refuses a punch from — they administer attendance, not file it. */
const NON_PUNCHING_ROLES = ['MASTER_SUPER_ADMIN', 'SUPER_ADMIN', 'COMPANY_ADMIN'];

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    DecimalPipe,
    LowerCasePipe,
    TitleCasePipe,
    FormsModule,
    RouterLink,
    NetroIcon,
    NetroPageHeader,
    NetroPanel,
    NetroTabs,
    NetroMetric,
    NetroAlert,
    NetroAvatar,
    NetroBadge,
    NetroStatus,
    NetroState,
    NetroSkeletonRows,
    NetroDrawer,
    NetroPulseBand,
    PunchEvidenceModalComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.css',
})
export class AttendanceComponent implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly pulse = inject(PulseService);

  // ---- Evidence Modal & Lightbox -------------------------------------------
  readonly evidenceModalOpen = signal(false);
  readonly evidenceModalMode = signal<'CAMERA' | 'SIGNATURE' | 'UPLOAD'>('CAMERA');
  readonly evidenceModalField = signal<string>('selfie');
  readonly evidenceModalTitle = signal<string>('Attach Evidence');
  readonly evidenceModalSubtitle = signal<string>('Capture or upload photo evidence');
  readonly capturedEvidence = signal<Record<string, unknown>>({});
  readonly lightboxUrl = signal<string | null>(null);

  // ---- Reverse Geocoding Address State -------------------------------------
  readonly inAddress = signal<string | null>(null);
  readonly outAddress = signal<string | null>(null);
  readonly addressLoading = signal(false);

  // ---- Who is looking ------------------------------------------------------

  readonly me = this.api.user;
  readonly canSeeTeam = computed(() => hasRole(this.api.role(), CAN.viewTeamOperations));
  readonly canSeeCompany = computed(() => hasRole(this.api.role(), CAN.viewCompanyOperations));
  readonly canReview = computed(() => hasRole(this.api.role(), CAN.reviewApprovals));
  /** Admin roles have no shift of their own; the API rejects their punches. */
  readonly punchesOwnShift = computed(() => {
    const role = this.api.role();
    return !!role && !NON_PUNCHING_ROLES.includes(role);
  });

  readonly tab = signal<Tab>('me');

  readonly tabs = computed(() => {
    const list = [
      { value: 'me', label: 'My attendance', icon: 'clock' as IconName },
    ];
    if (this.canSeeTeam()) {
      list.push({
        value: 'roster',
        label: this.canSeeCompany() ? 'Company roster' : 'Team roster',
        icon: 'people' as IconName,
      });
    }
    return list;
  });

  // ---- My day --------------------------------------------------------------

  readonly policy = signal<EffectivePolicy | null>(null);
  readonly ownShift = signal<AttendanceRecord | null>(null);
  readonly history = signal<AttendanceRecord[]>([]);
  readonly myRequests = signal<Regularization[]>([]);
  readonly mineLoading = signal(true);

  readonly month = signal<MonthSummary | null>(null);
  readonly monthLoading = signal(false);
  /** First of the month currently shown in the shift log. */
  readonly monthCursor = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  readonly punching = signal(false);
  readonly punchError = signal<string | null>(null);

  /** Evidence the browser can collect, keyed as the API expects it. */
  readonly remarks = signal('');
  readonly odometer = signal('');
  readonly customValues = signal<Record<string, string>>({});

  /** Ticks once a second so the open-shift timer stays honest. */
  private readonly tick = signal(0);
  private readonly timer = setInterval(() => this.tick.update(n => n + 1), 1000);

  readonly elapsed = computed(() => {
    this.tick();
    const shift = this.ownShift();
    return shift ? elapsedClock(shift.punchInTime) : '00:00:00';
  });

  readonly punchInConfig = computed(() => this.policy()?.punchInConfig ?? DEFAULT_PUNCH_CONFIG);
  /**
   * Punch-out is locked to the snapshot taken at punch-in. Changing the company
   * policy mid-shift must not silently change what this close is allowed to send.
   */
  readonly punchOutConfig = computed(() => {
    const frozen = this.ownShift()?.policySnapshot?.punchOutConfig;
    if (frozen) return clonePunch(frozen);
    return this.policy()?.punchOutConfig ?? DEFAULT_PUNCH_CONFIG;
  });
  /** Whichever side of the shift the person is about to record. */
  readonly activeConfig = computed(() => (this.ownShift() ? this.punchOutConfig() : this.punchInConfig()));
  readonly regularizationRules = computed<RegularizationConfig>(
    () => this.policy()?.regularizationConfig ?? DEFAULT_REGULARIZATION_CONFIG,
  );

  readonly policyName = computed(() => {
    const frozen = this.ownShift()?.policySnapshot?.policyName;
    return frozen || this.policy()?.policyName || 'Attendance policy';
  });

  /** True when the open shift is still bound to yesterday's (or this morning's) rules. */
  readonly shiftFollowsSnapshot = computed(() => {
    const frozen = this.ownShift()?.policySnapshot?.punchOutConfig;
    const live = this.policy()?.punchOutConfig;
    if (!frozen || !live) return false;
    return requiredEvidenceKey(frozen) !== requiredEvidenceKey(live);
  });

  readonly policySource = computed(() => {
    const p = this.policy();
    return p ? POLICY_SOURCE_LABEL[p.source] : null;
  });

  /** Required evidence missing from current capture. */
  readonly missingRequiredEvidence = computed(() => {
    const config = this.activeConfig();
    const captured = this.capturedEvidence();
    const missing: Array<{ key: keyof PunchConfig; label: string; mode: 'CAMERA' | 'SIGNATURE' | 'UPLOAD' }> = [];

    if (config.selfie === 'REQUIRED' && !captured['selfie']) {
      missing.push({ key: 'selfie', label: 'Selfie Photo', mode: 'CAMERA' });
    }
    if (config.vehicleMeter === 'REQUIRED' && (!captured['vehicleMeter'] || !captured['vehicleMeterPhoto'])) {
      missing.push({ key: 'vehicleMeter', label: 'Odometer Photo', mode: 'CAMERA' });
    }
    if (config.vehiclePhoto === 'REQUIRED' && !captured['vehiclePhoto']) {
      missing.push({ key: 'vehiclePhoto', label: 'Vehicle Photo', mode: 'CAMERA' });
    }
    if (config.workSitePhoto === 'REQUIRED' && !captured['workSitePhoto']) {
      missing.push({ key: 'workSitePhoto', label: 'Work Site Photo', mode: 'CAMERA' });
    }
    if (config.signature === 'REQUIRED' && !captured['signature']) {
      missing.push({ key: 'signature', label: 'Digital Signature', mode: 'SIGNATURE' });
    }
    return missing;
  });

  readonly punchBlockers = computed(() => {
    return this.missingRequiredEvidence().map(m => `${m.label} is required`);
  });

  readonly asksForRemarks = computed(() => this.activeConfig().remarks !== 'DISABLED');
  readonly asksForOdometer = computed(() => this.activeConfig().vehicleMeter !== 'DISABLED');
  readonly customFields = computed(() => (this.activeConfig().customFields ?? []).filter(f => f.status !== 'DISABLED'));

  /** Everything the policy asks for on this punch, for the console's checklist. */
  readonly punchRequirements = computed(() => {
    const config = this.activeConfig();
    const captured = this.capturedEvidence();
    return PUNCH_COMPONENTS.filter(c => config[c.key] !== 'DISABLED').map(c => ({
      key: c.key,
      label: c.label,
      status: config[c.key] as PunchComponentStatus,
      captured: !!captured[c.key as string],
      supported: true,
    }));
  });

  readonly monthHours = computed(() => {
    const m = this.month();
    return m ? m.totalHours.toFixed(1) : '—';
  });

  readonly monthAverage = computed(() => {
    const m = this.month();
    if (!m || !m.totalDaysWorked) return '—';
    return `${(m.totalHours / m.totalDaysWorked).toFixed(1)}h`;
  });

  readonly openRequests = computed(() => this.myRequests().filter(r => r.status === 'PENDING').length);

  /** This month's filed requests, against the allowance the policy grants. */
  readonly requestsThisMonth = computed(() => {
    const cursor = new Date();
    return this.myRequests().filter(r => {
      const d = new Date(r.date);
      return d.getFullYear() === cursor.getFullYear() && d.getMonth() === cursor.getMonth();
    }).length;
  });

  readonly monthLabel = computed(() =>
    this.monthCursor().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
  );

  /** Prevents paging the shift log into months that cannot have happened yet. */
  readonly atCurrentMonth = computed(() => {
    const now = new Date();
    const cursor = this.monthCursor();
    return cursor.getFullYear() === now.getFullYear() && cursor.getMonth() === now.getMonth();
  });

  // ---- Roster --------------------------------------------------------------

  readonly rosterDate = signal(isoDate());
  readonly roster = signal<AttendanceRecord[]>([]);
  readonly workforce = signal<Person[]>([]);
  readonly rosterLoading = signal(false);
  readonly rosterError = signal<string | null>(null);
  readonly rosterLoaded = signal(false);

  readonly rosterOnDuty = computed(() => this.roster().filter(r => !r.punchOutTime));
  readonly rosterClosed = computed(() => this.roster().filter(r => !!r.punchOutTime));

  /** Only people the API expects a punch from count towards attendance. */
  private readonly expectedToPunch = computed(() =>
    this.workforce().filter(p => p.status !== 'INACTIVE' && !NON_PUNCHING_ROLES.includes(p.role)),
  );

  readonly exceptions = computed<Exception[]>(() => {
    const punched = new Set(this.roster().map(r => r.userId));
    return this.expectedToPunch()
      .filter(p => !punched.has(p.id))
      .map(p => ({ person: p, reason: 'No punch recorded' }));
  });

  readonly rosterRate = computed(() => {
    const expected = this.expectedToPunch().length;
    if (!expected) return null;
    return percent(new Set(this.roster().map(r => r.userId)).size, expected);
  });

  readonly rosterIsToday = computed(() => this.rosterDate() === isoDate());

  /** Reads as "12 of 18 expected" rather than a bare percentage. */
  expectedCaption(): string {
    const expected = this.expectedToPunch().length;
    if (!expected) return 'Headcount unavailable';
    const punched = new Set(this.roster().map(r => r.userId)).size;
    return `${punched} of ${expected} expected`;
  }

  /** Open shifts on a past date are almost always a forgotten punch-out. */
  readonly unclosedShifts = computed(() => (this.rosterIsToday() ? [] : this.rosterOnDuty()));

  // ---- Detail & request overlays ------------------------------------------

  readonly viewing = signal<AttendanceRecord | null>(null);

  readonly requestOpen = signal(false);
  readonly requestSaving = signal(false);
  readonly form = signal<RequestForm>({
    date: isoDate(),
    punchIn: '09:30',
    punchOut: '18:30',
    includePunchIn: true,
    includePunchOut: true,
    odometerIn: '',
    odometerOut: '',
    reason: '',
  });

  /** The punch already on record for the date being corrected, if any. */
  readonly recordForRequest = computed(() => {
    const key = this.form().date;
    return this.history().find(r => isoDate(new Date(r.punchInTime)) === key) ?? null;
  });

  readonly requestKind = computed(() => (this.recordForRequest() ? 'Time correction' : 'Missed punch'));

  /** The oldest date the policy still accepts a correction for. */
  readonly earliestRequestDate = computed(() => {
    const days = this.regularizationRules().regularizationWindowDays;
    const d = new Date();
    d.setDate(d.getDate() - days);
    return isoDate(d);
  });

  /** Why the correction dialog cannot be submitted, if anything is missing. */
  readonly requestBlocker = computed<string | null>(() => {
    const rules = this.regularizationRules();
    if (!rules.allowRegularization) return 'Attendance regularisation is disabled by your policy.';
    const kind = this.requestKind();
    if (kind === 'Missed punch' && !rules.allowMissedPunch) {
      return 'Missed punch regularisation is disabled by your policy.';
    }
    if (kind === 'Time correction' && !rules.allowTimeCorrection) {
      return 'Time correction regularisation is disabled by your policy.';
    }
    const max = rules.maxRequestsPerMonth;
    if (max > 0 && this.requestsThisMonth() >= max) {
      return `Monthly limit reached (${max} requests allowed per month).`;
    }
    const chosen = this.form().date;
    if (chosen < this.earliestRequestDate()) {
      return `Requests can only be raised within ${rules.regularizationWindowDays} days of the shift.`;
    }
    return null;
  });

  constructor() {
    if (this.canSeeTeam() && !this.punchesOwnShift()) this.tab.set('roster');
    this.loadMine();
    this.loadMonth();
    if (this.tab() === 'roster') this.loadRoster();
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }

  // ---- Loading -------------------------------------------------------------

  setTab(value: string): void {
    this.tab.set(value as Tab);
    if (value === 'roster' && !this.rosterLoaded()) this.loadRoster();
  }

  loadMine(): void {
    this.mineLoading.set(true);
    forkJoin({
      policy: this.api.one<EffectivePolicy>(API.attendancePolicyEffective),
      active: this.api.one<AttendanceRecord>(API.attendanceActive),
      history: this.api.list<AttendanceRecord>(API.attendanceHistory),
      requests: this.api.list<Regularization>(API.regularization, { personal: 'true' }),
    }).subscribe(result => {
      this.policy.set(result.policy);
      this.ownShift.set(result.active);
      this.history.set(result.history);
      // Reviewers get their whole queue from this endpoint; this panel is only
      // ever about the viewer's own requests.
      const myId = this.me()?.id;
      this.myRequests.set(result.requests.filter(r => !myId || r.userId === myId));
      this.mineLoading.set(false);
    });
  }

  loadMonth(): void {
    const cursor = this.monthCursor();
    this.monthLoading.set(true);
    this.api
      .one<MonthSummary>(API.attendanceSummary, {
        mode: 'monthly',
        year: cursor.getFullYear(),
        month: cursor.getMonth() + 1,
      })
      .subscribe(summary => {
        this.month.set(summary);
        this.monthLoading.set(false);
      });
  }

  shiftMonth(step: number): void {
    if (step > 0 && this.atCurrentMonth()) return;
    const cursor = this.monthCursor();
    this.monthCursor.set(new Date(cursor.getFullYear(), cursor.getMonth() + step, 1));
    this.loadMonth();
  }

  loadRoster(): void {
    if (!this.canSeeTeam()) return;
    this.rosterLoading.set(true);
    this.rosterError.set(null);

    const url = this.canSeeCompany() ? API.attendanceCompany : API.attendanceTeam;

    forkJoin({
      records: this.api.get<AttendanceRecord[]>(url, { date: this.rosterDate() }),
      // Absence is the difference between who was expected and who punched, so
      // the roster needs the directory as well as the punches.
      people: this.workforce().length
        ? of(this.workforce())
        : this.api.list<Person>(API.workforce, { pageSize: 200, status: 'ACTIVE' }),
    }).subscribe({
      next: result => {
        this.roster.set(Array.isArray(result.records.data) ? result.records.data : []);
        this.workforce.set(result.people);
        this.rosterLoading.set(false);
        this.rosterLoaded.set(true);
      },
      error: err => {
        this.rosterError.set(apiError(err, 'Could not load the roster for this date.'));
        this.rosterLoading.set(false);
      },
    });
  }

  setRosterDate(value: string): void {
    if (!value) return;
    this.rosterDate.set(value);
    this.loadRoster();
  }

  stepRosterDate(days: number): void {
    const d = new Date(this.rosterDate());
    d.setDate(d.getDate() + days);
    if (isoDate(d) > isoDate()) return;
    this.setRosterDate(isoDate(d));
  }

  refresh(): void {
    this.loadMine();
    this.loadMonth();
    if (this.tab() === 'roster') this.loadRoster();
    this.pulse.refresh();
  }

  // ---- Evidence Modals & Handlers ------------------------------------------

  openEvidenceCapture(
    fieldKey: string,
    mode: 'CAMERA' | 'SIGNATURE' | 'UPLOAD' = 'CAMERA',
    title = 'Attach Evidence',
    subtitle = 'Capture or attach the required file'
  ): void {
    this.evidenceModalField.set(fieldKey);
    this.evidenceModalMode.set(mode);
    this.evidenceModalTitle.set(title);
    this.evidenceModalSubtitle.set(subtitle);
    this.evidenceModalOpen.set(true);
  }

  onEvidenceConfirmed(event: { publicUrl: string; fileKey: string; fieldKey: string }): void {
    this.capturedEvidence.update(curr => ({
      ...curr,
      [event.fieldKey]: event.publicUrl,
    }));
    this.evidenceModalOpen.set(false);
    this.toast.success('Evidence attached', `${titleCase(event.fieldKey)} has been securely uploaded.`);
  }

  removeEvidence(fieldKey: string): void {
    this.capturedEvidence.update(curr => {
      const next = { ...curr };
      delete next[fieldKey];
      return next;
    });
  }

  openLightbox(url: string): void {
    this.lightboxUrl.set(url);
  }

  closeLightbox(): void {
    this.lightboxUrl.set(null);
  }

  // ---- Punching ------------------------------------------------------------

  async punch(): Promise<void> {
    const out = !!this.ownShift();
    const config = this.activeConfig();

    const missing = this.missingRequiredEvidence();
    if (missing.length > 0) {
      const next = missing[0];
      this.openEvidenceCapture(next.key as string, next.mode, `Attach ${next.label}`, `Your attendance policy requires ${next.label}`);
      return;
    }

    if (out) {
      const ok = await this.confirm.ask({
        title: 'End your shift?',
        body: 'Your punch-out time and location are recorded now. Changing it afterwards needs an approved correction request.',
        confirmLabel: 'Punch out',
        facts: [
          { label: 'Started', value: clock(this.ownShift()!.punchInTime) },
          { label: 'Elapsed', value: duration(this.ownShift()!.punchInTime) },
        ],
      });
      if (!ok) return;
    }

    this.punching.set(true);
    this.punchError.set(null);

    let coords: GeolocationCoordinates | null = null;
    try {
      coords = await this.currentPosition();
    } catch (err) {
      // Location is only fatal when the policy insists on it.
      if (config.gps === 'REQUIRED') {
        this.punching.set(false);
        this.punchError.set((err as Error).message);
        return;
      }
    }

    const payload = {
      latitude: coords?.latitude ?? 0,
      longitude: coords?.longitude ?? 0,
      evidence: this.buildEvidence(config, coords),
    };

    this.api.post<AttendanceRecord>(out ? API.punchOut : API.punchIn, payload).subscribe({
      next: res => {
        this.punching.set(false);
        this.ownShift.set(out ? null : (res.data ?? null));
        this.remarks.set('');
        this.odometer.set('');
        this.customValues.set({});
        this.capturedEvidence.set({});
        this.toast.success(
          out ? 'Shift closed' : 'Shift started',
          out ? 'Your hours for today have been recorded.' : `Punched in at ${clock(new Date())}.`,
        );
        this.loadMine();
        this.loadMonth();
        this.pulse.refresh();
      },
      error: err => {
        this.punching.set(false);
        const message = apiError(err);
        this.punchError.set(message);
        this.toast.error(out ? 'Could not punch out' : 'Could not punch in', message);
      },
    });
  }

  private buildEvidence(config: PunchConfig, coords: GeolocationCoordinates | null): Record<string, unknown> {
    const evidence: Record<string, unknown> = {
      platform: 'WebPortal',
      model: 'Browser client',
      osVersion: navigator.userAgent,
      ...this.capturedEvidence(),
    };
    if (coords) evidence['accuracy'] = Math.round(coords.accuracy);
    if (config.remarks !== 'DISABLED' && this.remarks().trim()) evidence['remarks'] = this.remarks().trim();
    if (config.vehicleMeter !== 'DISABLED' && this.odometer().trim()) {
      evidence['vehicleMeter'] = Number(this.odometer());
    }
    for (const field of config.customFields ?? []) {
      const value = this.customValues()[field.key];
      if (value === undefined || value === '') continue;
      evidence[field.key] = field.type === 'NUMBER' ? Number(value) : value;
    }
    return evidence;
  }

  setCustom(key: string, value: string): void {
    this.customValues.update(current => ({ ...current, [key]: value }));
  }

  private currentPosition(): Promise<GeolocationCoordinates> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('This browser cannot report your location. Punch from the mobile app instead.'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        position => resolve(position.coords),
        error => {
          switch (error.code) {
            case error.PERMISSION_DENIED:
              reject(new Error('Location permission was denied. Allow location for this site and try again.'));
              break;
            case error.POSITION_UNAVAILABLE:
              reject(new Error('Your location is unavailable right now. Check your device settings.'));
              break;
            case error.TIMEOUT:
              reject(new Error('Finding your location took too long. Try again.'));
              break;
            default:
              reject(new Error('Your location could not be read.'));
          }
        },
        { timeout: 10_000, maximumAge: 30_000, enableHighAccuracy: true },
      );
    });
  }

  // ---- Correction requests -------------------------------------------------

  openRequest(day?: MonthDay): void {
    const record = day?.records?.[0];
    this.form.set({
      date: day?.date ?? isoDate(),
      punchIn: record ? timeInput(record.punchInTime) : '09:30',
      punchOut: record?.punchOutTime ? timeInput(record.punchOutTime) : '18:30',
      includePunchIn: true,
      includePunchOut: true,
      odometerIn: '',
      odometerOut: '',
      reason: '',
    });
    this.requestOpen.set(true);
  }

  patchForm(patch: Partial<RequestForm>): void {
    this.form.update(current => ({ ...current, ...patch }));
  }

  async closeRequest(): Promise<void> {
    if (this.form().reason.trim()) {
      const discard = await this.confirm.ask({
        title: 'Discard this request?',
        body: 'The reason you have written will not be kept.',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
        tone: 'danger',
      });
      if (!discard) return;
    }
    this.requestOpen.set(false);
  }

  submitRequest(): void {
    const value = this.form();
    const blocker = this.requestBlocker();
    if (blocker) {
      this.toast.warning('This request cannot be raised', blocker);
      return;
    }
    if (!value.reason.trim()) {
      this.toast.warning('A reason is required', 'Say what happened, so whoever reviews it can decide quickly.');
      return;
    }
    if (!value.includePunchIn && !this.recordForRequest()) {
      this.toast.warning('A punch-in time is required', 'There is no punch on record for that day to correct.');
      return;
    }

    const punchIn = value.includePunchIn ? instant(value.date, value.punchIn) : null;
    const punchOut = value.includePunchOut ? instant(value.date, value.punchOut) : null;
    if (punchIn && punchOut && new Date(punchOut) <= new Date(punchIn)) {
      this.toast.warning('Check the times', 'The punch-out has to be later than the punch-in.');
      return;
    }

    this.requestSaving.set(true);
    this.api
      .post(API.regularization, {
        date: value.date,
        requestedPunchIn: punchIn,
        requestedPunchOut: punchOut,
        requestedPunchInOdometer: value.odometerIn ? Number(value.odometerIn) : null,
        requestedPunchOutOdometer: value.odometerOut ? Number(value.odometerOut) : null,
        reason: value.reason.trim(),
      })
      .subscribe({
        next: () => {
          this.requestSaving.set(false);
          this.requestOpen.set(false);
          this.toast.success(
            'Correction requested',
            `Your request for ${dayLabel(value.date)} is now waiting for approval.`,
          );
          this.loadMine();
          this.pulse.refresh();
        },
        error: err => {
          this.requestSaving.set(false);
          this.toast.error('Could not raise the request', apiError(err));
        },
      });
  }

  // ---- Presentation --------------------------------------------------------

  view(record: AttendanceRecord): void {
    this.viewing.set(record);
    this.inAddress.set(null);
    this.outAddress.set(null);

    const inLat = record.punchInLatitude;
    const inLng = record.punchInLongitude;
    if (inLat && inLng && Number(inLat) !== 0 && Number(inLng) !== 0) {
      this.addressLoading.set(true);
      fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${inLat}&lon=${inLng}`, {
        headers: { 'User-Agent': 'NetroTrackWeb/1.0' },
      })
        .then(r => r.json())
        .then(data => this.inAddress.set(data.display_name || `${inLat}, ${inLng}`))
        .catch(() => this.inAddress.set(`${inLat}, ${inLng}`))
        .finally(() => this.addressLoading.set(false));
    }

    const outLat = record.punchOutLatitude;
    const outLng = record.punchOutLongitude;
    if (outLat && outLng && Number(outLat) !== 0 && Number(outLng) !== 0) {
      fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${outLat}&lon=${outLng}`, {
        headers: { 'User-Agent': 'NetroTrackWeb/1.0' },
      })
        .then(r => r.json())
        .then(data => this.outAddress.set(data.display_name || `${outLat}, ${outLng}`))
        .catch(() => this.outAddress.set(`${outLat}, ${outLng}`));
    }
  }

  closeView(): void {
    this.viewing.set(null);
  }

  readonly today = longDate();
  /** No attendance can be claimed for a day that has not happened. */
  readonly maxRequestDate = isoDate();

  time(value: string | null | undefined): string {
    return clock(value);
  }

  day(value: string | Date | null | undefined): string {
    return dayLabel(value);
  }

  ago(value: string): string {
    return relativeTime(value);
  }

  span(record: AttendanceRecord): string {
    return duration(record.punchInTime, record.punchOutTime);
  }

  hours(value: number | string | null | undefined): string {
    const n = Number(value ?? 0);
    if (!Number.isFinite(n) || n === 0) return '—';
    return `${n.toFixed(2)}h`;
  }

  stateOf(record: AttendanceRecord): { label: string; tone: Tone } {
    return record.punchOutTime ? { label: 'Shift closed', tone: 'neutral' } : { label: 'On duty', tone: 'ok' };
  }

  statusTone(status: RegularizationStatus): Tone {
    return status === 'APPROVED' ? 'ok' : status === 'REJECTED' ? 'risk' : 'warn';
  }

  geofenceOf(record: AttendanceRecord): { label: string; tone: Tone } | null {
    if (record.geofenceDistance == null) return null;
    const metres = Math.round(record.geofenceDistance);
    return record.isGeofenceValid
      ? { label: `At branch · ${metres} m`, tone: 'ok' }
      : { label: `${metres} m from branch`, tone: 'warn' };
  }

  /** Evidence as readable rows; URLs become links, noise stays out. */
  evidenceRows(payload: Record<string, unknown> | null | undefined): EvidenceRow[] {
    if (!payload) return [];
    const rows: EvidenceRow[] = [];
    for (const [key, raw] of Object.entries(payload)) {
      if (raw === null || raw === undefined || raw === '') continue;
      if (key === 'osVersion' || key === 'platform' || key === 'model') continue;
      const value = typeof raw === 'object' ? JSON.stringify(raw) : String(raw);
      rows.push({
        label: titleCase(key),
        value,
        link: /^https?:\/\//.test(value) ? value : null,
      });
    }
    return rows;
  }

  maps(lat: number | null | undefined, lng: number | null | undefined): string | null {
    return mapsLink(lat, lng);
  }

  personLabel(record: AttendanceRecord): string {
    return record.user?.name ?? 'Unknown';
  }
}

function requiredEvidenceKey(config: PunchConfig): string {
  return PUNCH_COMPONENTS.filter(c => config[c.key] === 'REQUIRED')
    .map(c => c.key)
    .join(',');
}

/** `HH:MM` for a time input, in the viewer's own timezone. */
function timeInput(value: string | Date): string {
  const d = new Date(value);
  if (!Number.isFinite(d.getTime())) return '09:30';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Combines a date and a wall-clock time into an instant the API can store. */
function instant(date: string, time: string): string | null {
  if (!date || !time) return null;
  const d = new Date(`${date}T${time}`);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}
