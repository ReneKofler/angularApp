import { Injectable, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';

export interface GrooveDay {
  id: string;
  user_id: string;
  practice_date: string;
  started_at: string;
  sport_workout_id: string | null;
  created_at: string;
}

export interface GrooveExercise {
  id: string;
  user_id: string;
  day_id: string;
  name: string;
  reps: number;
  exercise_id: string | null;
  created_at: string;
}

export interface ExerciseOption {
  id: string;
  name: string;
}

export interface GrooveData {
  days: GrooveDay[];
  entries: GrooveExercise[];
  exercises: ExerciseOption[];
}

@Injectable({ providedIn: 'root' })
export class GreasingTheGrooveService {
  private readonly auth = inject(AuthService);

  async load(from: string, to: string): Promise<GrooveData> {
    const client = this.client();
    const [days, exercises] = await Promise.all([
      client
        .from('greasing_the_groove_days')
        .select('*')
        .gte('practice_date', from)
        .lte('practice_date', to)
        .order('practice_date', { ascending: false }),
      client.from('exercises').select('id,name').order('name'),
    ]);
    if (days.error) throw days.error;
    if (exercises.error) throw exercises.error;

    const loadedDays = (days.data ?? []) as GrooveDay[];
    if (!loadedDays.length) {
      return { days: [], entries: [], exercises: (exercises.data ?? []) as ExerciseOption[] };
    }

    const entries = await client
      .from('greasing_the_groove_exercises')
      .select('*')
      .in(
        'day_id',
        loadedDays.map((day) => day.id),
      )
      .order('created_at');
    if (entries.error) throw entries.error;
    return {
      days: loadedDays,
      entries: (entries.data ?? []) as GrooveExercise[],
      exercises: (exercises.data ?? []) as ExerciseOption[],
    };
  }

  async startDay(practiceDate: string): Promise<GrooveDay> {
    const client = this.client();
    const userId = this.userId();
    const existing = await client
      .from('greasing_the_groove_days')
      .select('*')
      .eq('user_id', userId)
      .eq('practice_date', practiceDate)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) return existing.data as GrooveDay;

    const workout = await client
      .from('workouts')
      .insert({
        user_id: userId,
        workout_type: 'greasing_the_groove',
        workout_date: practiceDate,
        workout_name: 'Greasing the Groove',
        reps: 0,
        exercise_reps: [],
      })
      .select('id')
      .single();
    if (workout.error) throw workout.error;

    const day = await client
      .from('greasing_the_groove_days')
      .insert({
        user_id: userId,
        practice_date: practiceDate,
        sport_workout_id: workout.data.id,
      })
      .select()
      .single();
    if (day.error) {
      await client.from('workouts').delete().eq('id', workout.data.id).eq('user_id', userId);
      throw day.error;
    }
    return day.data as GrooveDay;
  }

  async addExercise(
    day: GrooveDay,
    exercise: ExerciseOption,
    dayEntries: GrooveExercise[],
  ): Promise<GrooveExercise> {
    const client = this.client();
    const existing = await client
      .from('greasing_the_groove_exercises')
      .select('id')
      .eq('day_id', day.id)
      .eq('exercise_id', exercise.id)
      .maybeSingle();
    if (existing.error) throw existing.error;
    if (existing.data) throw new Error('Diese Übung ist für den Tag bereits ausgewählt.');

    const result = await client
      .from('greasing_the_groove_exercises')
      .insert({
        user_id: this.userId(),
        day_id: day.id,
        exercise_id: exercise.id,
        name: exercise.name,
        reps: 0,
      })
      .select()
      .single();
    if (result.error) throw result.error;
    const entry = result.data as GrooveExercise;
    await this.syncWorkout(day, [...dayEntries, entry]);
    return entry;
  }

  async setReps(
    day: GrooveDay,
    entry: GrooveExercise,
    reps: number,
    dayEntries: GrooveExercise[],
  ): Promise<GrooveExercise> {
    const safeReps = Math.max(0, Math.trunc(reps));
    const result = await this.client()
      .from('greasing_the_groove_exercises')
      .update({ reps: safeReps })
      .eq('id', entry.id)
      .eq('day_id', day.id)
      .eq('user_id', this.userId())
      .select()
      .single();
    if (result.error) throw result.error;
    const updated = result.data as GrooveExercise;
    await this.syncWorkout(
      day,
      dayEntries.map((item) => (item.id === updated.id ? updated : item)),
    );
    return updated;
  }

  async removeExercise(
    day: GrooveDay,
    entry: GrooveExercise,
    dayEntries: GrooveExercise[],
  ): Promise<void> {
    const result = await this.client()
      .from('greasing_the_groove_exercises')
      .delete()
      .eq('id', entry.id)
      .eq('day_id', day.id)
      .eq('user_id', this.userId());
    if (result.error) throw result.error;
    await this.syncWorkout(
      day,
      dayEntries.filter((item) => item.id !== entry.id),
    );
  }

  private async syncWorkout(day: GrooveDay, entries: GrooveExercise[]): Promise<void> {
    if (!day.sport_workout_id) return;
    const exerciseReps = entries.map((entry) => ({
      exercise_id: entry.exercise_id,
      name: entry.name,
      reps: entry.reps,
    }));
    const result = await this.client()
      .from('workouts')
      .update({
        reps: exerciseReps.reduce((sum, entry) => sum + entry.reps, 0),
        exercise_reps: exerciseReps,
      })
      .eq('id', day.sport_workout_id)
      .eq('user_id', this.userId());
    if (result.error) throw result.error;
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
