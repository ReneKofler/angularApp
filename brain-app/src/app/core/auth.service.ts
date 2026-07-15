import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Session, SupabaseClient, createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly router = inject(Router);
  private readonly client: SupabaseClient | null =
    environment.supabaseUrl && environment.supabaseAnonKey
      ? createClient(environment.supabaseUrl, environment.supabaseAnonKey)
      : null;

  readonly session = signal<Session | null>(null);
  readonly loading = signal(true);
  readonly configured = computed(() => this.client !== null);
  readonly authenticated = computed(() => this.session() !== null);

  constructor() {
    if (!this.client) {
      this.loading.set(false);
      return;
    }
    void this.client.auth.getSession().then(({ data }) => {
      this.session.set(data.session);
      this.loading.set(false);
    });
    this.client.auth.onAuthStateChange((_event, session) => this.session.set(session));
  }

  async signIn(email: string, password: string): Promise<string | null> {
    if (!this.client) return 'Add your Supabase URL and anon key to the environment configuration.';
    const { error } = await this.client.auth.signInWithPassword({ email, password });
    if (!error) await this.router.navigateByUrl('/');
    return error?.message ?? null;
  }

  async signOut(): Promise<void> {
    await this.client?.auth.signOut();
    await this.router.navigateByUrl('/login');
  }
}
