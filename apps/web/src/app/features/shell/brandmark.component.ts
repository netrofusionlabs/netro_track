import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgIf } from '@angular/common';

/**
 * The NetroTrack mark: a signal trace crossing a tracked position. It reads as
 * the product thesis — presence plus movement — rather than as a generic
 * abstract logo, and it is drawn rather than imported so it inherits theme
 * colour and stays crisp at every size.
 */
@Component({
  selector: 'netro-brandmark',
  standalone: true,
  imports: [NgIf],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="brand" [style.--mark]="size() + 'px'">
      <img
        src="images/appIconClean.png"
        class="brand__icon"
        [style.width.px]="size()"
        [style.height.px]="size()"
        alt="NetroTrack"
      />
      <span class="brand__word" *ngIf="showWord()">
        Netro<span class="brand__word-accent">Track</span>
      </span>
    </span>
  `,
  styles: [
    `
      :host { display: inline-flex; }
      .brand { display: inline-flex; align-items: center; gap: 10px; min-width: 0; }
      .brand__icon {
        flex: none;
        display: block;
        border-radius: 6px;
        object-fit: contain;
      }
      .brand__word {
        font: 700 16px/1 var(--font-sans);
        letter-spacing: -0.028em;
        color: var(--fg);
        white-space: nowrap;
      }
      .brand__word-accent { color: var(--accent); }
    `,
  ],
})
export class NetroBrandmark {
  readonly size = input(26);
  readonly showWord = input(true);
}
