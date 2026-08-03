import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { PwaUpdateService } from './pwa-update.service';

describe('PwaUpdateService', () => {
  it('announces a ready application version', () => {
    const versions = new Subject<VersionEvent>();
    TestBed.configureTestingModule({
      providers: [
        PwaUpdateService,
        {
          provide: SwUpdate,
          useValue: { isEnabled: true, versionUpdates: versions, activateUpdate: async () => true },
        },
      ],
    });
    const service = TestBed.inject(PwaUpdateService);

    versions.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old', appData: undefined },
      latestVersion: { hash: 'new', appData: undefined },
    });

    expect(service.available()).toBe(true);
  });
});
