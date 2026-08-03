import { inject, Injectable } from '@angular/core';
import { AuthService } from '../core/auth.service';
export interface FlashcardCategory {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}
export interface Flashcard {
  id: string;
  category_id: string;
  user_id: string;
  title: string;
  front: string;
  back: string;
  created_at: string;
  updated_at: string;
}
@Injectable({ providedIn: 'root' })
export class FlashcardsService {
  private auth = inject(AuthService);
  private client() {
    if (!this.auth.supabase) throw new Error('Supabase ist nicht konfiguriert.');
    return this.auth.supabase;
  }
  private uid() {
    const id = this.auth.session()?.user.id;
    if (!id) throw new Error('Bitte zuerst anmelden.');
    return id;
  }
  async load() {
    const u = this.uid(),
      c = this.client(),
      [a, b] = await Promise.all([
        c.from('flashcard_categories').select('*').eq('user_id', u).order('created_at'),
        c.from('flashcards').select('*').eq('user_id', u).order('created_at', { ascending: false }),
      ]);
    if (a.error) throw a.error;
    if (b.error) throw b.error;
    return {
      categories: (a.data ?? []) as FlashcardCategory[],
      cards: (b.data ?? []) as Flashcard[],
    };
  }
  async saveCategory(name: string, id?: string) {
    const data = { name, user_id: this.uid(), updated_at: new Date().toISOString() },
      r = id
        ? await this.client()
            .from('flashcard_categories')
            .update(data)
            .eq('id', id)
            .eq('user_id', this.uid())
        : await this.client().from('flashcard_categories').insert(data);
    if (r.error) throw r.error;
  }
  async removeCategory(id: string) {
    const used = await this.client()
      .from('flashcards')
      .select('id')
      .eq('category_id', id)
      .eq('user_id', this.uid())
      .limit(1);
    if (used.error) throw used.error;
    if (used.data?.length) throw new Error('Kategorie enthält noch Karten. Lösche diese zuerst.');
    const r = await this.client()
      .from('flashcard_categories')
      .delete()
      .eq('id', id)
      .eq('user_id', this.uid());
    if (r.error) throw r.error;
  }
  async saveCard(value: Partial<Flashcard>, id?: string) {
    const data = { ...value, user_id: this.uid(), updated_at: new Date().toISOString() },
      r = id
        ? await this.client().from('flashcards').update(data).eq('id', id).eq('user_id', this.uid())
        : await this.client().from('flashcards').insert(data);
    if (r.error) throw r.error;
  }
  async removeCard(id: string) {
    const r = await this.client()
      .from('flashcards')
      .delete()
      .eq('id', id)
      .eq('user_id', this.uid());
    if (r.error) throw r.error;
  }
}
