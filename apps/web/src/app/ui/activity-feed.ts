import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NetroIcon, IconName } from './icon';
import { NetroAvatar } from './primitives';
import { relativeTime } from '../core/utils/format';
import { Inspection, Sale, Visit } from '../core/models/domain';
import { currency } from '../core/utils/format';

export interface ActivityEntry {
  id: string;
  at: string;
  actor: string;
  actorId?: string;
  icon: IconName;
  kind: 'visit' | 'order' | 'inspection';
  /** The headline: what happened, in the user's words where possible. */
  headline: string;
  detail?: string | null;
  route?: string;
}

/**
 * One chronological stream of field activity.
 *
 * Visits, orders and inspections are separate tables but the same question for
 * an operator — "what did my people just do?" — so they are merged, sorted and
 * shown together rather than as three parallel lists.
 */
@Component({
  selector: 'netro-activity-feed',
  standalone: true,
  imports: [NgIf, NgFor, NgClass, RouterLink, NetroIcon, NetroAvatar],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="feed" *ngIf="entries().length; else quiet">
      <li class="feed__item" *ngFor="let entry of entries()">
        <netro-avatar [name]="entry.actor" [seed]="entry.actorId || entry.actor" size="xs" />
        <div class="feed__body">
          <p class="feed__line">
            <span class="feed__actor">{{ entry.actor }}</span>
            <span class="feed__headline">{{ entry.headline }}</span>
          </p>
          <p class="feed__detail" *ngIf="entry.detail">{{ entry.detail }}</p>
        </div>
        <span class="feed__kind" [ngClass]="'feed__kind--' + entry.kind" [attr.title]="kindLabel(entry.kind)">
          <netro-icon [name]="entry.icon" [size]="12" />
        </span>
        <time class="feed__when" [attr.datetime]="entry.at">{{ ago(entry.at) }}</time>
      </li>
    </ol>

    <ng-template #quiet>
      <p class="feed__quiet">{{ emptyText() }}</p>
    </ng-template>
  `,
  styles: [
    `
      :host { display: block; }
      .feed { display: flex; flex-direction: column; list-style: none; }
      .feed__item {
        display: flex;
        align-items: flex-start;
        gap: var(--s-3);
        padding: 9px 0;
        border-bottom: 1px solid var(--line-subtle);
        min-width: 0;
      }
      .feed__item:last-child { border-bottom: none; }
      .feed__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
      .feed__line { font: var(--t-body); color: var(--fg-muted); }
      .feed__actor { font-weight: 500; color: var(--fg); margin-right: 4px; }
      .feed__detail {
        font: var(--t-small);
        color: var(--fg-subtle);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .feed__kind {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        flex: none;
        border-radius: var(--r-sm);
        background: var(--surface-inset);
        color: var(--fg-faint);
        border: 1px solid var(--line-subtle);
      }
      .feed__kind--order { background: var(--ok-bg); border-color: var(--ok-border); color: var(--ok-fg); }
      .feed__kind--visit { background: var(--accent-soft); border-color: var(--accent-line); color: var(--accent); }
      .feed__when { font: var(--t-micro); color: var(--fg-faint); flex: none; white-space: nowrap; padding-top: 3px; }
      .feed__quiet { font: var(--t-small); color: var(--fg-subtle); padding: var(--s-6) 0; text-align: center; }
    `,
  ],
})
export class NetroActivityFeed {
  readonly entries = input.required<ActivityEntry[]>();
  readonly emptyText = input('No field activity recorded yet today.');

  ago(at: string): string {
    return relativeTime(at);
  }

  kindLabel(kind: ActivityEntry['kind']): string {
    return kind === 'order' ? 'Sales order' : kind === 'visit' ? 'Customer visit' : 'Site inspection';
  }
}

/* ---- Builders -------------------------------------------------------------
   Kept beside the component so every screen that shows activity describes the
   same event the same way. -------------------------------------------------- */

export function activityFrom(
  visits: Visit[] = [],
  sales: Sale[] = [],
  inspections: Inspection[] = [],
): ActivityEntry[] {
  const entries: ActivityEntry[] = [
    ...visits.map<ActivityEntry>(v => ({
      id: `visit:${v.id}`,
      at: v.checkInTime ?? v.createdAt ?? '',
      actor: v.user?.name ?? 'A field user',
      actorId: v.userId,
      icon: 'pin',
      kind: 'visit',
      headline: `visited ${v.customer?.name ?? 'a customer'}`,
      detail: v.notes || v.purpose || null,
      route: '/visits',
    })),
    ...sales.map<ActivityEntry>(s => ({
      id: `order:${s.id}`,
      at: s.createdAt,
      actor: s.user?.name ?? 'A field user',
      actorId: s.userId,
      icon: 'orders',
      kind: 'order',
      headline: `booked ${currency(s.totalAmount)} with ${s.customer?.name ?? 'a customer'}`,
      detail: s.items?.length ? `${s.items.length} line item${s.items.length === 1 ? '' : 's'}` : null,
      route: '/orders',
    })),
    ...inspections.map<ActivityEntry>(i => ({
      id: `inspection:${i.id}`,
      at: i.createdAt,
      actor: i.user?.name ?? 'A field user',
      actorId: i.userId,
      icon: 'inspect',
      kind: 'inspection',
      headline: `inspected ${i.siteName}`,
      detail: i.observations || null,
      route: '/inspections',
    })),
  ];

  return entries
    .filter(e => !!e.at)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}
