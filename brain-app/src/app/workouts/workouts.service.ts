import { Injectable, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';

export interface SportCapabilities {
  distance: boolean; duration: boolean; heartRate: boolean;
  elevation: boolean; reps: boolean; stationary: boolean;
}
export interface SportType {
  id: string; user_id: string; name: string; unit: 'km' | 'mi';
  capabilities: SportCapabilities; created_at?: string;
}
export interface Workout {
  id: string; user_id: string; sport_type_id: string | null; sport_name: string;
  performed_at: string; distance: number | null; duration_minutes: number | null;
  average_heart_rate: number | null; elevation_gain: number | null; reps: number | null;
  stationary: boolean; notes: string; created_at?: string;
}
export interface WorkoutStat {
  id: string; user_id: string; workout_id: string; key: string; value: number; unit: string;
}
export interface PersonalRecord {
  id: string; user_id: string; sport_type_id: string | null; sport_name: string;
  metric: string; value: number; unit: string; achieved_at: string; workout_id: string | null;
}
export type WorkoutDraft = Omit<Workout, 'id' | 'user_id' | 'created_at'>;
export type SportTypeDraft = Pick<SportType, 'name' | 'unit' | 'capabilities'>;
export type PersonalRecordDraft = Omit<PersonalRecord, 'id' | 'user_id'>;

@Injectable({ providedIn: 'root' })
export class WorkoutsService {
  private readonly auth = inject(AuthService);

  async load(): Promise<{ workouts: Workout[]; sportTypes: SportType[]; stats: WorkoutStat[]; records: PersonalRecord[] }> {
    const client = this.client();
    const [workouts, sportTypes, stats, records] = await Promise.all([
      client.from('workouts').select('*').order('performed_at', { ascending: false }),
      client.from('custom_sport_types').select('*').order('name'),
      client.from('workout_stats').select('*'),
      client.from('personal_records').select('*').order('achieved_at', { ascending: false }),
    ]);
    for (const result of [workouts, sportTypes, stats, records]) if (result.error) throw result.error;
    return {
      workouts: (workouts.data ?? []) as Workout[],
      sportTypes: (sportTypes.data ?? []).map((sport) => this.normalizeSport(sport)),
      stats: (stats.data ?? []) as WorkoutStat[],
      records: (records.data ?? []) as PersonalRecord[],
    };
  }
  async saveWorkout(draft: WorkoutDraft, id?: string): Promise<Workout> {
    const client = this.client(); const userId = this.userId();
    const query = id
      ? client.from('workouts').update(draft).eq('id', id).eq('user_id', userId)
      : client.from('workouts').insert({ ...draft, user_id: userId });
    const { data, error } = await query.select().single(); if (error) throw error; return data as Workout;
  }
  async deleteWorkout(id: string): Promise<void> {
    const client = this.client(); const userId = this.userId();
    const { error: statsError } = await client.from('workout_stats').delete().eq('workout_id', id).eq('user_id', userId);
    if (statsError) throw statsError;
    const { error } = await client.from('workouts').delete().eq('id', id).eq('user_id', userId); if (error) throw error;
  }
  async saveSportType(draft: SportTypeDraft): Promise<SportType> {
    const { data, error } = await this.client().from('custom_sport_types')
      .insert({ ...draft, user_id: this.userId() }).select().single();
    if (error) throw error; return this.normalizeSport(data);
  }
  async deleteSportType(id: string): Promise<void> {
    const userId = this.userId();
    const { count, error: useError } = await this.client().from('workouts')
      .select('id', { count: 'exact', head: true }).eq('sport_type_id', id).eq('user_id', userId);
    if (useError) throw useError;
    if (count) throw new Error('This sport type is used by workouts and cannot be deleted.');
    const { error } = await this.client().from('custom_sport_types').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  }
  async saveRecord(draft: PersonalRecordDraft): Promise<PersonalRecord> {
    const { data, error } = await this.client().from('personal_records')
      .insert({ ...draft, user_id: this.userId() }).select().single();
    if (error) throw error; return data as PersonalRecord;
  }
  async deleteRecord(id: string): Promise<void> {
    const { error } = await this.client().from('personal_records').delete().eq('id', id).eq('user_id', this.userId());
    if (error) throw error;
  }
  private normalizeSport(value: Record<string, unknown>): SportType {
    const fallback: SportCapabilities = { distance: true, duration: true, heartRate: false, elevation: false, reps: false, stationary: false };
    return { ...value, capabilities: { ...fallback, ...((value['capabilities'] as object | null) ?? {}) } } as unknown as SportType;
  }
  private client() {
    const client = this.auth.supabase; if (!client) throw new Error('Supabase is not configured.'); return client;
  }
  private userId(): string {
    const id = this.auth.session()?.user.id; if (!id) throw new Error('Sign in to manage workouts.'); return id;
  }
}
