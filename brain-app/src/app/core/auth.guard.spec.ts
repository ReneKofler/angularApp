import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';
import { authGuard, guestGuard } from './auth.guard';

describe('authentication guards', () => {
  it('redirects unauthenticated users after asynchronous initialization', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            initialized: Promise.resolve(),
            configured: () => true,
            authenticated: () => false,
          },
        },
      ],
    });
    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/settings' } as RouterStateSnapshot),
    );

    expect(result).toBeInstanceOf(UrlTree);
    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
      '/login?redirect=%2Fsettings',
    );
  });

  it('redirects authenticated users away from the guest-only login route', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { initialized: Promise.resolve(), authenticated: () => true },
        },
      ],
    });
    const result = await TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));

    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe('/');
  });
});
