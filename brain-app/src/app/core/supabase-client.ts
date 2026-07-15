import { InjectionToken } from '@angular/core';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

export const SUPABASE_CLIENT = new InjectionToken<SupabaseClient | null>('Supabase client', {
  providedIn: 'root',
  factory: () =>
    environment.supabaseUrl && environment.supabaseAnonKey
      ? createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
          auth: {
            autoRefreshToken: true,
            detectSessionInUrl: true,
            persistSession: true,
          },
        })
      : null,
});
