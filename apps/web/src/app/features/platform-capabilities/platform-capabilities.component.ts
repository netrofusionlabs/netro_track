import { ChangeDetectionStrategy, Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService, apiError } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { API } from '../../core/models/endpoints';

export interface CapabilityNode {
  id: string;
  parentId?: string | null;
  type: 'MODULE' | 'FEATURE' | 'ACTION';
  key: string;
  slug: string;
  name: string;
  description?: string | null;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
  children?: CapabilityNode[];
}

@Component({
  selector: 'app-platform-capabilities',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './platform-capabilities.component.html',
  styleUrls: ['./platform-capabilities.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlatformCapabilitiesComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  readonly capabilities = signal<CapabilityNode[]>([]);
  readonly loading = signal<boolean>(true);
  readonly saving = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);
  readonly successMessage = signal<string | null>(null);

  // Search & Filter
  readonly searchQuery = signal<string>('');

  // Modal / Drawer state
  readonly isDrawerOpen = signal<boolean>(false);
  readonly drawerMode = signal<'CREATE' | 'EDIT'>('CREATE');
  readonly selectedParent = signal<CapabilityNode | null>(null);
  readonly editingCapability = signal<CapabilityNode | null>(null);

  form!: FormGroup;

  // Flattened modules and features for parent dropdown
  readonly availableParents = computed(() => {
    const currentType = this.form?.get('type')?.value;
    const list: { id: string; name: string; type: string; slug: string }[] = [];
    const traverse = (nodes: CapabilityNode[]) => {
      for (const node of nodes) {
        if (currentType === 'FEATURE' && node.type === 'MODULE') {
          list.push({ id: node.id, name: node.name, type: node.type, slug: node.slug });
        } else if (currentType === 'ACTION' && node.type === 'FEATURE') {
          list.push({ id: node.id, name: node.name, type: node.type, slug: node.slug });
        } else if (!currentType && (node.type === 'MODULE' || node.type === 'FEATURE')) {
          list.push({ id: node.id, name: node.name, type: node.type, slug: node.slug });
        }
        if (node.children) {
          traverse(node.children);
        }
      }
    };
    traverse(this.capabilities());
    return list;
  });

  // Filtered capability tree based on search
  readonly filteredCapabilities = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    if (!q) return this.capabilities();

    return this.capabilities().filter((mod) => {
      const matchMod = mod.name.toLowerCase().includes(q) || mod.slug.toLowerCase().includes(q);
      const matchChild = (mod.children || []).some(
        (sub) =>
          sub.name.toLowerCase().includes(q) ||
          sub.slug.toLowerCase().includes(q) ||
          (sub.children || []).some((act) => act.name.toLowerCase().includes(q) || act.slug.toLowerCase().includes(q))
      );
      return matchMod || matchChild;
    });
  });

  ngOnInit(): void {
    this.initForm();
    this.loadCapabilities();
  }

  private initForm(): void {
    this.form = this.fb.group({
      type: ['MODULE', Validators.required],
      parentId: [null],
      key: [
        '',
        [
          Validators.required,
          Validators.minLength(2),
          Validators.maxLength(50),
          Validators.pattern(/^[a-z0-9_]+$/),
        ],
      ],
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: [''],
      icon: ['box'],
      sortOrder: [0],
    });
  }

  loadCapabilities(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.api.get<CapabilityNode[]>(API.platformCapabilities).subscribe({
      next: (res) => {
        this.capabilities.set(Array.isArray(res.data) ? res.data : []);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMessage.set(apiError(err));
        this.loading.set(false);
      },
    });
  }

  openCreateModal(type: 'MODULE' | 'FEATURE' | 'ACTION' = 'MODULE', parent: CapabilityNode | null = null): void {
    this.drawerMode.set('CREATE');
    this.selectedParent.set(parent);
    this.editingCapability.set(null);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.form.reset({
      type,
      parentId: parent ? parent.id : null,
      key: '',
      name: '',
      description: '',
      icon: type === 'MODULE' ? 'box' : type === 'FEATURE' ? 'layers' : 'check-circle',
      sortOrder: 10,
    });

    this.isDrawerOpen.set(true);
  }

  openEditModal(node: CapabilityNode): void {
    this.drawerMode.set('EDIT');
    this.editingCapability.set(node);
    this.selectedParent.set(null);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    this.form.reset({
      type: node.type,
      parentId: node.parentId || null,
      key: node.key,
      name: node.name,
      description: node.description || '',
      icon: node.icon || 'box',
      sortOrder: node.sortOrder || 0,
    });

    this.isDrawerOpen.set(true);
  }

  closeDrawer(): void {
    this.isDrawerOpen.set(false);
    this.editingCapability.set(null);
    this.selectedParent.set(null);
  }

  saveCapability(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const val = this.form.value;

    if (this.drawerMode() === 'CREATE') {
      this.api
        .post(API.platformCapabilities, {
          type: val.type,
          parentId: val.parentId || null,
          key: val.key,
          name: val.name,
          description: val.description,
          icon: val.icon,
          sortOrder: Number(val.sortOrder || 0),
        })
        .subscribe({
          next: () => {
            this.toast.success('Capability Created', `Capability "${val.name}" created successfully!`);
            this.closeDrawer();
            this.loadCapabilities();
            this.saving.set(false);
          },
          error: (err) => {
            this.errorMessage.set(apiError(err));
            this.saving.set(false);
          },
        });
    } else {
      const id = this.editingCapability()!.id;
      this.api
        .put(API.platformCapability(id), {
          name: val.name,
          description: val.description,
          icon: val.icon,
          sortOrder: Number(val.sortOrder || 0),
        })
        .subscribe({
          next: () => {
            this.toast.success('Capability Updated', `Capability "${val.name}" updated successfully!`);
            this.closeDrawer();
            this.loadCapabilities();
            this.saving.set(false);
          },
          error: (err) => {
            this.errorMessage.set(apiError(err));
            this.saving.set(false);
          },
        });
    }
  }

  async deactivateCapability(node: CapabilityNode): Promise<void> {
    const confirmed = await this.confirm.ask({
      title: 'Deactivate Capability',
      body: `Are you sure you want to deactivate "${node.name}" (${node.slug})?`,
      confirmLabel: 'Deactivate',
      tone: 'danger',
    });

    if (!confirmed) return;

    this.api.delete(API.platformCapability(node.id)).subscribe({
      next: () => {
        this.toast.success('Capability Deactivated', `Capability "${node.name}" was deactivated.`);
        this.loadCapabilities();
      },
      error: (err) => {
        this.toast.error('Deactivation Failed', apiError(err));
      },
    });
  }
}
