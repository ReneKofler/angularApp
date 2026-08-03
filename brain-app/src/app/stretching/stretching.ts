import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StretchExercise, StretchRoutine, StretchingService } from './stretching.service';

@Component({
  selector: 'app-stretching',
  imports: [FormsModule, RouterLink],
  templateUrl: './stretching.html',
  styleUrl: './stretching.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Stretching {
  private service = inject(StretchingService);
  readonly routines = signal<StretchRoutine[]>([]);
  readonly exercises = signal<StretchExercise[]>([]);
  readonly selected = signal('');
  readonly error = signal('');
  readonly routineForm = signal({ name: '', description: '', emoji: '🧘' });
  readonly form = signal({ name: '', emoji: '🤸', duration_seconds: 30, notes: '', image_url: '' });
  readonly editing = signal<string | null>(null);
  readonly guided = signal(false);
  readonly index = signal(0);
  readonly remaining = signal(0);
  readonly running = signal(false);
  readonly imageFailed = signal(false);
  private timer?: ReturnType<typeof setInterval>;
  readonly selectedRoutine = computed(() => this.routines().find((x) => x.id === this.selected()));
  readonly items = computed(() =>
    this.exercises()
      .filter((x) => x.routine_id === this.selected())
      .sort((a, b) => a.position - b.position),
  );
  readonly current = computed(() => this.items()[this.index()]);
  constructor() {
    void this.load();
  }
  async load() {
    try {
      const data = await this.service.load();
      this.routines.set(data.routines);
      this.exercises.set(data.exercises);
      if (!this.selected() && data.routines[0]) this.selected.set(data.routines[0].id);
    } catch (e) {
      this.fail(e);
    }
  }
  patchRoutine(key: string, value: string) {
    this.routineForm.update((x) => ({ ...x, [key]: value }));
  }
  patch(key: string, value: string | number) {
    this.form.update((x) => ({ ...x, [key]: value }));
  }
  async addRoutine() {
    if (!this.routineForm().name.trim()) return;
    try {
      await this.service.saveRoutine(this.routineForm());
      this.routineForm.set({ name: '', description: '', emoji: '🧘' });
      await this.load();
    } catch (e) {
      this.fail(e);
    }
  }
  async deleteRoutine() {
    if (!this.selected() || !confirm('Routine löschen?')) return;
    try {
      await this.service.removeRoutine(this.selected());
      this.selected.set('');
      await this.load();
    } catch (e) {
      this.fail(e);
    }
  }
  edit(item: StretchExercise) {
    this.editing.set(item.id);
    this.form.set({
      name: item.name,
      emoji: item.emoji,
      duration_seconds: item.duration_seconds,
      notes: item.notes,
      image_url: item.image_url,
    });
  }
  reset() {
    this.editing.set(null);
    this.form.set({ name: '', emoji: '🤸', duration_seconds: 30, notes: '', image_url: '' });
  }
  async save() {
    const value = this.form();
    if (!this.selected() || !value.name.trim()) return;
    try {
      await this.service.saveExercise(
        {
          ...value,
          routine_id: this.selected(),
          position: this.editing()
            ? this.items().find((x) => x.id === this.editing())?.position
            : this.items().length,
        },
        this.editing() ?? undefined,
      );
      this.reset();
      await this.load();
    } catch (e) {
      this.fail(e);
    }
  }
  async remove(item: StretchExercise) {
    if (!confirm('Übung löschen?')) return;
    try {
      await this.service.removeExercise(item.id);
      await this.load();
    } catch (e) {
      this.fail(e);
    }
  }
  async move(item: StretchExercise, delta: number) {
    const list = [...this.items()],
      i = list.findIndex((x) => x.id === item.id),
      j = i + delta;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    this.exercises.update((all) => [
      ...all.filter((x) => x.routine_id !== this.selected()),
      ...list.map((x, p) => ({ ...x, position: p })),
    ]);
    try {
      await this.service.reorder(list);
    } catch (e) {
      this.fail(e);
      await this.load();
    }
  }
  start() {
    if (!this.items().length) return;
    this.index.set(0);
    this.guided.set(true);
    this.prepare();
  }
  prepare() {
    this.stop();
    this.remaining.set(this.current()?.duration_seconds ?? 0);
    this.imageFailed.set(false);
  }
  toggleTimer() {
    this.running() ? this.stop() : this.run();
  }
  run() {
    if (!this.remaining()) return;
    this.running.set(true);
    this.timer = setInterval(() => {
      this.remaining.update((x) => Math.max(0, x - 1));
      if (!this.remaining()) this.stop();
    }, 1000);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.running.set(false);
  }
  navigate(delta: number) {
    const next = this.index() + delta;
    if (next < 0 || next >= this.items().length) return;
    this.index.set(next);
    this.prepare();
  }
  close() {
    this.stop();
    this.guided.set(false);
  }
  private fail(e: unknown) {
    this.error.set(e instanceof Error ? e.message : 'Etwas ist schiefgelaufen.');
  }
}
