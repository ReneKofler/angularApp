import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthChangeEvent, Session } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from './supabase-client';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly client = inject(SUPABASE_CLIENT);
  private resolveInitialization!: () => void;

  readonly session = signal<Session | null>(null);
  readonly loading = signal(true);
  readonly configured = computed(() => this.client !== null);
  readonly authenticated = computed(() => this.session() !== null);
  readonly initialized = new Promise<void>((resolve) => (this.resolveInitialization = resolve));

  constructor() {
    if (!this.client) {
      this.loading.set(false);
      this.resolveInitialization();
      return;
    }
    void this.restoreSession();
    this.client.auth.onAuthStateChange((event, session) => this.handleAuthChange(event, session));
  }

  async signIn(email: string, password: string, redirectUrl = '/'): Promise<string | null> {
    if (!this.client) return 'Add your Supabase URL and anon key to the environment configuration.';
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (!error) await this.router.navigateByUrl(this.safeRedirect(redirectUrl));
    return error?.message ?? null;
  }

  async signOut(): Promise<void> {
    await this.client?.auth.signOut();
    this.session.set(null);
    await this.router.navigateByUrl('/login');
  }

  private async restoreSession(): Promise<void> {
    try {
      const { data, error } = await this.client!.auth.getSession();
      this.session.set(error ? null : data.session);
    } finally {
      this.loading.set(false);
      this.resolveInitialization();
    }
  }

  private handleAuthChange(event: AuthChangeEvent, session: Session | null): void {
    this.session.set(session);
    if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
      void this.router.navigate(['/login'], { queryParams: { reason: 'expired' } });
    }
  }

  private safeRedirect(url: string): string {
    return url.startsWith('/') && !url.startsWith('//') ? url : '/';
  }
}
