import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { AuthService } from '../core/auth.service';
import { SUPABASE_CLIENT } from '../core/supabase-client';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface UserPreferences {
  displayName: string;
  theme: ThemePreference;
  bodyVisible: boolean;
  heightCm: number | null;
}

const defaults: UserPreferences = {
  displayName: '',
  theme: 'system',
  bodyVisible: true,
  heightCm: null,
};

@Injectable({ providedIn: 'root' })
export class UserSettingsService {
  private readonly client = inject(SUPABASE_CLIENT);
  private readonly auth = inject(AuthService);
  private readonly document = inject(DOCUMENT);

  readonly preferences = signal<UserPreferences>(defaults);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');

  async load(): Promise<void> {
    const userId = this.auth.session()?.user.id;
    if (!this.client || !userId) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const [profileResult, settingsResult] = await Promise.all([
        this.client.from('profiles').select('*').eq('id', userId).maybeSingle(),
        this.client.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
      ]);
      const error = profileResult.error ?? settingsResult.error;
      if (error) throw error;
      const profile = profileResult.data as Record<string, unknown> | null;
      const settings = settingsResult.data as Record<string, unknown> | null;
      const next: UserPreferences = {
        displayName: String(profile?.['display_name'] ?? ''),
        theme: this.asTheme(settings?.['theme']),
        bodyVisible: settings?.['body_visible'] !== false,
        heightCm: this.asHeight(settings?.['height_cm']),
      };
      this.preferences.set(next);
      this.applyTheme(next.theme);
    } catch (error) {
      this.error.set(this.message(error, 'Could not load your settings.'));
    } finally {
      this.loading.set(false);
    }
  }

  async save(preferences: UserPreferences): Promise<boolean> {
    const userId = this.auth.session()?.user.id;
    if (!this.client || !userId) return false;
    this.saving.set(true);
    this.error.set('');
    try {
      const [profileResult, settingsResult] = await Promise.all([
        this.client
          .from('profiles')
          .upsert({ id: userId, display_name: preferences.displayName }, { onConflict: 'id' }),
        this.client.from('user_settings').upsert(
          {
            user_id: userId,
            theme: preferences.theme,
            body_visible: preferences.bodyVisible,
            height_cm: preferences.heightCm,
          },
          { onConflict: 'user_id' },
        ),
      ]);
      const error = profileResult.error ?? settingsResult.error;
      if (error) throw error;
      this.preferences.set(preferences);
      this.applyTheme(preferences.theme);
      return true;
    } catch (error) {
      this.error.set(this.message(error, 'Could not save your settings.'));
      return false;
    } finally {
      this.saving.set(false);
    }
  }

  async syncPushSubscription(): Promise<void> {
    const userId = this.auth.session()?.user.id;
    if (!this.client || !userId || !('serviceWorker' in navigator)) return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;
    const serialized = subscription.toJSON();
    const { error } = await this.client.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: serialized.endpoint,
        p256dh: serialized.keys?.['p256dh'],
        auth: serialized.keys?.['auth'],
      },
      { onConflict: 'user_id,endpoint' },
    );
    if (error) this.error.set(error.message);
  }

  applyTheme(theme: ThemePreference): void {
    const resolved =
      theme === 'system'
        ? globalThis.matchMedia?.('(prefers-color-scheme: dark)').matches
          ? 'dark'
          : 'light'
        : theme;
    this.document.documentElement.dataset['theme'] = resolved;
    localStorage.setItem('brainapp-theme', theme);
  }

  private asTheme(value: unknown): ThemePreference {
    return value === 'light' || value === 'dark' ? value : 'system';
  }

  private asHeight(value: unknown): number | null {
    const height = Number(value);
    return Number.isFinite(height) && height >= 50 && height <= 260 ? height : null;
  }

  private message(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}
