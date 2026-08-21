import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { ApiService, apiError, fieldErrors } from '../../core/services/api.service';
import { ThemeService, ThemeChoice } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';
import { CAN, hasRole } from '../../core/models/roles';
import { Company, ModuleKey, moduleEnabled } from '../../core/models/domain';

import { NetroIcon, IconName } from '../../ui/icon';
import { NetroBadge, NetroSkeleton, NetroState } from '../../ui/primitives';
import { NetroPageHeader, NetroPanel, NetroTabs } from '../../ui/patterns';

type Section = 'appearance' | 'organisation' | 'capabilities' | 'account';

interface ModuleRow {
  key: ModuleKey;
  name: string;
  description: string;
  icon: IconName;
}

/** The three capabilities the platform delivers today. */
const MODULES: ModuleRow[] = [
  {
    key: 'ATTENDANCE',
    name: 'Attendance',
    description: 'Punch in and out with location and photo evidence, shift history and attendance policies.',
    icon: 'clock',
  },
  {
    key: 'GPS',
    name: 'Location tracking',
    description: 'Records positions while people are on shift and powers the live operations board.',
    icon: 'radar',
  },
  {
    key: 'REGULARIZATION',
    name: 'Regularisation',
    description: 'Lets people correct a missed or wrong punch, routed to their supervisor for approval.',
    icon: 'approve',
  },
];

const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Europe/London', 'America/New_York', 'UTC'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

/**
 * Settings, split by who the change affects: this browser, this company, or
 * this account. Grouping by blast radius is more useful than grouping by
 * which API happens to serve the field.
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    RouterLink,
    ReactiveFormsModule,
    NetroIcon,
    NetroPageHeader,
    NetroPanel,
    NetroTabs,
    NetroBadge,
    NetroSkeleton,
    NetroState,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  readonly theme = inject(ThemeService);

  readonly section = signal<Section>('appearance');

  readonly company = signal<Company | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly savingProfile = signal(false);
  readonly savingModule = signal<ModuleKey | null>(null);
  readonly serverErrors = signal<Record<string, string>>({});

  readonly modules = MODULES;
  readonly timezones = TIMEZONES;
  readonly currencies = CURRENCIES;

  readonly user = this.api.user;
  readonly canAdminister = computed(() =>
    hasRole(this.api.role(), ['SUPER_ADMIN', 'COMPANY_ADMIN']),
  );
  readonly canSeeCompany = computed(() => !!this.api.user()?.company?.id);

  readonly themeOptions: Array<{ value: ThemeChoice; label: string; hint: string; icon: IconName }> = [
    { value: 'light', label: 'Light', hint: 'Best for bright rooms and projectors.', icon: 'sun' },
    { value: 'dark', label: 'Dark', hint: 'Lower glare for long operational shifts.', icon: 'moon' },
    { value: 'system', label: 'Match system', hint: 'Follows your operating system setting.', icon: 'monitor' },
  ];

  readonly tabs = computed(() => {
    const tabs: Array<{ value: Section; label: string; icon: IconName }> = [
      { value: 'appearance', label: 'Appearance', icon: 'sun' },
    ];
    if (this.canSeeCompany()) {
      tabs.push({ value: 'organisation', label: 'Organisation', icon: 'building' });
      tabs.push({ value: 'capabilities', label: 'Capabilities', icon: 'layers' });
    }
    tabs.push({ value: 'account', label: 'Account', icon: 'user' });
    return tabs;
  });

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    legalName: [''],
    officialEmail: ['', [Validators.email]],
    phone: [''],
    website: [''],
    industry: [''],
    taxId: [''],
    registrationNumber: [''],
    addressLine1: [''],
    addressLine2: [''],
    city: [''],
    state: [''],
    zipCode: [''],
    country: [''],
    timezone: ['Asia/Kolkata'],
    currency: ['INR'],
  });

  constructor() {
    if (this.canSeeCompany()) this.loadCompany();
    if (!this.canAdminister()) this.form.disable();
  }

  select(section: string): void {
    this.section.set(section as Section);
  }

  // ---- Company ------------------------------------------------------------

  loadCompany(): void {
    const companyId = this.api.user()?.company?.id;
    if (!companyId) return;

    this.loading.set(true);
    this.error.set(null);

    this.api.get<Company>(`/companies/${companyId}`).subscribe({
      next: res => {
        const company = res.data ?? null;
        this.company.set(company);
        if (company) this.fillForm(company);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(apiError(err, 'Could not load your organisation profile.'));
        this.loading.set(false);
      },
    });
  }

  private fillForm(company: Company): void {
    this.form.reset({
      name: company.name ?? '',
      legalName: company.legalName ?? '',
      officialEmail: company.officialEmail ?? '',
      phone: company.phone ?? '',
      website: company.website ?? '',
      industry: company.industry ?? '',
      taxId: company.taxId ?? '',
      registrationNumber: company.registrationNumber ?? '',
      addressLine1: company.addressLine1 ?? '',
      addressLine2: company.addressLine2 ?? '',
      city: company.city ?? '',
      state: company.state ?? '',
      zipCode: company.zipCode ?? '',
      country: company.country ?? '',
      timezone: company.timezone ?? 'Asia/Kolkata',
      currency: company.currency ?? 'INR',
    });
    if (!this.canAdminister()) this.form.disable();
  }

  saveProfile(): void {
    const company = this.company();
    if (!company || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.savingProfile.set(true);
    this.serverErrors.set({});

    this.api.put<Company>(`/companies/${company.id}`, this.form.getRawValue()).subscribe({
      next: res => {
        this.savingProfile.set(false);
        this.form.markAsPristine();
        if (res.data) this.company.set({ ...company, ...res.data });
        this.toast.success('Organisation updated', 'Your changes have been saved.');
        // The shell shows the company name, so refresh the session view of it.
        this.api.fetchCurrentUser().subscribe({ error: () => undefined });
      },
      error: err => {
        this.savingProfile.set(false);
        this.serverErrors.set(fieldErrors(err));
        this.toast.error('Could not save the organisation profile', apiError(err));
      },
    });
  }

  // ---- Capabilities -------------------------------------------------------

  enabled(key: ModuleKey): boolean {
    return moduleEnabled(this.company(), key);
  }

  /**
   * Location tracking has two switches on the server: the module record and
   * `isGpsEnabled` on the company, which overrides every user's preference.
   * Sending both keeps them from drifting apart.
   */
  toggleModule(key: ModuleKey, next: boolean): void {
    const company = this.company();
    if (!company || !this.canAdminister()) return;

    const modules: Record<string, boolean> = {};
    for (const row of MODULES) modules[row.key.toLowerCase()] = row.key === key ? next : this.enabled(row.key);

    const body: Record<string, unknown> = { modules };
    if (key === 'GPS') body['isGpsEnabled'] = next;

    this.savingModule.set(key);
    this.api.put<Company>(`/companies/${company.id}`, body).subscribe({
      next: () => {
        this.savingModule.set(null);
        this.toast.success(
          next ? 'Capability enabled' : 'Capability disabled',
          `${MODULES.find(m => m.key === key)?.name} is now ${next ? 'available' : 'switched off'} for everyone in ${company.name}.`,
        );
        this.loadCompany();
      },
      error: err => {
        this.savingModule.set(null);
        this.toast.error('Could not change this capability', apiError(err));
      },
    });
  }

  // ---- Presentation -------------------------------------------------------

  headcount(): number | null {
    return this.company()?._count?.users ?? null;
  }

  errorFor(control: keyof typeof this.form.controls): string | null {
    const server = this.serverErrors()[control as string];
    if (server) return server;
    const field = this.form.controls[control];
    if (!field.touched || field.valid) return null;
    if (field.hasError('required')) return 'This is required.';
    if (field.hasError('email')) return 'Enter a valid email address.';
    if (field.hasError('minlength')) return 'This is too short.';
    return 'Check this value.';
  }

  checked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }
}
