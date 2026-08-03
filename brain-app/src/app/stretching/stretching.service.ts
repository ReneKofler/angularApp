import { Injectable, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';

export interface StretchRoutine {
  id: string;
  user_id: string;
  name: string;
  description: string;
  emoji: string;
  created_at?: string;
}
export interface StretchExercise {
  id: string;
  user_id: string;
  routine_id: string;
  name: string;
  emoji: string;
  duration_seconds: number;
  notes: string;
  image_url: string;
  position: number;
}

@Injectable({ providedIn: 'root' })
export class StretchingService {
  private auth = inject(AuthService);
  async load() {
    const client = this.client(),
      user = this.user();
    const [routines, exercises] = await Promise.all([
      client.from('stretching_routines').select('*').eq('user_id', user).order('created_at'),
      client.from('stretching_exercises').select('*').eq('user_id', user).order('position'),
    ]);
    if (routines.error) throw routines.error;
    if (exercises.error) throw exercises.error;
    return {
      routines: (routines.data ?? []) as StretchRoutine[],
      exercises: (exercises.data ?? []) as StretchExercise[],
    };
  }
  async saveRoutine(value: Partial<StretchRoutine>, id?: string) {
    const data = { ...value, user_id: this.user() };
    const result = id
      ? await this.client()
          .from('stretching_routines')
          .update(data)
          .eq('id', id)
          .eq('user_id', this.user())
      : await this.client().from('stretching_routines').insert(data);
    if (result.error) throw result.error;
  }
  async removeRoutine(id: string) {
    const used = await this.client()
      .from('stretching_exercises')
      .select('id')
      .eq('routine_id', id)
      .eq('user_id', this.user())
      .limit(1);
    if (used.error) throw used.error;
    if (used.data?.length) throw new Error('Die Routine enthält noch Übungen.');
    const result = await this.client()
      .from('stretching_routines')
      .delete()
      .eq('id', id)
      .eq('user_id', this.user());
    if (result.error) throw result.error;
  }
  async saveExercise(value: Partial<StretchExercise>, id?: string) {
    const data = { ...value, user_id: this.user() };
    const result = id
      ? await this.client()
          .from('stretching_exercises')
          .update(data)
          .eq('id', id)
          .eq('user_id', this.user())
      : await this.client().from('stretching_exercises').insert(data);
    if (result.error) throw result.error;
  }
  async removeExercise(id: string) {
    const result = await this.client()
      .from('stretching_exercises')
      .delete()
      .eq('id', id)
      .eq('user_id', this.user());
    if (result.error) throw result.error;
  }
  async reorder(items: StretchExercise[]) {
    for (const [position, item] of items.entries()) {
      const result = await this.client()
        .from('stretching_exercises')
        .update({ position })
        .eq('id', item.id)
        .eq('user_id', this.user());
      if (result.error) throw result.error;
    }
  }
  private client() {
    if (!this.auth.supabase) throw new Error('Supabase ist nicht konfiguriert.');
    return this.auth.supabase;
  }
  private user() {
    const id = this.auth.session()?.user.id;
    if (!id) throw new Error('Bitte zuerst anmelden.');
    return id;
  }
}
