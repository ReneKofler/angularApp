import { Injectable, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';

export type CrossfitType = 'for_time' | 'amrap' | 'emom' | 'tabata' | 'custom';

export interface LibraryWorkout {
  id: string;
  user_id: string | null;
  name: string;
  crossfit_type: CrossfitType;
  exercises: string[] | null;
  time_cap: number | null;
  rounds: number | null;
  work_minutes: number | null;
  rest_minutes: number | null;
  is_favourite: boolean;
  description: string | null;
  amrap_duration: number | null;
  is_hero: boolean;
  is_girl: boolean;
  is_open: boolean;
  total_reps: number | null;
  is_partner: boolean;
  crossfit_focus: string | null;
  created_at?: string;
}

export interface CrossfitLog {
  id: string;
  user_id: string;
  workout_type: 'crossfit';
  workout_date: string;
  workout_name: string | null;
  crossfit_type: CrossfitType | null;
  crossfit_description: string | null;
  description?: string | null;
  exercises: string[] | null;
  time_cap: number | null;
  rounds: number | null;
  work_minutes: number | null;
  rest_minutes: number | null;
  duration: string | null;
  result_rounds: number | null;
  total_reps: number | null;
  dnf: boolean | null;
  missing_reps: number | null;
  is_hero: boolean | null;
  is_girl: boolean | null;
  is_open: boolean | null;
  is_partner: boolean | null;
  done_alone: boolean | null;
  notes: string | null;
  created_at?: string;
}

export type LibraryDraft = Omit<LibraryWorkout, 'id' | 'user_id' | 'created_at'>;
export type CrossfitLogDraft = Omit<CrossfitLog, 'id' | 'user_id' | 'created_at'>;

@Injectable({ providedIn: 'root' })
export class CrossfitService {
  private readonly auth = inject(AuthService);

  async load(): Promise<{ library: LibraryWorkout[]; logs: CrossfitLog[] }> {
    const client = this.client();
    const [library, logs] = await Promise.all([
      client
        .from('workouts_library')
        .select('*')
        .order('is_favourite', { ascending: false })
        .order('name'),
      client
        .from('workouts')
        .select('*')
        .eq('workout_type', 'crossfit')
        .order('workout_date', { ascending: false }),
    ]);
    if (library.error) throw library.error;
    if (logs.error) throw logs.error;
    return {
      library: (library.data ?? []) as LibraryWorkout[],
      logs: (logs.data ?? []) as CrossfitLog[],
    };
  }

  async saveLibrary(draft: LibraryDraft, id?: string): Promise<LibraryWorkout> {
    const client = this.client();
    const userId = this.userId();
    const query = id
      ? client.from('workouts_library').update(draft).eq('id', id).eq('user_id', userId)
      : client.from('workouts_library').insert({ ...draft, user_id: userId });
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data as LibraryWorkout;
  }

  async toggleFavourite(workout: LibraryWorkout): Promise<void> {
    const { error } = await this.client()
      .from('workouts_library')
      .update({ is_favourite: !workout.is_favourite })
      .eq('id', workout.id)
      .eq('user_id', this.userId());
    if (error) throw error;
  }

  async deleteLibrary(id: string): Promise<void> {
    const { error } = await this.client()
      .from('workouts_library')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId());
    if (error) throw error;
  }

  async saveLog(draft: CrossfitLogDraft): Promise<CrossfitLog> {
    const { data, error } = await this.client()
      .from('workouts')
      .insert({ ...draft, user_id: this.userId() })
      .select()
      .single();
    if (error) throw error;
    return data as CrossfitLog;
  }

  async deleteLog(id: string): Promise<void> {
    const { error } = await this.client()
      .from('workouts')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId());
    if (error) throw error;
  }

  private client() {
    const client = this.auth.supabase;
    if (!client) throw new Error('Supabase ist nicht konfiguriert.');
    return client;
  }

  private userId() {
    const id = this.auth.session()?.user.id;
    if (!id) throw new Error('Bitte zuerst anmelden.');
    return id;
  }
}
