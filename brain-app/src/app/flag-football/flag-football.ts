import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  Assignment,
  FlagFootballService,
  Formation,
  Play,
  PlaybookEntry,
  Route,
} from './flag-football.service';
@Component({
  selector: 'app-flag-football',
  imports: [FormsModule, RouterLink],
  templateUrl: './flag-football.html',
  styleUrl: './flag-football.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FlagFootball {
  private service = inject(FlagFootballService);
  readonly tab = signal<'formations' | 'routes' | 'plays' | 'playbook'>('routes');
  readonly formations = signal<Formation[]>([]);
  readonly routes = signal<Route[]>([]);
  readonly plays = signal<Play[]>([]);
  readonly playbook = signal<PlaybookEntry[]>([]);
  readonly error = signal('');
  readonly name = signal('');
  readonly selectedFormation = signal('');
  readonly assignments = signal<Assignment[]>([]);
  readonly routeAliases = signal('');
  readonly routePoints = signal([
    { x: 10, y: 80 },
    { x: 50, y: 20 },
  ]);
  readonly playerType = signal('WR-X');
  readonly selectedPlay = signal('');
  readonly playbookNumber = signal(1);
  readonly playbookFlipped = signal(false);
  readonly players = signal([
    { id: 'p1', label: 'C', x: 50, y: 75 },
    { id: 'p2', label: 'QB', x: 50, y: 90 },
    { id: 'p3', label: 'WR', x: 20, y: 75 },
    { id: 'p4', label: 'WR', x: 80, y: 75 },
  ]);
  readonly selected = computed(() =>
    this.formations().find((x) => x.id === this.selectedFormation()),
  );
  constructor() {
    void this.load();
  }
  setTab(value: string) {
    this.tab.set(value as 'formations' | 'routes' | 'plays' | 'playbook');
  }
  routePointString() {
    return this.routePoints()
      .map((point) => `${point.x},${point.y}`)
      .join(' ');
  }
  playName(id: string) {
    return this.plays().find((play) => play.id === id)?.name ?? 'Unbekanntes Play';
  }
  formationForPlay(play: Play) {
    return this.formations().find((formation) => formation.id === play.formation_id);
  }
  async load() {
    try {
      const d = await this.service.load();
      this.formations.set(d.formations);
      this.routes.set(d.routes);
      this.plays.set(d.plays);
      this.playbook.set(d.playbook);
      if (!this.selectedFormation() && d.formations[0])
        this.selectedFormation.set(d.formations[0].id);
    } catch (e) {
      this.fail(e);
    }
  }
  movePlayer(id: string, x: number, y: number) {
    this.players.update((all) =>
      all.map((p) =>
        p.id === id
          ? { ...p, x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) }
          : p,
      ),
    );
  }
  placePlayer(event: MouseEvent) {
    if (this.players().length >= 5) return;
    const target = event.currentTarget as HTMLElement;
    const bounds = target.getBoundingClientRect();
    const label = this.playerType();
    this.players.update((items) => [
      ...items,
      {
        id: `${label}-${items.length}`,
        label,
        x: ((event.clientX - bounds.left) / bounds.width) * 100,
        y: ((event.clientY - bounds.top) / bounds.height) * 100,
      },
    ]);
  }
  removePlayer(id: string) {
    this.players.update((items) => items.filter((item) => item.id !== id));
  }
  flipPlayers(players = this.players()) {
    return players.map((p) => ({ ...p, x: 100 - p.x }));
  }
  flipRoute(points = this.routePoints()) {
    return points.map((p) => ({ ...p, x: 100 - p.x }));
  }
  async addFormation() {
    if (!this.name().trim()) return;
    await this.run(() =>
      this.service.save('flag_football_formations', { name: this.name(), players: this.players() }),
    );
  }
  async addRoute() {
    if (!this.name().trim()) return;
    await this.run(() =>
      this.service.save('flag_football_routes', {
        name: this.name(),
        aliases: this.routeAliases()
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean),
        segments: this.routePoints(),
      }),
    );
  }
  async addPlay() {
    if (!this.name().trim() || !this.selectedFormation()) return;
    await this.run(() =>
      this.service.save('flag_football_plays', {
        name: this.name(),
        formation_id: this.selectedFormation(),
        assignments: this.assignments(),
      }),
    );
  }
  async addToPlaybook(play: Play) {
    if (this.playbook().some((x) => x.play_id === play.id)) {
      this.error.set('Play ist bereits im Playbook.');
      return;
    }
    await this.run(() =>
      this.service.save('flag_football_playbook', {
        play_id: play.id,
        position: this.playbook().length,
        flipped: false,
      }),
    );
  }
  async assignPlaybook() {
    const play = this.plays().find((item) => item.id === this.selectedPlay());
    if (!play) return;
    if (this.playbook().some((item) => item.position === this.playbookNumber() - 1)) {
      this.error.set('Diese Playbook-Nummer ist bereits vergeben.');
      return;
    }
    await this.run(() =>
      this.service.save('flag_football_playbook', {
        play_id: play.id,
        position: Math.max(0, this.playbookNumber() - 1),
        flipped: this.playbookFlipped(),
      }),
    );
  }
  setAssignment(player: string, route: string) {
    this.assignments.update((all) => [
      ...all.filter((x) => x.player_id !== player),
      ...(route ? [{ player_id: player, route_id: route }] : []),
    ]);
  }
  toggleFlip(entry: PlaybookEntry) {
    entry.flipped = !entry.flipped;
    void this.run(
      () => this.service.save('flag_football_playbook', { flipped: entry.flipped }, entry.id),
      false,
    );
  }
  async move(entry: PlaybookEntry, delta: number) {
    const list = [...this.playbook()],
      i = list.findIndex((x) => x.id === entry.id),
      j = i + delta;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    this.playbook.set(list.map((x, p) => ({ ...x, position: p })));
    try {
      await this.service.reorder(list);
    } catch (e) {
      this.fail(e);
      await this.load();
    }
  }
  async remove(table: string, id: string) {
    if (!confirm('Wirklich löschen?')) return;
    await this.run(() => this.service.remove(table, id));
  }
  private async run(action: () => Promise<void>, reload = true) {
    try {
      this.error.set('');
      await action();
      this.name.set('');
      if (reload) await this.load();
    } catch (e) {
      this.fail(e);
    }
  }
  private fail(e: unknown) {
    this.error.set(e instanceof Error ? e.message : 'Etwas ist schiefgelaufen.');
  }
}
