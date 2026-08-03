import { Injectable, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';

export interface Recipe {
  id: string; user_id: string; name: string; ingredients: string; preparation: string;
  calories: number | null; protein: number | null; carbs: number | null; fat: number | null;
  fiber: number | null; salt: number | null; servings: number | null; prep_time: number | null;
  rating: number | null; image_url: string | null; meal_prep: boolean; tips: string | null;
  is_favourite: boolean; created_at?: string; updated_at?: string;
}
export type RecipeDraft = Omit<Recipe, 'id' | 'user_id' | 'created_at' | 'updated_at'>;

@Injectable({ providedIn: 'root' })
export class RecipesService {
  private readonly auth = inject(AuthService);
  async load(): Promise<Recipe[]> {
    const result = await this.client().from('recipes').select('*').order('is_favourite', { ascending: false }).order('name');
    if (result.error) throw result.error;
    return (result.data ?? []) as Recipe[];
  }
  async save(draft: RecipeDraft, id?: string): Promise<Recipe> {
    const client = this.client(); const userId = this.userId();
    const query = id
      ? client.from('recipes').update({ ...draft, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', userId)
      : client.from('recipes').insert({ ...draft, user_id: userId });
    const result = await query.select().single();
    if (result.error) throw result.error;
    return result.data as Recipe;
  }
  async toggleFavourite(recipe: Recipe): Promise<void> {
    const result = await this.client().from('recipes').update({ is_favourite: !recipe.is_favourite })
      .eq('id', recipe.id).eq('user_id', this.userId());
    if (result.error) throw result.error;
  }
  async delete(id: string): Promise<void> {
    const result = await this.client().from('recipes').delete().eq('id', id).eq('user_id', this.userId());
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
