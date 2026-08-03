import { Injectable, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';
export interface Player {
  id: string;
  label: string;
  x: number;
  y: number;
}
export interface Segment {
  x: number;
  y: number;
}
export interface Formation {
  id: string;
  user_id: string;
  name: string;
  players: Player[];
}
export interface Route {
  id: string;
  user_id: string;
  name: string;
  aliases: string[];
  segments: Segment[];
}
export interface Assignment {
  player_id: string;
  route_id: string;
}
export interface Play {
  id: string;
  user_id: string;
  name: string;
  formation_id: string;
  assignments: Assignment[];
}
export interface PlaybookEntry {
  id: string;
  user_id: string;
  play_id: string;
  position: number;
  flipped: boolean;
}
@Injectable({ providedIn: 'root' })
export class FlagFootballService {
  private auth = inject(AuthService);
  async load() {
    const c = this.client(),
      u = this.user();
    const routesResult = await c
      .from('flag_football_routes')
      .select('*')
      .eq('user_id', u)
      .order('created_at');
    if (routesResult.error) throw routesResult.error;
    const results = await Promise.all([
      c.from('flag_football_formations').select('*').eq('user_id', u).order('created_at'),
      c.from('flag_football_plays').select('*').eq('user_id', u).order('created_at'),
      c.from('flag_football_playbook').select('*').eq('user_id', u).order('number'),
    ]);
    return {
      formations: (results[0].data ?? []) as Formation[],
      routes: (routesResult.data ?? []).map((item: Record<string, unknown>) => ({
        ...item,
        aliases: item['alias'] ? [item['alias']] : [],
      })) as Route[],
      plays: (results[1].data ?? []).map((item: Record<string, unknown>) => ({
        ...item,
        assignments: item['route_assignments'] ?? [],
      })) as Play[],
      playbook: (results[2].data ?? []).map((item: Record<string, unknown>) => ({
        ...item,
        position: Number(item['number'] ?? 1) - 1,
      })) as PlaybookEntry[],
    };
  }
  async save(table: string, value: object, id?: string) {
    const translated = { ...value } as Record<string, unknown>;
    if (table === 'flag_football_routes' && 'aliases' in translated) {
      translated['alias'] = (translated['aliases'] as string[])[0] ?? '';
      delete translated['aliases'];
    }
    if (table === 'flag_football_plays' && 'assignments' in translated) {
      translated['route_assignments'] = translated['assignments'];
      delete translated['assignments'];
    }
    if (table === 'flag_football_playbook' && 'position' in translated) {
      translated['number'] = Number(translated['position']) + 1;
      delete translated['position'];
    }
    const data = { ...translated, user_id: this.user() },
      r = id
        ? await this.client().from(table).update(data).eq('id', id).eq('user_id', this.user())
        : await this.client().from(table).insert(data);
    if (r.error) throw r.error;
  }
  async remove(table: string, id: string) {
    if (table === 'flag_football_formations') {
      const used = await this.client()
        .from('flag_football_plays')
        .select('id')
        .eq('formation_id', id)
        .eq('user_id', this.user())
        .limit(1);
      if (used.error) throw used.error;
      if (used.data?.length) throw new Error('Formation wird noch in einem Play verwendet.');
    }
    if (table === 'flag_football_routes') {
      const plays = await this.client()
        .from('flag_football_plays')
        .select('route_assignments')
        .eq('user_id', this.user());
      if (plays.error) throw plays.error;
      if (
        (plays.data ?? []).some((p: { route_assignments?: Assignment[] }) =>
          p.route_assignments?.some((a) => a.route_id === id),
        )
      )
        throw new Error('Route wird noch in einem Play verwendet.');
    }
    const r = await this.client().from(table).delete().eq('id', id).eq('user_id', this.user());
    if (r.error) throw r.error;
  }
  async reorder(items: PlaybookEntry[]) {
    for (const [position, item] of items.entries()) {
      const r = await this.client()
        .from('flag_football_playbook')
        .update({ number: position + 1 })
        .eq('id', item.id)
        .eq('user_id', this.user());
      if (r.error) throw r.error;
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
