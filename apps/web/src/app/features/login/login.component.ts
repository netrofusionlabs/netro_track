import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { ApiService, apiError, fieldErrors } from '../../core/services/api.service';
import { safeReturnPath } from '../../core/utils/token';
import { NetroIcon } from '../../ui/icon';
import { NetroBrandmark } from '../shell/brandmark.component';
import { NetroAlert, NetroBadge } from '../../ui/primitives';
import { NetroSegmented } from '../../ui/patterns';
import { NetroDrawer } from '../../ui/overlays';
import { API } from '../../core/models/endpoints';
import { DemoTenant, DemoUser, DemoUsersResponse } from '../../core/models/domain';

type Method = 'password' | 'mpin';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [NgIf, NgFor, ReactiveFormsModule, NetroIcon, NetroBrandmark, NetroAlert, NetroBadge, NetroSegmented, NetroDrawer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);

  readonly method = signal<Method>('password');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly serverErrors = signal<Record<string, string>>({});
  readonly expired = signal(false);
  readonly showSecret = signal(false);
  readonly legalModal = signal<'terms' | 'privacy' | null>(null);

  // Demo accounts directory state
  readonly demoTenants = signal<DemoTenant[]>([]);
  readonly selectedTenantCode = signal<string>('NETRO');
  readonly demoDrawerOpen = signal<boolean>(false);
  readonly loadingDemoUsers = signal<boolean>(false);

  readonly selectedTenant = computed<DemoTenant | null>(() => {
    const list = this.demoTenants();
    return list.find(t => t.companyCode === this.selectedTenantCode()) || list[0] || null;
  });

  readonly methods = [
    { value: 'password', label: 'Password' },
    { value: 'mpin', label: 'MPIN' },
  ];

  readonly form = this.fb.nonNullable.group({
    loginId: ['', Validators.required],
    password: ['', Validators.required],
    mpin: [''],
  });

  constructor() {
    const params = this.route.snapshot.queryParamMap;
    const expired =
      params.get('reason') === 'expired' || sessionStorage.getItem('netro.needSignIn') === 'expired';
    this.expired.set(expired);
    sessionStorage.removeItem('netro.needSignIn');

    const remembered = this.api.lastLoginId();
    if (remembered) this.form.patchValue({ loginId: remembered });

    if (this.api.isAuthenticated()) {
      this.router.navigateByUrl(safeReturnPath(params.get('next')));
    }

    this.loadDemoUsers();
  }

  private loadDemoUsers(): void {
    this.loadingDemoUsers.set(true);
    this.api.get<DemoUsersResponse>(API.demoUsers).subscribe({
      next: res => {
        this.loadingDemoUsers.set(false);
        const data = res.data;
        if (data && Array.isArray(data.tenants)) {
          this.demoTenants.set(data.tenants);
          if (data.tenants.length > 0 && !data.tenants.some(t => t.companyCode === this.selectedTenantCode())) {
            this.selectedTenantCode.set(data.tenants[0].companyCode);
          }
        }
      },
      error: () => {
        this.loadingDemoUsers.set(false);
      },
    });
  }

  setTenant(code: string): void {
    this.selectedTenantCode.set(code);
  }

  selectDemoUser(user: DemoUser, autoSubmit = false): void {
    this.fill(user.loginId, user.defaultPassword || 'Password123!', user.defaultMpin || '9999');
    this.demoDrawerOpen.set(false);
    if (autoSubmit) {
      this.submit();
    }
  }

  setMethod(value: string): void {
    const method = value as Method;
    this.method.set(method);
    this.error.set(null);
    this.serverErrors.set({});
    if (method === 'password') {
      this.form.controls.password.setValidators([Validators.required]);
      this.form.controls.mpin.clearValidators();
    } else {
      this.form.controls.mpin.setValidators([Validators.required, Validators.pattern(/^\d{4,6}$/)]);
      this.form.controls.password.clearValidators();
    }
    this.form.controls.password.updateValueAndValidity();
    this.form.controls.mpin.updateValueAndValidity();
  }

  fill(loginId: string, secret: string, mpin = '9999'): void {
    if (this.method() === 'password') this.form.patchValue({ loginId, password: secret });
    else this.form.patchValue({ loginId, mpin });
    this.error.set(null);
    this.serverErrors.set({});
  }

  toggleSecret(): void {
    this.showSecret.update(v => !v);
  }

  openLegal(doc: 'terms' | 'privacy'): void {
    this.legalModal.set(doc);
  }

  closeLegal(): void {
    this.legalModal.set(null);
  }

  errorFor(control: keyof typeof this.form.controls): string | null {
    const server = this.serverErrors()[control as string];
    if (server) return server;
    const field = this.form.controls[control];
    if (!field.touched || field.valid) return null;
    if (field.hasError('required')) return 'This is required.';
    if (field.hasError('pattern')) return 'Enter a 4–6 digit numeric MPIN.';
    return 'Check this value.';
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.serverErrors.set({});
    const { loginId, password, mpin } = this.form.getRawValue();
    const deviceId = this.api.deviceId();
    const request$ =
      this.method() === 'password'
        ? this.api.login({ loginId: loginId.trim(), password, deviceId })
        : this.api.mpinLogin({ loginId: loginId.trim(), mpin, deviceId });

    request$.subscribe({
      next: res => {
        this.loading.set(false);
        if (res.success) {
          const next = safeReturnPath(this.route.snapshot.queryParamMap.get('next'));
          this.router.navigateByUrl(next);
        } else {
          this.error.set(res.message || 'Sign-in failed.');
        }
      },
      error: err => {
        this.loading.set(false);
        this.serverErrors.set(fieldErrors(err));
        this.error.set(apiError(err, 'Could not reach NetroTrack. Check that the API is running.'));
      },
    });
  }
}

