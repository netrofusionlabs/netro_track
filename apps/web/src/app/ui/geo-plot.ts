import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { NetroIcon } from './icon';
import { haversineKm } from '../core/utils/format';

export interface GeoMarker {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  /** Drives the marker's colour, using the same status language as everywhere else. */
  state: 'active' | 'stale' | 'idle' | 'focus';
  detail?: string | null;
}

export interface GeoTrack {
  id: string;
  points: Array<{ latitude: number; longitude: number }>;
}

interface PlottedMarker extends GeoMarker {
  x: number;
  y: number;
}

const PADDING = 6;

/**
 * A true-to-coordinate position plot.
 *
 * NetroTrack does not ship a base map in the web portal — a rendered street map
 * would need a keyed third-party SDK, and a decorative one would be a lie. What
 * this does instead is honest and still operationally useful: it places real
 * latitude and longitude on an equirectangular projection, correctly scaled and
 * with a distance scale bar, so relative position, clustering and spread are
 * accurate. Every marker links out to the real map for the street view.
 */
@Component({
  selector: 'netro-geo-plot',
  standalone: true,
  imports: [NgFor, NgIf, NgClass, NetroIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="plot" [class.plot--empty]="!plotted().length">
      @if (!plotted().length) {
        <div class="plot__empty">
          <netro-icon name="pin" [size]="20" />
          <p>{{ emptyLabel() }}</p>
        </div>
      } @else {
        <svg
          class="plot__canvas"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="img"
          [attr.aria-label]="summary()"
        >
          <defs>
            <pattern id="netro-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" stroke-width="0.15" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#netro-grid)" class="plot__grid" />

          <polyline
            *ngFor="let track of tracks()"
            class="plot__track"
            [attr.points]="pathFor(track)"
            vector-effect="non-scaling-stroke"
          />
        </svg>

        <button
          *ngFor="let marker of plotted(); trackBy: trackById"
          type="button"
          class="pin"
          [ngClass]="'pin--' + marker.state"
          [style.left.%]="marker.x"
          [style.top.%]="marker.y"
          [attr.aria-label]="marker.label + (marker.detail ? ', ' + marker.detail : '')"
          [attr.title]="marker.label + (marker.detail ? ' · ' + marker.detail : '')"
          (click)="selected.emit(marker.id)"
        >
          <span class="pin__dot"></span>
          <span class="pin__label">{{ marker.label }}</span>
        </button>

        <div class="plot__scale" [attr.aria-hidden]="true">
          <span class="plot__scale-bar"></span>
          <span class="plot__scale-text">{{ scaleLabel() }}</span>
        </div>

        <p class="plot__note">
          Positions plotted to scale from recorded coordinates. Open a person to see their route on a map.
        </p>
      }
    </div>
  `,
  styleUrl: './geo-plot.css',
})
export class NetroGeoPlot {
  readonly markers = input<GeoMarker[]>([]);
  readonly tracks = input<GeoTrack[]>([]);
  readonly emptyLabel = input('No recorded positions to plot.');

  readonly selected = output<string>();

  /**
   * Bounds across markers and tracks together, squared off so the projection
   * keeps its aspect ratio instead of stretching a tight cluster across the box.
   */
  private readonly bounds = computed(() => {
    const lats: number[] = [];
    const lngs: number[] = [];
    for (const m of this.markers()) {
      lats.push(m.latitude);
      lngs.push(m.longitude);
    }
    for (const t of this.tracks()) {
      for (const p of t.points) {
        lats.push(p.latitude);
        lngs.push(p.longitude);
      }
    }
    if (!lats.length) return null;

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    // A single point, or points on one line, still needs a box to sit inside.
    const midLat = (minLat + maxLat) / 2;
    const midLng = (minLng + maxLng) / 2;
    // Longitude degrees shrink towards the poles; correct so distances are honest.
    const lngScale = Math.max(0.15, Math.cos((midLat * Math.PI) / 180));
    const span = Math.max((maxLat - minLat), (maxLng - minLng) * lngScale, 0.004);
    const half = span / 2;

    return {
      minLat: midLat - half,
      maxLat: midLat + half,
      minLng: midLng - half / lngScale,
      maxLng: midLng + half / lngScale,
      spanKm: haversineKm(
        { latitude: midLat - half, longitude: midLng },
        { latitude: midLat + half, longitude: midLng },
      ),
    };
  });

  readonly plotted = computed<PlottedMarker[]>(() => {
    const box = this.bounds();
    if (!box) return [];
    return this.markers().map(m => ({ ...m, ...this.project(m.latitude, m.longitude) }));
  });

  readonly summary = computed(() => {
    const count = this.markers().length;
    if (!count) return 'No positions';
    return `Position plot showing ${count} ${count === 1 ? 'person' : 'people'}`;
  });

  /** The scale bar is a quarter of the box, labelled with its real distance. */
  readonly scaleLabel = computed(() => {
    const box = this.bounds();
    if (!box) return '';
    const km = box.spanKm / 4;
    if (km < 1) return `${Math.round(km * 1000)} m`;
    return `${km < 10 ? km.toFixed(1) : Math.round(km)} km`;
  });

  pathFor(track: GeoTrack): string {
    return track.points
      .map(p => {
        const { x, y } = this.project(p.latitude, p.longitude);
        return `${x},${y}`;
      })
      .join(' ');
  }

  trackById(_index: number, marker: PlottedMarker): string {
    return marker.id;
  }

  private project(lat: number, lng: number): { x: number; y: number } {
    const box = this.bounds();
    if (!box) return { x: 50, y: 50 };
    const usable = 100 - PADDING * 2;
    const x = PADDING + ((lng - box.minLng) / (box.maxLng - box.minLng)) * usable;
    // Latitude increases northwards, screen y increases downwards.
    const y = PADDING + ((box.maxLat - lat) / (box.maxLat - box.minLat)) * usable;
    return { x: clamp(x), y: clamp(y) };
  }
}

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.max(PADDING / 2, Math.min(100 - PADDING / 2, value));
}
