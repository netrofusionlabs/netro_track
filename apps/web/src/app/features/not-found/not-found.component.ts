import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { NetroState } from '../../ui/primitives';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, NetroState],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page">
      <netro-state
        icon="radar"
        title="That page isn't part of NetroTrack"
        [body]="'Nothing is mapped to ' + path + '. It may have moved during the redesign, or the link may be mistyped.'"
      >
        <a class="btn btn--primary" routerLink="/dashboard">Go to Dashboard</a>
        <button type="button" class="btn btn--default" (click)="back()">Go back</button>
      </netro-state>
    </div>
  `,
})
export class NotFoundComponent {
  private readonly router = inject(Router);
  readonly path = this.router.url;

  back(): void {
    history.length > 1 ? history.back() : this.router.navigateByUrl('/dashboard');
  }
}
