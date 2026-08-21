import { ChangeDetectionStrategy, Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';

import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { NavigationService, NavItem } from '../../core/services/navigation.service';
import { ThemeService } from '../../core/services/theme.service';
import { PulseService } from '../../core/services/pulse.service';
import { ROLE_SHORT, Role, roleLabel } from '../../core/models/roles';
import { greeting, relativeTime } from '../../core/utils/format';

import { NetroIcon } from '../../ui/icon';
import { NetroAvatar, NetroSkeleton, NetroStatus } from '../../ui/primitives';
import { NetroToastHost, NetroConfirmHost } from '../../ui/overlays';
import { CommandPaletteComponent } from './command-palette.component';
import { NetroBrandmark } from './brandmark.component';

/**
 * The NetroTrack application shell.
 *
 * A persistent operating frame: identity and tenant at top-left, the full
 * information architecture down the left rail, live operational state in the
 * header, and the working surface filling everything else. The frame never
 * moves between routes, so navigating never costs the user their bearings.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    NgIf,
    NgClass,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    NetroIcon,
    NetroAvatar,
    NetroStatus,
    NetroSkeleton,
    NetroToastHost,
    NetroConfirmHost,
    CommandPaletteComponent,
    NetroBrandmark,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.css',
})
export class ShellComponent {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  readonly api = inject(ApiService);
  readonly nav = inject(NavigationService);
  readonly theme = inject(ThemeService);
  readonly pulse = inject(PulseService);

  readonly railCollapsed = signal(readCollapsed());
  readonly mobileNavOpen = signal(false);
  readonly paletteOpen = signal(false);
  readonly accountOpen = signal(false);

  readonly user = this.api.user;
  readonly greeting = computed(() => greeting());

  readonly roleLabel = computed(() => roleLabel(this.user()?.role));
  readonly roleShort = computed(() => {
    const role = this.user()?.role as Role | undefined;
    return role ? ROLE_SHORT[role] : '';
  });

  readonly tenantName = computed(() => this.api.companyName() ?? 'NetroTrack Platform');
  readonly companyLogoUrl = this.api.companyLogoUrl;

  /** The nav entry matching the current URL, used for the mobile header title. */
  readonly currentItem = signal<NavItem | null>(null);

  readonly syncedLabel = computed(() => {
    if (this.pulse.offline()) return 'Live data unavailable — showing the last known state';
    const at = this.pulse.lastSyncedAt();
    return at ? `Updated ${relativeTime(at)}` : 'Connecting…';
  });

  constructor() {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.mobileNavOpen.set(false);
      this.accountOpen.set(false);
      this.syncCurrentItem();
    });
    this.syncCurrentItem();

    effect(() => localStorage.setItem('netro.rail', this.railCollapsed() ? 'collapsed' : 'expanded'));
  }

  onDisabledClick(item: NavItem): void {
    this.toast.info(
      `${item.label} — Coming Soon`,
      'This feature is currently in active development and will be released in an upcoming update.',
    );
  }

  private syncCurrentItem(): void {
    const url = this.router.url.split('?')[0];
    const match = this.nav.items().find(i => url === i.route || url.startsWith(i.route + '/'));
    this.currentItem.set(match ?? null);
  }

  badgeFor(item: NavItem): number | null {
    if (item.badge !== 'approvals') return null;
    const count = this.pulse.pendingApprovals();
    return count > 0 ? count : null;
  }

  toggleRail(): void {
    this.railCollapsed.update(v => !v);
  }

  signOut(): void {
    this.api.logout();
    this.router.navigateByUrl('/login');
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const inField = isTypingTarget(event.target);

    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.paletteOpen.set(true);
      return;
    }
    // Bare "/" is the search convention in operations tools, but only when the
    // user is not already typing into something.
    if (event.key === '/' && !inField && !this.paletteOpen()) {
      event.preventDefault();
      this.paletteOpen.set(true);
      return;
    }
    if (event.key === 'Escape') {
      this.accountOpen.set(false);
      this.mobileNavOpen.set(false);
    }
  }
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

function readCollapsed(): boolean {
  return localStorage.getItem('netro.rail') === 'collapsed';
}
