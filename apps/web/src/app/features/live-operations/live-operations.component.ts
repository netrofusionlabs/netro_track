import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { forkJoin } from 'rxjs';

import { ApiService, apiError } from '../../core/services/api.service';
import { PulseService } from '../../core/services/pulse.service';
import { AttendanceRecord, Inspection, LivePosition, RouteMetadata, Sale, Visit } from '../../core/models/domain';
import { clock, coord, duration, haversineKm, isoDate, mapsLink, relativeTime } from '../../core/utils/format';

import { NetroIcon } from '../../ui/icon';
import { NetroAvatar, NetroBadge, NetroSkeleton, NetroState, NetroStatus, Tone } from '../../ui/primitives';
import { NetroPageHeader, NetroPanel, NetroMetric, NetroSegmented } from '../../ui/patterns';
import { NetroDrawer } from '../../ui/overlays';
import { GeoMarker, GeoTrack, NetroGeoPlot } from '../../ui/geo-plot';
import { ActivityEntry, NetroActivityFeed, activityFrom } from '../../ui/activity-feed';

/** How often the board pulls fresh positions while it is on screen. */
const REFRESH_MS = 60_000;

/** Fifteen minutes without a fix is the server's own definition of stale. */
type Presence = 'moving' | 'stale' | 'off-shift';

interface BoardRow {
  position: LivePosition | null;
  shift: AttendanceRecord | null;
  userId: string;
  name: string;
  presence: Presence;
  /** Distance from their punch-in point, which is what "have they moved" means. */
  fromPunchKm: number | null;
  lastSeen: string | null;
}

const PRESENCE_LABEL: Record<Presence, string> = {
  moving: 'Reporting position',
  stale: 'No recent fix',
  'off-shift': 'Not on shift',
};

const PRESENCE_TONE: Record<Presence, Tone> = {
  moving: 'ok',
  stale: 'warn',
  'off-shift': 'neutral',
};

/**
 * The field command board.
 *
 * The map answers "where", but on its own it never answers "so what". This
 * pairs position with the shift that explains it, the activity that came out of
 * it, and the exceptions worth acting on — people on shift whose device has
 * gone quiet, and people reporting position who never punched in.
 */
@Component({
  selector: 'app-live-operations',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgClass,
    NetroIcon,
    NetroPageHeader,
    NetroPanel,
    NetroMetric,
    NetroSegmented,
    NetroGeoPlot,
    NetroActivityFeed,
    NetroAvatar,
    NetroBadge,
    NetroStatus,
    NetroState,
    NetroSkeleton,
    NetroDrawer,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './live-operations.component.html',
  styleUrl: './live-operations.component.css',
})
export class LiveOperationsComponent {
  private readonly api = inject(ApiService);
  private readonly pulse = inject(PulseService);

  readonly positions = signal<LivePosition[]>([]);
  readonly visits = signal<Visit[]>([]);
  readonly sales = signal<Sale[]>([]);
  readonly inspections = signal<Inspection[]>([]);

  readonly loading = signal(true);
  readonly refreshing = signal(false);
  readonly error = signal<string | null>(null);
  readonly lastRefresh = signal<Date | null>(null);

  readonly filter = signal<'all' | 'moving' | 'stale' | 'off-shift'>('all');
  readonly focused = signal<string | null>(null);

  /** Route playback for the person open in the drawer. */
  readonly route = signal<RouteMetadata | null>(null);
  readonly routeLoading = signal(false);

  readonly filters = [
    { value: 'all', label: 'Everyone' },
    { value: 'moving', label: 'Reporting' },
    { value: 'stale', label: 'Gone quiet' },
    { value: 'off-shift', label: 'Off shift' },
  ];

  constructor() {
    this.load();

    const timer = window.setInterval(() => this.load(true), REFRESH_MS);
    inject(DestroyRef).onDestroy(() => window.clearInterval(timer));
  }

  // ---- Data ---------------------------------------------------------------

  load(silent = false): void {
    if (silent) this.refreshing.set(true);
    else this.loading.set(true);
    this.error.set(null);

    forkJoin({
      positions: this.api.get<LivePosition[]>('/tracking/live'),
      visits: this.api.list<Visit>('/customer-visits/today'),
      sales: this.api.list<Sale>('/product-sales/today'),
      inspections: this.api.list<Inspection>('/inspections/today'),
    }).subscribe({
      next: ({ positions, visits, sales, inspections }) => {
        this.positions.set(Array.isArray(positions.data) ? positions.data : []);
        this.visits.set(visits);
        this.sales.set(sales);
        this.inspections.set(inspections);
        this.lastRefresh.set(new Date());
        this.loading.set(false);
        this.refreshing.set(false);
      },
      error: err => {
        this.error.set(apiError(err, 'Could not load live positions.'));
        this.loading.set(false);
        this.refreshing.set(false);
      },
    });

    this.pulse.refresh();
  }

  // ---- Derived board ------------------------------------------------------

  private readonly shiftByUser = computed(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const record of this.pulse.state().roster) map.set(record.userId, record);
    return map;
  });

  /**
   * One row per person who is either on shift or reporting a position. Merging
   * the two sources is the point: each one alone hides a different problem.
   */
  readonly rows = computed<BoardRow[]>(() => {
    const byUser = new Map<string, BoardRow>();

    for (const shift of this.pulse.state().roster) {
      if (shift.punchOutTime) continue;
      byUser.set(shift.userId, {
        userId: shift.userId,
        name: shift.user?.name ?? 'Unknown',
        position: null,
        shift,
        presence: 'stale',
        fromPunchKm: null,
        lastSeen: null,
      });
    }

    for (const position of this.positions()) {
      const existing = byUser.get(position.userId);
      const shift = existing?.shift ?? this.shiftByUser().get(position.userId) ?? null;
      const onShift = !!shift && !shift.punchOutTime;

      byUser.set(position.userId, {
        userId: position.userId,
        name: position.userName || existing?.name || 'Unknown',
        position,
        shift,
        presence: !onShift ? 'off-shift' : position.isStale ? 'stale' : 'moving',
        fromPunchKm: distanceFromPunch(position, shift),
        lastSeen: position.recordedAt,
      });
    }

    return [...byUser.values()].sort((a, b) => {
      const order: Presence[] = ['moving', 'stale', 'off-shift'];
      const byPresence = order.indexOf(a.presence) - order.indexOf(b.presence);
      return byPresence !== 0 ? byPresence : a.name.localeCompare(b.name);
    });
  });

  readonly visible = computed(() => {
    const filter = this.filter();
    return filter === 'all' ? this.rows() : this.rows().filter(r => r.presence === filter);
  });

  readonly counts = computed(() => ({
    moving: this.rows().filter(r => r.presence === 'moving').length,
    stale: this.rows().filter(r => r.presence === 'stale').length,
    offShift: this.rows().filter(r => r.presence === 'off-shift').length,
  }));

  /** Someone on shift whose device has stopped reporting needs a phone call. */
  readonly quiet = computed(() => this.rows().filter(r => r.presence === 'stale'));

  readonly markers = computed<GeoMarker[]>(() =>
    this.visible()
      .filter(row => !!row.position)
      .map(row => ({
        id: row.userId,
        label: row.name,
        latitude: row.position!.latitude,
        longitude: row.position!.longitude,
        state:
          this.focused() === row.userId
            ? 'focus'
            : row.presence === 'moving'
              ? 'active'
              : row.presence === 'stale'
                ? 'stale'
                : 'idle',
        detail: `${PRESENCE_LABEL[row.presence]} · ${relativeTime(row.position!.recordedAt)}`,
      })),
  );

  readonly tracks = computed<GeoTrack[]>(() => {
    const points = this.route()?.points;
    const focused = this.focused();
    if (!focused || !points?.length) return [];
    return [
      {
        id: focused,
        points: points.map(p => ({ latitude: Number(p.latitude), longitude: Number(p.longitude) })),
      },
    ];
  });

  readonly activity = computed<ActivityEntry[]>(() =>
    activityFrom(this.visits(), this.sales(), this.inspections()).slice(0, 12),
  );

  readonly focusedRow = computed(() => this.rows().find(r => r.userId === this.focused()) ?? null);

  readonly plotEmpty = computed(() =>
    this.rows().length
      ? 'Nobody in this view is reporting a position right now.'
      : 'No positions recorded yet today.',
  );

  // ---- Interaction --------------------------------------------------------

  setFilter(value: string): void {
    this.filter.set(value as 'all' | 'moving' | 'stale' | 'off-shift');
  }

  focus(userId: string): void {
    this.focused.set(userId);
    this.route.set(null);
    this.routeLoading.set(true);
    this.api
      .one<RouteMetadata>('/tracking/route', { userId, date: isoDate() })
      .subscribe(data => {
        this.route.set(data);
        this.routeLoading.set(false);
      });
  }

  clearFocus(): void {
    this.focused.set(null);
    this.route.set(null);
  }

  // ---- Presentation -------------------------------------------------------

  presenceLabel(row: BoardRow): string {
    return PRESENCE_LABEL[row.presence];
  }

  presenceTone(row: BoardRow): Tone {
    return PRESENCE_TONE[row.presence];
  }

  /** Explains *why* the state is what it is, which is what an operator needs. */
  presenceDetail(row: BoardRow): string {
    if (row.presence === 'off-shift') {
      return row.position ? `Last fix ${relativeTime(row.position.recordedAt)}, no open shift` : 'No open shift';
    }
    if (!row.position) return 'On shift, no position received';
    if (row.presence === 'stale') return `Last fix ${relativeTime(row.position.recordedAt)}`;
    return `Updated ${relativeTime(row.position.recordedAt)}`;
  }

  shiftSummary(row: BoardRow): string | null {
    if (!row.shift) return null;
    return `On duty since ${clock(row.shift.punchInTime)} · ${duration(row.shift.punchInTime)}`;
  }

  battery(row: BoardRow): number | null {
    return row.position?.batteryLevel ?? null;
  }

  batteryTone(level: number | null): Tone {
    if (level === null) return 'neutral';
    if (level <= 15) return 'risk';
    if (level <= 30) return 'warn';
    return 'neutral';
  }

  distance(row: BoardRow): string | null {
    if (row.fromPunchKm === null) return null;
    if (row.fromPunchKm < 0.1) return 'At punch-in point';
    return `${row.fromPunchKm.toFixed(row.fromPunchKm < 10 ? 1 : 0)} km from punch-in`;
  }

  mapUrl(row: BoardRow): string | null {
    return row.position ? mapsLink(row.position.latitude, row.position.longitude) : null;
  }

  coords(row: BoardRow): string {
    if (!row.position) return '—';
    return `${coord(row.position.latitude)}, ${coord(row.position.longitude)}`;
  }

  accuracy(row: BoardRow): string {
    const value = row.position?.accuracy;
    return value == null ? 'Unknown' : `±${Math.round(value)} m`;
  }

  routeDistance(): string {
    const meters = this.route()?.totalDistanceMeters ?? 0;
    if (!meters) return '0 km';
    return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
  }

  routeWindow(): string {
    const data = this.route();
    if (!data?.startTime || !data.endTime) return '—';
    return `${clock(data.startTime)} – ${clock(data.endTime)}`;
  }

  refreshedAt(): string {
    const at = this.lastRefresh();
    return at ? clock(at) : '—';
  }

  ago(value: string | null | undefined): string {
    return relativeTime(value);
  }
}

/** How far someone has travelled from where they started their shift. */
function distanceFromPunch(position: LivePosition, shift: AttendanceRecord | null): number | null {
  if (!shift?.punchInLatitude || !shift.punchInLongitude) return null;
  return haversineKm(
    { latitude: shift.punchInLatitude, longitude: shift.punchInLongitude },
    { latitude: position.latitude, longitude: position.longitude },
  );
}
