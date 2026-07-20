import { Injectable, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  color: string;
  start_date: string;
  end_date: string | null;
  linked_workout_type: string | null;
  position: number;
  collapsed: boolean;
  sport_type: string | null;
  sport_metric_name: string | null;
  linked_training_plan_id: string | null;
}
export interface HabitCheck {
  id: string;
  habit_id: string;
  user_id: string;
  check_date: string;
  checked: boolean;
  sport_metric_value: number | null;
}
export interface HabitStreak {
  habit_id: string;
  user_id: string;
  name: string;
  total_checks: number;
  last_check: string | null;
}
export interface TrainingPlan {
  id: string;
  name: string;
}
export type HabitDraft = Omit<Habit, 'id' | 'user_id'>;

@Injectable({ providedIn: 'root' })
export class HabitsService {
  private readonly auth = inject(AuthService);

  async load(): Promise<{
    habits: Habit[];
    checks: HabitCheck[];
    streaks: HabitStreak[];
    plans: TrainingPlan[];
  }> {
    const client = this.client();
    const [habits, checks, streaks, plans] = await Promise.all([
      client
        .from('habits')
        .select('*')
        .eq('user_id', this.userId())
        .order('position')
        .order('created_at'),
      client.from('habit_checks').select('*').eq('user_id', this.userId()).order('check_date'),
      client.from('habit_streaks').select('*').eq('user_id', this.userId()),
      client.from('training_plans').select('id,name').eq('user_id', this.userId()).order('name'),
    ]);
    for (const result of [habits, checks, streaks, plans]) if (result.error) throw result.error;
    return {
      habits: (habits.data ?? []) as Habit[],
      checks: (checks.data ?? []) as HabitCheck[],
      streaks: (streaks.data ?? []) as HabitStreak[],
      plans: (plans.data ?? []) as TrainingPlan[],
    };
  }

  async saveHabit(draft: HabitDraft, id?: string): Promise<void> {
    const client = this.client();
    const userId = this.userId();
    const query = id
      ? client.from('habits').update(draft).eq('id', id).eq('user_id', userId)
      : client.from('habits').insert({ ...draft, user_id: userId });
    const { error } = await query;
    if (error) throw error;
  }

  async deleteHabit(id: string): Promise<void> {
    const { error } = await this.client()
      .from('habits')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId());
    if (error) throw error;
  }

  async setCheck(
    habitId: string,
    date: string,
    checked: boolean,
    metric: number | null,
  ): Promise<void> {
    const client = this.client();
    const userId = this.userId();
    const existing = await client
      .from('habit_checks')
      .select('id')
      .eq('habit_id', habitId)
      .eq('user_id', userId)
      .eq('check_date', date)
      .maybeSingle();
    if (existing.error) throw existing.error;
    const result = existing.data
      ? await client
          .from('habit_checks')
          .update({ checked, sport_metric_value: metric })
          .eq('id', existing.data.id)
          .eq('user_id', userId)
      : await client
          .from('habit_checks')
          .insert({
            habit_id: habitId,
            user_id: userId,
            check_date: date,
            checked,
            sport_metric_value: metric,
          });
    if (result.error) throw result.error;
  }

  private client() {
    const client = this.auth.supabase;
    if (!client) throw new Error('Supabase is not configured.');
    return client;
  }
  private userId(): string {
    const id = this.auth.session()?.user.id;
    if (!id) throw new Error('Sign in to manage habits.');
    return id;
  }
}
