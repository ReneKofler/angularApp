import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaUpdateService } from './core/pwa-update.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <router-outlet />
    @if (updates.available()) {
      <aside class="update" role="status">
        Eine neue Version ist verfügbar.
        <button type="button" (click)="updates.activate()">Jetzt aktualisieren</button>
      </aside>
    }
  `,
  styles: `
    .update {
      position: fixed;
      right: 16px;
      bottom: 16px;
      z-index: 1000;
      padding: 12px 16px;
      border: 1px solid #526077;
      border-radius: 8px;
      background: #1e2a3b;
      color: white;
      box-shadow: 0 8px 24px #0008;
    }
    button {
      margin-left: 12px;
      border: 0;
      border-radius: 6px;
      padding: 8px 12px;
      background: #7c3aed;
      color: white;
      cursor: pointer;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly updates = inject(PwaUpdateService);
}
