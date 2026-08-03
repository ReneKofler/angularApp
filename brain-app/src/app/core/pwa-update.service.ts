import { inject, Injectable, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PwaUpdateService {
  readonly available = signal(false);
  private readonly updates = inject(SwUpdate, { optional: true });

  constructor() {
    if (!this.updates?.isEnabled) return;
    this.updates.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => this.available.set(true));
  }

  async activate(): Promise<void> {
    if (!this.updates || !(await this.updates.activateUpdate())) return;
    globalThis.location.reload();
  }
}
