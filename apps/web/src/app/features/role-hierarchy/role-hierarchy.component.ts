import { Component, computed, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { API } from '../../core/models/endpoints';
import { CompanyRole } from '../../core/models/domain';
import { hasRole, CAN } from '../../core/models/roles';
import { NetroIcon } from '../../ui/icon';

@Component({
  selector: 'app-role-hierarchy',
  standalone: true,
  imports: [CommonModule, FormsModule, NetroIcon],
  templateUrl: './role-hierarchy.component.html',
  styleUrl: './role-hierarchy.component.css',
})
export class RoleHierarchyComponent implements OnInit {
  private readonly api = inject(ApiService);

  // ── State ──────────────────────────────────────────────────────────────────
  roles = signal<CompanyRole[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);

  // Drawer state
  drawerOpen = signal(false);
  drawerMode = signal<'create' | 'edit'>('create');
  selectedRole = signal<CompanyRole | null>(null);
  deleteConfirmId = signal<string | null>(null);

  // Form state
  form = signal({
    name: '',
    code: '',
    rank: 2,
    description: '',
    isActive: true,
  });

  // ── Computed ───────────────────────────────────────────────────────────────
  canManage = computed(() => hasRole(this.api.role(), CAN.manageRoleHierarchy));

  sortedRoles = computed(() =>
    [...this.roles()].sort((a, b) => a.rank - b.rank)
  );

  nextAvailableRank = computed(() => {
    const used = new Set(this.roles().map((r) => r.rank));
    for (let i = 2; i < 100; i++) {
      if (!used.has(i)) return i;
    }
    return this.roles().length + 2;
  });

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadRoles();
  }

  // ── Data ───────────────────────────────────────────────────────────────────
  loadRoles(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.get<CompanyRole[]>(API.roleHierarchy).subscribe({
      next: (res) => {
        const rows = Array.isArray(res.data) ? res.data : [];
        this.roles.set(rows);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load role hierarchy');
        this.loading.set(false);
      },
    });
  }

  // ── Drawer helpers ─────────────────────────────────────────────────────────
  openCreate(): void {
    const nextRank = this.nextAvailableRank();
    this.drawerMode.set('create');
    this.selectedRole.set(null);
    this.form.set({ name: '', code: '', rank: nextRank, description: '', isActive: true });
    this.drawerOpen.set(true);
  }

  openEdit(role: CompanyRole): void {
    this.drawerMode.set('edit');
    this.selectedRole.set(role);
    this.form.set({
      name: role.name,
      code: role.code,
      rank: role.rank,
      description: role.description ?? '',
      isActive: role.isActive,
    });
    this.drawerOpen.set(true);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
    this.selectedRole.set(null);
  }

  // Auto-generate code from name (UPPER_SNAKE_CASE)
  onNameChange(name: string): void {
    this.form.update((f) => ({
      ...f,
      name,
      code: f.code || name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, ''),
    }));
  }

  onCodeChange(val: string): void {
    this.form.update((f) => ({ ...f, code: val.toUpperCase() }));
  }

  onRankChange(val: string | number): void {
    this.form.update((f) => ({ ...f, rank: +val }));
  }

  onDescriptionChange(val: string): void {
    this.form.update((f) => ({ ...f, description: val }));
  }

  onActiveChange(val: boolean): void {
    this.form.update((f) => ({ ...f, isActive: val }));
  }

  // ── CRUD ───────────────────────────────────────────────────────────────────
  save(): void {
    const f = this.form();
    if (!f.name.trim() || !f.code.trim()) return;
    this.saving.set(true);

    const payload = {
      name: f.name.trim(),
      code: f.code.trim().toUpperCase(),
      rank: f.rank,
      description: f.description.trim() || null,
      isActive: f.isActive,
    };

    const mode = this.drawerMode();
    const req =
      mode === 'create'
        ? this.api.post<CompanyRole>(API.roleHierarchy, payload)
        : this.api.put<CompanyRole>(API.roleHierarchyItem(this.selectedRole()!.id), payload);

    req.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeDrawer();
        this.loadRoles();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(err?.error?.message ?? 'Failed to save role');
      },
    });
  }

  requestDelete(role: CompanyRole): void {
    this.deleteConfirmId.set(role.id);
  }

  cancelDelete(): void {
    this.deleteConfirmId.set(null);
  }

  confirmDelete(): void {
    const id = this.deleteConfirmId();
    if (!id) return;
    this.api.delete(API.roleHierarchyItem(id)).subscribe({
      next: () => {
        this.deleteConfirmId.set(null);
        this.loadRoles();
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to delete role');
        this.deleteConfirmId.set(null);
      },
    });
  }

  moveRank(role: CompanyRole, direction: 'up' | 'down'): void {
    const sorted = this.sortedRoles();
    const idx = sorted.findIndex((r) => r.id === role.id);
    if (direction === 'up' && idx <= 0) return;
    if (direction === 'down' && idx >= sorted.length - 1) return;

    const swapWith = direction === 'up' ? sorted[idx - 1] : sorted[idx + 1];

    // Guard: system role must stay at rank 1
    if (swapWith.isSystem || role.isSystem) return;

    const newOrder = sorted.map((r) => {
      if (r.id === role.id) return { id: r.id, rank: swapWith.rank };
      if (r.id === swapWith.id) return { id: r.id, rank: role.rank };
      return { id: r.id, rank: r.rank };
    });

    this.api.put(API.roleHierarchyReorder, { roles: newOrder }).subscribe({
      next: () => this.loadRoles(),
      error: (err) => this.error.set(err?.error?.message ?? 'Failed to reorder roles'),
    });
  }

  // ── Template helpers ───────────────────────────────────────────────────────
  rankBadgeClass(rank: number): string {
    if (rank === 1) return 'rank-badge rank-1';
    if (rank <= 3) return 'rank-badge rank-high';
    return 'rank-badge rank-normal';
  }

  trackById(_: number, role: CompanyRole): string {
    return role.id;
  }

  get deleteCandidate(): CompanyRole | undefined {
    return this.roles().find((r) => r.id === this.deleteConfirmId());
  }
}
