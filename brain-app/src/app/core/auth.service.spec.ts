import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Session, SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { SUPABASE_CLIENT } from './supabase-client';

const session = { access_token: 'public-test-token', user: { id: 'user-1' } } as Session;

describe('AuthService', () => {
  const getSession = vi.fn();
  const signInWithPassword = vi.fn();
  const signOut = vi.fn();
  const onAuthStateChange = vi.fn(
    (_callback: (event: 'SIGNED_OUT', session: Session | null) => void) => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
  );

  beforeEach(() => {
    vi.clearAllMocks();
    getSession.mockResolvedValue({ data: { session: null }, error: null });
    signInWithPassword.mockResolvedValue({ data: { session }, error: null });
    signOut.mockResolvedValue({ error: null });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: SUPABASE_CLIENT,
          useValue: {
            auth: { getSession, signInWithPassword, signOut, onAuthStateChange },
          } as unknown as SupabaseClient,
        },
      ],
    });
  });

  it('waits for and restores the persisted session', async () => {
    getSession.mockResolvedValue({ data: { session }, error: null });
    const auth = TestBed.inject(AuthService);

    await auth.initialized;

    expect(auth.loading()).toBe(false);
    expect(auth.session()).toBe(session);
    expect(auth.authenticated()).toBe(true);
  });

  it('signs in and preserves a safe redirect', async () => {
    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    await auth.initialized;

    const error = await auth.signIn('person@example.com', 'password', '/notes');

    expect(error).toBeNull();
    expect(signInWithPassword).toHaveBeenCalledWith({
      email: 'person@example.com',
      password: 'password',
    });
    expect(router.navigateByUrl).toHaveBeenCalledWith('/notes');
  });

  it('prevents external post-login redirects', async () => {
    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    await auth.initialized;

    await auth.signIn('person@example.com', 'password', '//malicious.example');

    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('returns invalid-login errors without redirecting', async () => {
    signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    });
    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    await auth.initialized;

    const error = await auth.signIn('person@example.com', 'wrong-password');

    expect(error).toBe('Invalid login credentials');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('redirects to login when Supabase reports an expired session', async () => {
    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    await auth.initialized;
    const authChange = onAuthStateChange.mock.calls[0][0];

    authChange('SIGNED_OUT', null);

    expect(auth.session()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { reason: 'expired' },
    });
  });

  it('clears the local session when signing out', async () => {
    getSession.mockResolvedValue({ data: { session }, error: null });
    const auth = TestBed.inject(AuthService);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    await auth.initialized;

    await auth.signOut();

    expect(signOut).toHaveBeenCalledOnce();
    expect(auth.session()).toBeNull();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });
});
