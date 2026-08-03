import { Injectable, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';
export interface Dance {
  id: string;
  user_id: string;
  name: string;
  song: string;
  artist: string;
  youtube_url: string;
  counts: number;
  walls: number;
  difficulty: string;
  notes: string;
  created_at?: string;
}
export interface DanceStep {
  id: string;
  user_id: string;
  dance_id: string;
  position: number;
  counts: string;
  instruction: string;
  foot: string;
  annotation: string;
}
@Injectable({ providedIn: 'root' })
export class LinedanceService {
  private auth = inject(AuthService);
  async load() {
    const c = this.client(),
      u = this.user();
    const [dances, steps] = await Promise.all([
      c
        .from('linedance_dances')
        .select('*')
        .eq('user_id', u)
        .order('created_at', { ascending: false }),
      c.from('linedance_steps').select('*').eq('user_id', u).order('position'),
    ]);
    if (dances.error) throw dances.error;
    if (steps.error) throw steps.error;
    return { dances: (dances.data ?? []) as Dance[], steps: (steps.data ?? []) as DanceStep[] };
  }
  async saveDance(value: Partial<Dance>, id?: string) {
    const data = { ...value, user_id: this.user() },
      r = id
        ? await this.client()
            .from('linedance_dances')
            .update(data)
            .eq('id', id)
            .eq('user_id', this.user())
        : await this.client().from('linedance_dances').insert(data);
    if (r.error) throw r.error;
  }
  async deleteDance(id: string) {
    const r = await this.client()
      .from('linedance_dances')
      .delete()
      .eq('id', id)
      .eq('user_id', this.user());
    if (r.error) throw r.error;
  }
  async saveStep(value: Partial<DanceStep>, id?: string) {
    const data = { ...value, user_id: this.user() },
      r = id
        ? await this.client()
            .from('linedance_steps')
            .update(data)
            .eq('id', id)
            .eq('user_id', this.user())
        : await this.client().from('linedance_steps').insert(data);
    if (r.error) throw r.error;
  }
  async deleteStep(id: string) {
    const r = await this.client()
      .from('linedance_steps')
      .delete()
      .eq('id', id)
      .eq('user_id', this.user());
    if (r.error) throw r.error;
  }
  async reorder(items: DanceStep[]) {
    for (const [position, item] of items.entries()) {
      const r = await this.client()
        .from('linedance_steps')
        .update({ position })
        .eq('id', item.id)
        .eq('user_id', this.user());
      if (r.error) throw r.error;
    }
  }
  safeYoutube(url: string) {
    if (!url.trim()) return '';
    try {
      const parsed = new URL(url);
      if (!['youtube.com', 'www.youtube.com', 'youtu.be'].includes(parsed.hostname))
        throw new Error();
      return parsed.toString();
    } catch {
      throw new Error('Bitte eine gültige YouTube-URL eingeben.');
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
