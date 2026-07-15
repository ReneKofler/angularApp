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
      const settingsResult = await this.client
        .from('user_settings')
        .select('preferences,body_fat_visible,body_height_cm')
        .eq('user_id', userId)
        .maybeSingle();
      if (settingsResult.error) throw settingsResult.error;
      const settings = settingsResult.data as Record<string, unknown> | null;
      const preferences = (settings?.['preferences'] ?? {}) as Record<string, unknown>;
      const next: UserPreferences = {
        displayName: String(preferences['displayName'] ?? ''),
        theme: this.asTheme(preferences['theme']),
        bodyVisible: settings?.['body_fat_visible'] !== false,
        heightCm: this.asHeight(settings?.['body_height_cm']),
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
      const existing = (
        await this.client
          .from('user_settings')
          .select('preferences')
          .eq('user_id', userId)
          .maybeSingle()
      ).data as { preferences?: Record<string, unknown> } | null;
      const settingsResult = await this.client.from('user_settings').upsert(
        {
          user_id: userId,
          preferences: {
            ...(existing?.preferences ?? {}),
            displayName: preferences.displayName,
            theme: preferences.theme,
          },
          body_fat_visible: preferences.bodyVisible,
          body_height_cm: preferences.heightCm,
        },
        { onConflict: 'user_id' },
      );
      if (settingsResult.error) throw settingsResult.error;
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
        email: this.auth.session()?.user.email,
        subscription: serialized,
      },
      { onConflict: 'user_id' },
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
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object' && 'message' in error) {
      return String(error.message);
    }
    return fallback;
  }
}
