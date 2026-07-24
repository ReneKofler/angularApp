import { Injectable, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';

export interface Equipment {
  id: string;
  user_id: string;
  name: string;
  icon: string | null;
}

export interface Exercise {
  id: string;
  user_id: string | null;
  name: string;
  equipment_ids: string[];
  muscle_group_ids: string[];
  has_1rm: boolean;
  has_max_reps: boolean;
  has_kg: boolean;
  has_meter: boolean;
  has_reps: boolean;
  has_calories: boolean;
  has_time: boolean;
}

export interface PlanExercise {
  exercise_id: string;
  name: string;
  sets?: number;
  reps?: number;
  kg?: number;
  meters?: number;
  calories?: number;
  duration?: string;
}

export interface TrainingPlan {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  exercises: PlanExercise[];
  duration_estimate: string | null;
}

type EquipmentDraft = Pick<Equipment, 'name' | 'icon'>;
type ExerciseDraft = Omit<Exercise, 'id' | 'user_id'>;
type TrainingPlanDraft = Omit<TrainingPlan, 'id' | 'user_id'>;

@Injectable({ providedIn: 'root' })
export class TrainingService {
  private readonly auth = inject(AuthService);

  async load(): Promise<{
    equipment: Equipment[];
    exercises: Exercise[];
    plans: TrainingPlan[];
  }> {
    const client = this.client();
    const [equipment, exercises, plans] = await Promise.all([
      client.from('equipment').select('*').order('name'),
      client.from('exercises').select('*').order('name'),
      client.from('training_plans').select('*').order('name'),
    ]);
    if (equipment.error) throw equipment.error;
    if (exercises.error) throw exercises.error;
    if (plans.error) throw plans.error;
    return {
      equipment: (equipment.data ?? []) as Equipment[],
      exercises: (exercises.data ?? []) as Exercise[],
      plans: (plans.data ?? []) as TrainingPlan[],
    };
  }

  async saveEquipment(draft: EquipmentDraft, id?: string) {
    return this.saveOwned<Equipment>('equipment', draft, id);
  }

  async deleteEquipment(id: string) {
    await this.removeOwned('equipment', id);
  }

  async saveExercise(draft: ExerciseDraft, id?: string) {
    return this.saveOwned<Exercise>('exercises', draft, id);
  }

  async deleteExercise(id: string) {
    await this.removeOwned('exercises', id);
  }

  async savePlan(draft: TrainingPlanDraft, id?: string) {
    return this.saveOwned<TrainingPlan>('training_plans', draft, id);
  }

  async deletePlan(id: string) {
    await this.removeOwned('training_plans', id);
  }

  async logPlan(plan: TrainingPlan, workoutDate: string, duration: string, notes: string) {
    const { error } = await this.client()
      .from('workouts')
      .insert({
        user_id: this.userId(),
        workout_type: 'training_plan',
        workout_date: workoutDate,
        workout_name: plan.name,
        training_plan_id: plan.id,
        training_exercises: plan.exercises,
        duration: duration || null,
        notes: notes || null,
      });
    if (error) throw error;
  }

  private async saveOwned<T>(table: string, draft: object, id?: string): Promise<T> {
    const client = this.client();
    const userId = this.userId();
    const query = id
      ? client.from(table).update(draft).eq('id', id).eq('user_id', userId)
      : client.from(table).insert({ ...draft, user_id: userId });
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data as T;
  }

  private async removeOwned(table: string, id: string) {
    const { error } = await this.client()
      .from(table)
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
