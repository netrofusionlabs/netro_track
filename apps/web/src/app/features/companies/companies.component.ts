import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgFor, NgIf, SlicePipe } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ApiService, apiError } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { API } from '../../core/models/endpoints';
import { Company } from '../../core/models/domain';
import { titleCase } from '../../core/utils/format';

import { NetroIcon } from '../../ui/icon';
import { NetroAvatar, NetroBadge, NetroSkeletonRows, NetroState } from '../../ui/primitives';
import { NetroPageHeader, NetroPanel } from '../../ui/patterns';
import { NetroDrawer } from '../../ui/overlays';
import { NetroToolbar } from '../../ui/toolbar';

export const COMPANY_TYPES = [
  { label: 'Private Limited Company', value: 'Private Limited Company' },
  { label: 'Public Limited Company', value: 'Public Limited Company' },
  { label: 'Limited Liability Partnership (LLP)', value: 'Limited Liability Partnership (LLP)' },
  { label: 'Partnership Firm', value: 'Partnership Firm' },
  { label: 'Sole Proprietorship', value: 'Sole Proprietorship' },
  { label: 'One Person Company (OPC)', value: 'One Person Company (OPC)' },
  { label: 'Section 8 Company / NGO', value: 'Section 8 Company / NGO' },
  { label: 'Other', value: 'Other' },
];

export const INDUSTRIES = [
  { label: 'Information Technology', value: 'Information Technology' },
  { label: 'Manufacturing', value: 'Manufacturing' },
  { label: 'Healthcare & Pharmaceuticals', value: 'Healthcare & Pharmaceuticals' },
  { label: 'Retail & E-Commerce', value: 'Retail & E-Commerce' },
  { label: 'Education & Training', value: 'Education & Training' },
  { label: 'Financial Services', value: 'Financial Services' },
  { label: 'Real Estate & Construction', value: 'Real Estate & Construction' },
  { label: 'Logistics & Transportation', value: 'Logistics & Transportation' },
  { label: 'Other', value: 'Other' },
];

export const EMP_COUNTS = [
  { label: '1 - 10 Employees', value: '1-10' },
  { label: '11 - 50 Employees', value: '11-50' },
  { label: '51 - 200 Employees', value: '51-200' },
  { label: '201 - 500 Employees', value: '201-500' },
  { label: '500+ Employees', value: '500+' },
];

export const COUNTRIES = [
  { label: 'India', value: 'India' },
  { label: 'United Arab Emirates', value: 'United Arab Emirates' },
  { label: 'United States', value: 'United States' },
  { label: 'United Kingdom', value: 'United Kingdom' },
  { label: 'Singapore', value: 'Singapore' },
  { label: 'Australia', value: 'Australia' },
];

export const TIMEZONES = [
  { label: 'Asia/Kolkata (IST)', value: 'Asia/Kolkata' },
  { label: 'Asia/Dubai (GST)', value: 'Asia/Dubai' },
  { label: 'Europe/London (GMT)', value: 'Europe/London' },
  { label: 'America/New_York (EST)', value: 'America/New_York' },
];

export const CURRENCIES = [
  { label: 'Indian Rupee (INR)', value: 'INR' },
  { label: 'US Dollar (USD)', value: 'USD' },
  { label: 'UAE Dirham (AED)', value: 'AED' },
  { label: 'British Pound (GBP)', value: 'GBP' },
  { label: 'Euro (EUR)', value: 'EUR' },
];

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  if (!password || !confirm) return null;
  return password === confirm ? null : { passwordsMismatch: true };
}

declare const google: any;

export interface StructuredAddress {
  formattedAddress: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude?: number;
  longitude?: number;
}

export interface AddressSearchResult {
  id: string;
  title: string;
  subtitle: string;
  googlePlaceId?: string;
  structured?: StructuredAddress;
}

export const POPULAR_CITIES = ['Bengaluru', 'Mumbai', 'Delhi NCR', 'Hyderabad', 'Chennai', 'Pune', 'Dubai'];

function parseGooglePlaceDetails(details: any): StructuredAddress {
  const components = details.address_components || [];

  function getComponent(types: string[], useShort = false): string {
    const comp = components.find((c: any) => types.some((t: string) => c.types.includes(t)));
    return comp ? (useShort ? comp.short_name : comp.long_name) : '';
  }

  const premise = getComponent(['subpremise', 'premise', 'building', 'room']);
  const streetNumber = getComponent(['street_number']);
  const route = getComponent(['route']);
  const placeName = details.name || '';

  const line1Parts = [
    placeName,
    [premise, streetNumber, route].filter(Boolean).join(' '),
  ].filter(Boolean);

  const addressLine1 =
    line1Parts.length > 0
      ? line1Parts.join(', ')
      : details.formatted_address?.split(',')[0] || '';

  const line2Parts = [
    getComponent(['sublocality_level_2', 'sublocality_level_3']),
    getComponent(['sublocality_level_1', 'sublocality', 'neighborhood']),
  ].filter(Boolean);

  const addressLine2 = line2Parts.join(', ');

  const city =
    getComponent(['locality', 'postal_town', 'administrative_area_level_2']) ||
    getComponent(['sublocality_level_1']);
  const state = getComponent(['administrative_area_level_1']);
  const zipCode = getComponent(['postal_code']);
  const country = getComponent(['country']) || 'India';

  const lat = details.geometry?.location
    ? typeof details.geometry.location.lat === 'function'
      ? details.geometry.location.lat()
      : details.geometry.location.lat
    : undefined;
  const lng = details.geometry?.location
    ? typeof details.geometry.location.lng === 'function'
      ? details.geometry.location.lng()
      : details.geometry.location.lng
    : undefined;

  return {
    formattedAddress: details.formatted_address || '',
    addressLine1,
    addressLine2,
    city,
    state,
    zipCode,
    country,
    latitude: lat,
    longitude: lng,
  };
}

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [
    NgIf,
    NgFor,
    SlicePipe,
    ReactiveFormsModule,
    RouterLink,
    NetroIcon,
    NetroPageHeader,
    NetroPanel,
    NetroToolbar,
    NetroAvatar,
    NetroBadge,
    NetroState,
    NetroSkeletonRows,
    NetroDrawer,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './companies.component.html',
  styleUrl: './companies.component.css',
})
export class CompaniesComponent {
  private readonly api = inject(ApiService);
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);

  readonly companyTypes = COMPANY_TYPES;
  readonly industries = INDUSTRIES;
  readonly empCounts = EMP_COUNTS;
  readonly countries = COUNTRIES;
  readonly timezones = TIMEZONES;
  readonly currencies = CURRENCIES;
  readonly popularCities = POPULAR_CITIES;

  private autocompleteService: any = null;
  private placesService: any = null;

  readonly addressModalOpen = signal(false);
  readonly addressSearchQuery = signal('');
  readonly addressSearching = signal(false);
  readonly addressSearchResults = signal<AddressSearchResult[]>([]);

  private getAutocompleteService(): any {
    if (typeof google !== 'undefined' && google.maps && google.maps.places) {
      if (!this.autocompleteService) {
        this.autocompleteService = new google.maps.places.AutocompleteService();
      }
      return this.autocompleteService;
    }
    return null;
  }

  private getPlacesService(): any {
    if (typeof google !== 'undefined' && google.maps && google.maps.places) {
      if (!this.placesService) {
        const dummy = document.createElement('div');
        this.placesService = new google.maps.places.PlacesService(dummy);
      }
      return this.placesService;
    }
    return null;
  }

  openAddressModal(): void {
    this.addressSearchQuery.set('');
    this.addressSearchResults.set([]);
    this.addressModalOpen.set(true);
  }

  closeAddressModal(): void {
    this.addressModalOpen.set(false);
  }

  searchPopularCity(city: string): void {
    this.addressSearchQuery.set(city);
    this.onAddressSearch(city);
  }

  onAddressSearch(query: string): void {
    this.addressSearchQuery.set(query);
    const text = query.trim();
    if (!text || text.length < 2) {
      this.addressSearchResults.set([]);
      return;
    }

    this.addressSearching.set(true);

    const service = this.getAutocompleteService();
    if (service) {
      service.getPlacePredictions(
        { input: text },
        (predictions: any[], status: any) => {
          this.addressSearching.set(false);
          if (status === google.maps.places.PlacesServiceStatus.OK && Array.isArray(predictions)) {
            const results: AddressSearchResult[] = predictions.map(p => ({
              id: p.place_id,
              title: p.structured_formatting?.main_text || p.description.split(',')[0],
              subtitle:
                p.structured_formatting?.secondary_text ||
                p.description.split(',').slice(1).join(', ').trim(),
              googlePlaceId: p.place_id,
            }));
            this.addressSearchResults.set(results);
          } else {
            this.fallbackPhotonSearch(text);
          }
        },
      );
    } else {
      this.fallbackPhotonSearch(text);
    }
  }

  private fallbackPhotonSearch(text: string): void {
    const fallbackUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(text)}&limit=8`;
    fetch(fallbackUrl)
      .then(r => r.json())
      .then(data => {
        this.addressSearching.set(false);
        if (data.features && Array.isArray(data.features)) {
          const results: AddressSearchResult[] = data.features.map((f: any) => {
            const p = f.properties || {};
            const [lon, lat] = f.geometry?.coordinates || [];

            const street = [p.housenumber, p.street || p.name].filter(Boolean).join(' ');
            const title = p.name || street || p.city || 'Location';
            const subtitle = [p.district, p.city, p.state, p.country].filter(Boolean).join(', ');

            let matchedCountry = 'India';
            if (p.country) {
              const found = COUNTRIES.find(
                c => c.value.toLowerCase() === p.country.toLowerCase() || c.label.toLowerCase() === p.country.toLowerCase(),
              );
              if (found) matchedCountry = found.value;
            }

            return {
              id: `${lat}-${lon}-${Math.random()}`,
              title,
              subtitle,
              structured: {
                formattedAddress: [title, subtitle].filter(Boolean).join(', '),
                addressLine1: street || p.name || '',
                addressLine2: p.district || p.suburb || '',
                city: p.city || p.town || p.village || '',
                state: p.state || '',
                zipCode: p.postcode || '',
                country: matchedCountry,
                latitude: lat,
                longitude: lon,
              },
            };
          });
          this.addressSearchResults.set(results);
        } else {
          this.addressSearchResults.set([]);
        }
      })
      .catch(() => {
        this.addressSearching.set(false);
        this.addressSearchResults.set([]);
      });
  }

  selectAddress(item: AddressSearchResult): void {
    if (item.googlePlaceId) {
      const placesSvc = this.getPlacesService();
      if (placesSvc) {
        this.addressSearching.set(true);
        placesSvc.getDetails(
          {
            placeId: item.googlePlaceId,
            fields: ['name', 'formatted_address', 'address_components', 'geometry'],
          },
          (place: any, status: any) => {
            this.addressSearching.set(false);
            if (status === google.maps.places.PlacesServiceStatus.OK && place) {
              const structured = parseGooglePlaceDetails(place);
              this.applyStructuredAddress(structured);
            } else if (item.structured) {
              this.applyStructuredAddress(item.structured);
            }
          },
        );
        return;
      }
    }

    if (item.structured) {
      this.applyStructuredAddress(item.structured);
    }
  }

  private applyStructuredAddress(addr: StructuredAddress): void {
    const form = this.wizard.controls.company;

    // Find matched country in our dropdown or default
    let matchedCountry = form.value.country || 'India';
    if (addr.country) {
      const found = COUNTRIES.find(
        c => c.value.toLowerCase() === addr.country.toLowerCase() || c.label.toLowerCase() === addr.country.toLowerCase(),
      );
      if (found) matchedCountry = found.value;
    }

    form.patchValue({
      addressLine1: addr.addressLine1 || form.value.addressLine1 || '',
      addressLine2: addr.addressLine2 || form.value.addressLine2 || '',
      city: addr.city || form.value.city || '',
      state: addr.state || form.value.state || '',
      zipCode: addr.zipCode || form.value.zipCode || '',
      country: matchedCountry,
    });

    this.closeAddressModal();
    this.toast.success('Address autofilled', `${addr.city || addr.addressLine1 || 'Location'} details applied to form.`);
  }

  formattedLocation(c: { city?: string; state?: string; country?: string } | null | undefined): string {
    if (!c) return 'N/A';
    return [c.city, c.state, c.country].filter(x => !!x).join(', ') || 'N/A';
  }

  readonly companies = signal<Company[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly search = signal('');
  readonly statusFilter = signal<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  readonly viewing = signal<Company | null>(null);
  readonly wizardOpen = signal(false);
  readonly isEditMode = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly step = signal(1);
  readonly saving = signal(false);
  readonly logoUploading = signal(false);
  readonly logoPreview = signal<string | null>(null);
  readonly createdResult = signal<Company | null>(null);

  readonly rows = computed(() => {
    const q = this.search().trim().toLowerCase();
    const filter = this.statusFilter();
    let list = this.companies();

    if (filter === 'ACTIVE') {
      list = list.filter(c => c.status !== 'INACTIVE');
    } else if (filter === 'INACTIVE') {
      list = list.filter(c => c.status === 'INACTIVE');
    }

    if (!q) return list;
    return list.filter(c =>
      [c.name, c.code, c.officialEmail, c.industry, c.city].join(' ').toLowerCase().includes(q),
    );
  });

  readonly activeCount = computed(() => this.companies().filter(c => c.status !== 'INACTIVE').length);
  readonly inactiveCount = computed(() => this.companies().filter(c => c.status === 'INACTIVE').length);

  readonly wizard = this.fb.nonNullable.group({
    company: this.fb.nonNullable.group({
      name: ['', Validators.required],
      code: ['', [Validators.required, Validators.minLength(2)]],
      legalName: [''],
      industry: [''],
      companyType: [''],
      employeeCount: [''],
      officialEmail: ['', [Validators.required, Validators.email]],
      phone: [''],
      addressLine1: [''],
      addressLine2: [''],
      city: [''],
      state: [''],
      zipCode: [''],
      country: ['India'],
      timezone: ['Asia/Kolkata'],
      currency: ['INR'],
      taxId: [''],
      registrationNumber: [''],
      logoUrl: [''],
    }),
    admin: this.fb.nonNullable.group(
      {
        name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],
        mobile: ['', [Validators.required, Validators.minLength(10)]],
        password: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: passwordsMatch },
    ),
    modules: this.fb.nonNullable.group({
      attendance: [true],
      gps: [true],
      regularization: [true],
      leave: [false],
      shift: [false],
      payroll: [false],
      expense: [false],
      asset: [false],
      performance: [false],
      recruitment: [false],
    }),
  });

  readonly companyData = computed(() => this.wizard.controls.company.value);
  readonly adminData = computed(() => this.wizard.controls.admin.value);
  readonly modulesData = computed(() => this.wizard.controls.modules.value);

  readonly activeModulesSummary = computed(() => {
    const m = this.modulesData();
    const active: string[] = [];
    if (m.attendance) {
      active.push('ATTENDANCE');
      if (m.gps) active.push('GPS TRACKING');
      if (m.regularization) active.push('ATTENDANCE REGULARIZATION');
    }
    return active.length ? active.join(', ') : 'None';
  });

  constructor() {
    this.load();
    this.setupModuleCascading();
  }

  private setupModuleCascading(): void {
    const modulesGroup = this.wizard.controls.modules;
    modulesGroup.controls.attendance.valueChanges.subscribe(attendanceOn => {
      if (!attendanceOn) {
        // If Attendance is disabled, GPS & Regularization must turn off
        modulesGroup.patchValue({ gps: false, regularization: false }, { emitEvent: false });
      } else {
        // If Attendance is enabled, auto-enable Regularization and GPS
        modulesGroup.patchValue({ regularization: true, gps: true }, { emitEvent: false });
      }
    });
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.get<Company[]>(API.companies).subscribe({
      next: res => {
        this.companies.set(Array.isArray(res.data) ? res.data : []);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(apiError(err, 'Could not load companies.'));
        this.loading.set(false);
      },
    });
  }

  label = titleCase;
  applySearch(v: string): void {
    this.search.set(v);
  }

  view(c: Company): void {
    this.viewing.set(c);
  }

  closeView(): void {
    this.viewing.set(null);
  }

  setStatusFilter(filter: 'ALL' | 'ACTIVE' | 'INACTIVE'): void {
    this.statusFilter.set(filter);
  }

  isMasterCompany(c: Company | null | undefined): boolean {
    if (!c) return false;
    return c.code?.toUpperCase() === 'NETRO' || c.name?.toLowerCase() === 'netrotrack';
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const upper = (input.value || '').toUpperCase();
    this.wizard.controls.company.controls.code.setValue(upper, { emitEvent: false });
  }

  startCreate(): void {
    this.isEditMode.set(false);
    this.editingId.set(null);
    this.logoPreview.set(null);
    this.createdResult.set(null);
    this.step.set(1);
    this.wizard.reset({
      company: {
        name: '',
        code: '',
        legalName: '',
        industry: '',
        companyType: '',
        employeeCount: '',
        officialEmail: '',
        phone: '',
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        zipCode: '',
        country: 'India',
        timezone: 'Asia/Kolkata',
        currency: 'INR',
        taxId: '',
        registrationNumber: '',
        logoUrl: '',
      },
      admin: { name: '', email: '', mobile: '', password: '', confirmPassword: '' },
      modules: {
        attendance: true,
        gps: true,
        regularization: true,
        leave: false,
        shift: false,
        payroll: false,
        expense: false,
        asset: false,
        performance: false,
        recruitment: false,
      },
    });
    this.wizard.controls.admin.enable();
    this.wizardOpen.set(true);
    this.closeView();
  }

  modulesDrawerOpen = signal(false);
  activeModules = signal<Record<string, boolean>>({});
  isSavingModules = signal(false);

  startEdit(c: Company): void {
    this.isEditMode.set(true);
    this.editingId.set(c.id);
    this.logoPreview.set(c.companyLogoUrl || c.logoUrl || null);
    this.createdResult.set(null);
    this.step.set(1);
    this.populateWizard(c);
  }

  manageModules(c: Company): void {
    this.editingId.set(c.id);
    const modMap: Record<string, boolean> = {
      attendance: false, leave: false, shift: false, gps: c.isGpsEnabled ?? true,
      payroll: false, expense: false, asset: false, performance: false, recruitment: false, regularization: false
    };
    if (c.modules) {
      c.modules.forEach(m => {
        const key = m.module.toLowerCase();
        if (key in modMap) modMap[key] = m.isEnabled;
      });
    }
    this.activeModules.set(modMap);
    this.modulesDrawerOpen.set(true);
    this.closeView(); // Close main tenant drawer if open
  }

  toggleModule(key: string, value: boolean) {
    this.activeModules.update(m => ({ ...m, [key]: value }));
  }

  saveModules() {
    const id = this.editingId();
    if (!id) return;
    
    this.isSavingModules.set(true);
    this.api.put(`${API.companies}/${id}`, { modules: this.activeModules() }).subscribe({
      next: () => {
        this.isSavingModules.set(false);
        this.modulesDrawerOpen.set(false);
        this.toast.success('Tenant access updated successfully');
        this.load();
      },
      error: (err) => {
        this.isSavingModules.set(false);
        this.toast.error(apiError(err) || 'Failed to update access');
      }
    });
  }

  private populateWizard(c: Company): void {

    // Build modules state map
    const modMap: Record<string, boolean> = {
      attendance: false,
      gps: false,
      regularization: false,
      leave: false,
      shift: false,
      payroll: false,
      expense: false,
      asset: false,
      performance: false,
      recruitment: false,
    };
    if (c.modules) {
      c.modules.forEach(m => {
        const key = m.module.toLowerCase();
        if (key in modMap) modMap[key] = m.isEnabled;
      });
    }

    this.wizard.reset({
      company: {
        name: c.name,
        code: c.code || '',
        legalName: c.legalName || '',
        industry: c.industry || '',
        companyType: c.companyType || '',
        employeeCount: c.employeeCount || '',
        officialEmail: c.officialEmail || '',
        phone: c.phone || '',
        addressLine1: c.addressLine1 || '',
        addressLine2: c.addressLine2 || '',
        city: c.city || '',
        state: c.state || '',
        zipCode: c.zipCode || '',
        country: c.country || 'India',
        timezone: c.timezone || 'Asia/Kolkata',
        currency: c.currency || 'INR',
        taxId: c.taxId || '',
        registrationNumber: c.registrationNumber || '',
        logoUrl: c.companyLogoUrl || c.logoUrl || '',
      },
      admin: { name: 'admin', email: 'admin@domain.com', mobile: '0000000000', password: 'Password123!', confirmPassword: 'Password123!' },
      modules: modMap as any,
    });

    // In edit mode, admin credentials are not editable through company wizard
    this.wizard.controls.admin.disable();
    this.wizardOpen.set(true);
    this.closeView();
  }

  async closeWizard(): Promise<void> {
    if (this.step() === (this.isEditMode() ? 5 : 6)) {
      // On success screen, simply close
      this.wizard.markAsPristine();
      this.wizardOpen.set(false);
      return;
    }

    if (this.wizard.dirty) {
      const ok = await this.confirm.ask({
        title: this.isEditMode() ? 'Discard changes?' : 'Discard this company?',
        body: 'The details you have entered will not be saved.',
        confirmLabel: 'Discard',
        cancelLabel: 'Keep editing',
        tone: 'danger',
      });
      if (!ok) return;
    }
    this.wizard.markAsPristine();
    this.wizardOpen.set(false);
  }

  next(): void {
    if (this.step() === 1) {
      const g = this.wizard.controls.company;
      g.controls.name.markAsTouched();
      g.controls.code.markAsTouched();
      if (g.controls.name.invalid || g.controls.code.invalid) {
        this.toast.warning('Required Fields Missing', 'Please provide a valid company name and unique code.');
        return;
      }
      this.step.set(2);
    } else if (this.step() === 2) {
      const email = this.wizard.controls.company.controls.officialEmail;
      email.markAsTouched();
      if (email.invalid) {
        this.toast.warning('Invalid Email', 'Please provide a valid official email address.');
        return;
      }
      // In edit mode, jump directly to step 3 (modules), skipping admin setup
      this.step.set(3);
    } else if (this.step() === 3) {
      if (this.isEditMode()) {
        // Step 3 in edit mode is Modules -> advance to Step 4 (Review)
        this.step.set(4);
      } else {
        // Step 3 in create mode is Admin -> advance to Step 4 (Modules)
        this.wizard.controls.admin.markAllAsTouched();
        if (this.wizard.controls.admin.invalid) {
          this.toast.warning('Administrator Credentials Missing', 'Please fill all admin details and ensure passwords match (min 8 chars).');
          return;
        }
        this.step.set(4);
      }
    } else if (this.step() === 4) {
      if (this.isEditMode()) {
        // Step 4 in edit mode is Review -> Submit
        this.submit();
      } else {
        // Step 4 in create mode is Modules -> advance to Step 5 (Review)
        this.step.set(5);
      }
    } else if (this.step() === 5 && !this.isEditMode()) {
      // Step 5 in create mode is Review -> Submit
      this.submit();
    }
  }

  prev(): void {
    if (this.step() > 1) {
      this.step.update(s => s - 1);
    }
  }

  onLogoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.logoUploading.set(true);
    const companyId = this.editingId() || 'new-company';

    this.api
      .post<{ uploadUrl: string; fileKey: string; publicUrl: string }>(API.uploadsPresignedUrl, {
        purpose: 'company',
        contentType: file.type || 'image/jpeg',
        entityId: companyId,
      })
      .subscribe({
        next: res => {
          if (!res.data) {
            this.logoUploading.set(false);
            this.toast.error('Upload failed', 'Could not obtain upload URL.');
            return;
          }
          const { uploadUrl, publicUrl } = res.data;
          fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type || 'image/jpeg' },
          })
            .then(uploadRes => {
              this.logoUploading.set(false);
              if (!uploadRes.ok) throw new Error('Logo upload failed');
              const url = publicUrl || URL.createObjectURL(file);
              this.logoPreview.set(url);
              this.wizard.controls.company.patchValue({ logoUrl: url });
              this.toast.success('Logo uploaded', 'Company logo attached successfully.');
            })
            .catch(err => {
              this.logoUploading.set(false);
              this.toast.error('Logo upload failed', err.message || 'Storage upload error.');
            });
        },
        error: err => {
          this.logoUploading.set(false);
          this.toast.error('Could not get upload URL', apiError(err));
        },
      });
  }

  submit(): void {
    if (this.isEditMode()) {
      const g = this.wizard.controls.company;
      if (g.invalid) {
        g.markAllAsTouched();
        this.toast.warning('Some details are missing', 'Please fill the required company profile fields.');
        return;
      }
      this.saving.set(true);
      const id = this.editingId()!;
      const rawCompany = this.wizard.controls.company.getRawValue();
      const rawModules = this.wizard.controls.modules.getRawValue();

      const cleanModules = {
        attendance: !!rawModules.attendance,
        gps: !!rawModules.gps && !!rawModules.attendance,
        regularization: !!rawModules.regularization && !!rawModules.attendance,
        leave: false,
        shift: false,
        payroll: false,
        expense: false,
        asset: false,
        performance: false,
        recruitment: false,
      };

      const payload = {
        ...rawCompany,
        isGpsEnabled: cleanModules.gps,
        modules: cleanModules,
      };

      this.api.put<Company>(API.company(id), payload).subscribe({
        next: res => {
          this.saving.set(false);
          this.wizard.markAsPristine();
          this.createdResult.set(res.data || null);
          this.step.set(5); // Success step in edit mode
          this.toast.success('Company updated', `${rawCompany.name} details have been saved.`);
          this.load();
        },
        error: err => {
          this.saving.set(false);
          this.toast.error('Could not update company', apiError(err));
        },
      });
      return;
    }

    if (this.wizard.invalid) {
      this.wizard.markAllAsTouched();
      this.toast.warning('Some details are missing', 'Go back through the steps and fill the required fields.');
      return;
    }

    this.saving.set(true);
    const rawVal = this.wizard.getRawValue();
    const cleanModules = {
      attendance: !!rawVal.modules.attendance,
      gps: !!rawVal.modules.gps && !!rawVal.modules.attendance,
      regularization: !!rawVal.modules.regularization && !!rawVal.modules.attendance,
      leave: false,
      shift: false,
      payroll: false,
      expense: false,
      asset: false,
      performance: false,
      recruitment: false,
    };

    const payload = {
      ...rawVal,
      modules: cleanModules,
    };

    this.api.post<Company>(API.companies, payload).subscribe({
      next: res => {
        this.saving.set(false);
        this.wizard.markAsPristine();
        this.createdResult.set(res.data || null);
        this.step.set(6); // Success step in create mode
        this.toast.success('Company created', `${rawVal.company.name} can now sign in.`);
        this.load();
      },
      error: err => {
        this.saving.set(false);
        this.toast.error('Could not create this company', apiError(err));
      },
    });
  }

  async toggleStatus(c: Company): Promise<void> {
    const isInactive = c.status === 'INACTIVE';
    const nextStatus = isInactive ? 'ACTIVE' : 'INACTIVE';
    const actionWord = isInactive ? 'Reactivate' : 'Deactivate';

    const ok = await this.confirm.ask({
      title: `${actionWord} ${c.name}?`,
      body: isInactive
        ? 'The company and its employees will be able to log in and use the system again.'
        : 'The company and its employees will be blocked from logging in until reactivated.',
      confirmLabel: `${actionWord} company`,
      tone: isInactive ? 'default' : 'danger',
    });
    if (!ok) return;

    this.api.put(API.company(c.id), { status: nextStatus }).subscribe({
      next: () => {
        this.toast.success(`Company ${isInactive ? 'reactivated' : 'deactivated'}`, `${c.name} is now ${nextStatus.toLowerCase()}.`);
        this.load();
        if (this.viewing()?.id === c.id) {
          this.viewing.update(curr => curr ? { ...curr, status: nextStatus } : null);
        }
      },
      error: err => this.toast.error('Could not update company status', apiError(err)),
    });
  }

  manageWorkforce(c: Company): void {
    this.closeView();
    this.closeWizard();
    this.router.navigate(['/people'], { queryParams: { companyId: c.id } });
  }

  async remove(c: Company): Promise<void> {
    if (this.isMasterCompany(c)) {
      this.toast.error('Action Forbidden', 'The master platform company (NetroTrack) cannot be deleted.');
      return;
    }

    const ok = await this.confirm.ask({
      title: `Delete ${c.name}?`,
      body: 'Are you sure you want to soft delete this tenant? All associated workforce accounts and branches will be affected.',
      confirmLabel: 'Delete company',
      tone: 'danger',
      facts: [
        { label: 'Code', value: c.code || '—' },
        { label: 'People', value: String(c._count?.users ?? c.userCount ?? '0') },
        { label: 'Branches', value: String(c._count?.branches ?? '0') },
      ],
    });
    if (!ok) return;

    this.api.delete(API.company(c.id)).subscribe({
      next: () => {
        this.toast.success('Company removed', `${c.name} has been soft deleted.`);
        this.closeView();
        this.load();
      },
      error: err => this.toast.error('Could not delete this company', apiError(err)),
    });
  }

  headcount(c: Company): string {
    const n = c._count?.users ?? c.userCount;
    return n == null ? '—' : String(n);
  }

  place(c: Company): string {
    return [c.city, c.state, c.country].filter(part => !!part).join(', ') || '—';
  }
}
