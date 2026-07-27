import { Injectable, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';

export interface DietMeal {
  id: string; user_id: string; name: string; meal_date: string;
  kcal: number; protein_g: number; fat_g: number; carbs_g: number; fiber_g: number; salt_g: number;
  created_at?: string;
}
export interface DietGoals {
  calorie_goal: number; protein_goal_g: number; fat_goal_g: number;
  carbs_goal_g: number; fiber_goal_g: number; salt_goal_g: number;
}
export interface DietHistory extends DietGoals {
  id: string; user_id: string; changed_at: string;
}
export type MealDraft = Omit<DietMeal, 'id' | 'user_id' | 'created_at'>;
export const DEFAULT_DIET_GOALS: DietGoals = {
  calorie_goal: 2000, protein_goal_g: 150, fat_goal_g: 70,
  carbs_goal_g: 200, fiber_goal_g: 30, salt_goal_g: 6,
};

@Injectable({ providedIn: 'root' })
export class NutritionService {
  private readonly auth = inject(AuthService);

  async load(date: string): Promise<{ meals: DietMeal[]; settings: DietGoals; history: DietHistory[] }> {
    const client = this.client();
    const [meals, settings, history] = await Promise.all([
      client.from('diet_meals').select('*').eq('meal_date', date).order('created_at'),
      client.from('diet_settings').select('*').maybeSingle(),
      client.from('diet_settings_history').select('*').order('changed_at', { ascending: false }),
    ]);
    if (meals.error) throw meals.error;
    if (settings.error) throw settings.error;
    if (history.error) throw history.error;
    return {
      meals: (meals.data ?? []) as DietMeal[],
      settings: settings.data ? this.goals(settings.data as Record<string, number>) : DEFAULT_DIET_GOALS,
      history: (history.data ?? []) as DietHistory[],
    };
  }

  async saveMeal(draft: MealDraft, id?: string): Promise<DietMeal> {
    const client = this.client();
    const userId = this.userId();
    const query = id
      ? client.from('diet_meals').update(draft).eq('id', id).eq('user_id', userId)
      : client.from('diet_meals').insert({ ...draft, user_id: userId });
    const result = await query.select().single();
    if (result.error) throw result.error;
    return result.data as DietMeal;
  }

  async deleteMeal(id: string): Promise<void> {
    const result = await this.client().from('diet_meals').delete().eq('id', id).eq('user_id', this.userId());
    if (result.error) throw result.error;
  }

  async saveGoals(goals: DietGoals): Promise<DietGoals> {
    const client = this.client();
    const snapshot = { ...goals, user_id: this.userId() };
    const history = await client.from('diet_settings_history').insert(snapshot);
    if (history.error) throw history.error;
    const settings = await client.from('diet_settings').upsert(snapshot, { onConflict: 'user_id' });
    if (settings.error) throw settings.error;
    return goals;
  }

  private goals(value: Record<string, number>): DietGoals {
    return {
      calorie_goal: Number(value['calorie_goal']), protein_goal_g: Number(value['protein_goal_g']),
      fat_goal_g: Number(value['fat_goal_g']), carbs_goal_g: Number(value['carbs_goal_g']),
      fiber_goal_g: Number(value['fiber_goal_g']), salt_goal_g: Number(value['salt_goal_g']),
    };
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
