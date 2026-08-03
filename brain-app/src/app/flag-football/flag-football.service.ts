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
      u = this.user(),
      tables = [
        'flag_football_formations',
        'flag_football_routes',
        'flag_football_plays',
        'flag_football_playbook',
      ];
    const results = await Promise.all(
      tables.map((t) =>
        c
          .from(t)
          .select('*')
          .eq('user_id', u)
          .order(t.endsWith('playbook') ? 'position' : 'created_at'),
      ),
    );
    const error = results.find((x) => x.error)?.error;
    if (error) throw error;
    return {
      formations: (results[0].data ?? []) as Formation[],
      routes: (results[1].data ?? []) as Route[],
      plays: (results[2].data ?? []) as Play[],
      playbook: (results[3].data ?? []) as PlaybookEntry[],
    };
  }
  async save(table: string, value: object, id?: string) {
    const data = { ...value, user_id: this.user() },
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
        .select('assignments')
        .eq('user_id', this.user());
      if (plays.error) throw plays.error;
      if (
        (plays.data ?? []).some((p: { assignments?: Assignment[] }) =>
          p.assignments?.some((a) => a.route_id === id),
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
        .update({ position })
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
