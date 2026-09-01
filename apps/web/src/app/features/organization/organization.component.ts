import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgClass, NgFor, NgIf } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';

import { ApiService, apiError } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { CAN, Role, hasRole, roleLabel } from '../../core/models/roles';
import { API } from '../../core/models/endpoints';
import { OrgNode, Person } from '../../core/models/domain';

import { NetroIcon } from '../../ui/icon';
import { NetroAvatar, NetroBadge, NetroSkeleton, NetroState } from '../../ui/primitives';
import { NetroPageHeader, NetroPanel, NetroMetric } from '../../ui/patterns';
import { NetroDrawer } from '../../ui/overlays';
import { NetroToolbar } from '../../ui/toolbar';
import { BranchesComponent } from './components/branches.component';
import { DepartmentsComponent } from './components/departments.component';

/** One row of the flattened hierarchy the template renders. */
interface OrgRow {
  node: OrgNode;
  depth: number;
  expanded: boolean;
  loading: boolean;
}

type Strategy = 'move-to-unassigned' | 'move-to-manager' | 'individual';

/**
 * The reporting structure as an explorable hierarchy rather than a poster.
 *
 * Org charts fail at scale when they try to draw everything at once, so this
 * loads one level at a time from the cached org-chart endpoints. Alongside it
 * sit the two things an administrator actually comes here to fix: people with
 * no supervisor, and managers who need to be removed without orphaning a team.
 */
@Component({
  selector: 'app-organization',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    NgClass,
    RouterLink,
    NetroIcon,
    NetroPageHeader,
    NetroPanel,
    NetroMetric,
    NetroToolbar,
    NetroAvatar,
    NetroBadge,
    NetroSkeleton,
    NetroState,
    NetroDrawer,
    BranchesComponent,
    DepartmentsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './organization.component.html',
  styleUrl: './organization.component.css',
})
export class OrganizationComponent {
  readonly activeTab = signal<'chart' | 'departments'>('chart');
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly refreshing = signal(false);

  readonly roots = signal<OrgNode[]>([]);
  /** Children keyed by manager id, populated on first expand. */
  private readonly children = signal<Record<string, OrgNode[]>>({});
  private readonly expanded = signal<Set<string>>(new Set());
  private readonly loadingNodes = signal<Set<string>>(new Set());

  readonly unassigned = signal<Person[]>([]);
  readonly managers = signal<Person[]>([]);

  readonly search = signal('');
  readonly searching = signal(false);
  readonly matches = signal<OrgNode[] | null>(null);

  /** Manager-removal workflow. */
  readonly removing = signal<OrgNode | null>(null);
  readonly removalTeam = signal<OrgNode[]>([]);
  readonly strategy = signal<Strategy>('move-to-manager');
  readonly targetManagerId = signal('');
  readonly individual = signal<Record<string, string>>({});
  readonly submitting = signal(false);

  readonly actorRole = this.api.role;
  readonly canManageWorkforce = computed(() => hasRole(this.actorRole(), CAN.manageWorkforce));
  readonly canRestructure = computed(() => hasRole(this.actorRole(), CAN.editWorkforce));

  /** Depth-first flatten of the loaded subtree — only what is expanded. */
  readonly rows = computed<OrgRow[]>(() => {
    const out: OrgRow[] = [];
    const kids = this.children();
    const open = this.expanded();
    const busy = this.loadingNodes();

    const walk = (nodes: OrgNode[], depth: number): void => {
      for (const node of nodes) {
        const isOpen = open.has(node.id);
        out.push({ node, depth, expanded: isOpen, loading: busy.has(node.id) });
        if (isOpen) walk(kids[node.id] ?? [], depth + 1);
      }
    };

    walk(this.roots(), 0);
    return out;
  });

  readonly headcount = computed(() => {
    const kids = this.children();
    const seen = new Set<string>();
    for (const node of this.roots()) seen.add(node.id);
    for (const list of Object.values(kids)) for (const node of list) seen.add(node.id);
    return seen.size;
  });

  /** Managers who could take over a team, minus the one being removed. */
  readonly replacementOptions = computed(() => {
    const excludeId = this.removing()?.id;
    return this.managers().filter(m => m.id !== excludeId && m.status !== 'INACTIVE');
  });

  readonly removalValid = computed(() => {
    if (this.strategy() === 'move-to-manager') return !!this.targetManagerId();
    return true;
  });

  constructor() {
    this.load();
  }

  // ---- Data ---------------------------------------------------------------

  load(refresh = false): void {
    this.loading.set(this.roots().length === 0);
    this.refreshing.set(refresh);
    this.error.set(null);

    forkJoin({
      roots: this.api.get<OrgNode[]>(API.orgRoots, { refresh: refresh || undefined }),
      unassigned: this.api.list<Person>(API.workforceUnassigned),
      managers: hasRole(this.actorRole(), CAN.manageWorkforce)
        ? this.api.list<Person>(API.workforceManagers)
        : of<Person[]>([]),
    }).subscribe({
      next: ({ roots, unassigned, managers }) => {
        this.roots.set(Array.isArray(roots.data) ? roots.data : []);
        this.unassigned.set(unassigned);
        this.managers.set(managers);
        if (refresh) {
          this.children.set({});
          this.expanded.set(new Set());
        }
        this.loading.set(false);
        this.refreshing.set(false);
      },
      error: err => {
        this.error.set(apiError(err, 'Could not load the organisation chart.'));
        this.loading.set(false);
        this.refreshing.set(false);
      },
    });
  }

  toggle(node: OrgNode): void {
    if (!node.subordinatesCount) return;

    const open = new Set(this.expanded());
    if (open.has(node.id)) {
      open.delete(node.id);
      this.expanded.set(open);
      return;
    }

    open.add(node.id);
    this.expanded.set(open);
    if (this.children()[node.id]) return;

    this.markLoading(node.id, true);
    this.api.list<OrgNode>(API.orgSubordinates(node.id)).subscribe(list => {
      this.children.update(current => ({ ...current, [node.id]: list }));
      this.markLoading(node.id, false);
    });
  }

  private markLoading(id: string, busy: boolean): void {
    const next = new Set(this.loadingNodes());
    if (busy) next.add(id);
    else next.delete(id);
    this.loadingNodes.set(next);
  }

  /**
   * Search is server-side across the whole tenant, so a match deep in the
   * hierarchy is reachable without expanding every branch to find it.
   */
  onSearch(value: string): void {
    this.search.set(value);
    const query = value.trim();
    if (query.length < 2) {
      this.matches.set(null);
      this.searching.set(false);
      return;
    }
    this.searching.set(true);
    this.api.list<OrgNode>(API.orgSearch, { q: query }).subscribe(list => {
      this.matches.set(list);
      this.searching.set(false);
    });
  }

  clearSearch(): void {
    this.search.set('');
    this.matches.set(null);
  }

  // ---- Manager removal ----------------------------------------------------

  startRemoval(node: OrgNode): void {
    this.removing.set(node);
    this.strategy.set(node.subordinatesCount ? 'move-to-manager' : 'move-to-unassigned');
    this.targetManagerId.set('');
    this.individual.set({});
    this.removalTeam.set(this.children()[node.id] ?? []);

    if (node.subordinatesCount && !this.children()[node.id]) {
      this.api.list<OrgNode>(API.orgSubordinates(node.id)).subscribe(list => {
        this.children.update(current => ({ ...current, [node.id]: list }));
        this.removalTeam.set(list);
      });
    }
  }

  closeRemoval(): void {
    this.removing.set(null);
  }

  setStrategy(value: Strategy): void {
    this.strategy.set(value);
  }

  setTargetManager(value: string): void {
    this.targetManagerId.set(value);
  }

  assignIndividual(employeeId: string, managerId: string): void {
    this.individual.update(current => ({ ...current, [employeeId]: managerId }));
  }

  individualFor(employeeId: string): string {
    return this.individual()[employeeId] ?? '';
  }

  async submitRemoval(): Promise<void> {
    const manager = this.removing();
    if (!manager || !this.removalValid()) return;

    const team = this.removalTeam();
    const ok = await this.confirm.ask({
      title: `Remove ${manager.name} as a manager?`,
      body: 'Their team is reassigned first, then their access is deactivated. This is recorded in the audit log.',
      confirmLabel: 'Reassign and deactivate',
      tone: 'danger',
      facts: [
        { label: 'Team size', value: `${team.length || manager.subordinatesCount}` },
        { label: 'Reassignment', value: this.strategyLabel(this.strategy()) },
      ],
    });
    if (!ok) return;

    const body: Record<string, unknown> = { strategy: this.strategy() };
    if (this.strategy() === 'move-to-manager') body['targetManagerId'] = this.targetManagerId();
    if (this.strategy() === 'individual') {
      // The API accepts null to leave an employee unassigned.
      body['individualAssignments'] = Object.fromEntries(
        team.map(member => [member.id, this.individual()[member.id] || null]),
      );
    }

    this.submitting.set(true);
    this.api.post(API.personRemoveManager(manager.id), body).subscribe({
      next: res => {
        this.submitting.set(false);
        this.removing.set(null);
        this.toast.success('Manager removed', res.message ?? `${manager.name}'s team has been reassigned.`);
        this.load(true);
      },
      error: err => {
        this.submitting.set(false);
        this.toast.error('Could not remove this manager', apiError(err));
      },
    });
  }

  strategyLabel(strategy: Strategy): string {
    switch (strategy) {
      case 'move-to-unassigned':
        return 'Leave the team unassigned';
      case 'move-to-manager':
        return 'Move the whole team to one manager';
      case 'individual':
        return 'Choose a manager per person';
    }
  }

  // ---- Presentation -------------------------------------------------------

  label(role: string): string {
    return roleLabel(role);
  }

  /** Indentation is capped so a deep hierarchy never pushes names off-screen. */
  indent(depth: number): number {
    return Math.min(depth, 6) * 20;
  }

  canRemove(node: OrgNode): boolean {
    return this.canRestructure() && node.role === ('MANAGER' as Role) && node.status !== 'INACTIVE';
  }
}
