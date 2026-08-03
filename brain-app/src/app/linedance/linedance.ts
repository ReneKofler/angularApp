import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Dance, DanceStep, LinedanceService } from './linedance.service';
@Component({
  selector: 'app-linedance',
  imports: [FormsModule, RouterLink],
  templateUrl: './linedance.html',
  styleUrl: './linedance.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Linedance {
  private service = inject(LinedanceService);
  readonly dances = signal<Dance[]>([]);
  readonly steps = signal<DanceStep[]>([]);
  readonly selected = signal('');
  readonly query = signal('');
  readonly editingDance = signal<string | null>(null);
  readonly editingStep = signal<string | null>(null);
  readonly error = signal('');
  readonly danceForm = signal({
    name: '',
    song: '',
    artist: '',
    youtube_url: '',
    counts: 32,
    walls: 4,
    difficulty: 'Anfänger',
    notes: '',
  });
  readonly stepForm = signal({ counts: '1-8', instruction: '', foot: '', annotation: '' });
  readonly visible = computed(() =>
    this.dances().filter((x) =>
      `${x.name} ${x.song} ${x.artist}`.toLowerCase().includes(this.query().toLowerCase()),
    ),
  );
  readonly dance = computed(() => this.dances().find((x) => x.id === this.selected()));
  readonly danceSteps = computed(() =>
    this.steps()
      .filter((x) => x.dance_id === this.selected())
      .sort((a, b) => a.position - b.position),
  );
  constructor() {
    void this.load();
  }
  async load() {
    try {
      const d = await this.service.load();
      this.dances.set(d.dances);
      this.steps.set(d.steps);
      if (!this.selected() && d.dances[0]) this.selected.set(d.dances[0].id);
    } catch (e) {
      this.fail(e);
    }
  }
  patchDance(k: string, v: string | number) {
    this.danceForm.update((x) => ({ ...x, [k]: v }));
  }
  patchStep(k: string, v: string) {
    this.stepForm.update((x) => ({ ...x, [k]: v }));
  }
  editDance(x: Dance) {
    this.editingDance.set(x.id);
    this.danceForm.set({
      name: x.name,
      song: x.song,
      artist: x.artist,
      youtube_url: x.youtube_url,
      counts: x.counts,
      walls: x.walls,
      difficulty: x.difficulty,
      notes: x.notes,
    });
  }
  resetDance() {
    this.editingDance.set(null);
    this.danceForm.set({
      name: '',
      song: '',
      artist: '',
      youtube_url: '',
      counts: 32,
      walls: 4,
      difficulty: 'Anfänger',
      notes: '',
    });
  }
  async saveDance() {
    const f = this.danceForm();
    if (!f.name.trim()) return;
    try {
      await this.service.saveDance(
        { ...f, youtube_url: this.service.safeYoutube(f.youtube_url) },
        this.editingDance() ?? undefined,
      );
      this.resetDance();
      await this.load();
    } catch (e) {
      this.fail(e);
    }
  }
  async removeDance(x: Dance) {
    if (!confirm(`${x.name} löschen?`)) return;
    try {
      await this.service.deleteDance(x.id);
      if (this.selected() === x.id) this.selected.set('');
      await this.load();
    } catch (e) {
      this.fail(e);
    }
  }
  editStep(x: DanceStep) {
    this.editingStep.set(x.id);
    this.stepForm.set({
      counts: x.counts,
      instruction: x.instruction,
      foot: x.foot,
      annotation: x.annotation,
    });
  }
  resetStep() {
    this.editingStep.set(null);
    this.stepForm.set({ counts: '1-8', instruction: '', foot: '', annotation: '' });
  }
  async saveStep() {
    const f = this.stepForm();
    if (!this.selected() || !f.instruction.trim()) return;
    try {
      await this.service.saveStep(
        {
          ...f,
          dance_id: this.selected(),
          position: this.editingStep()
            ? this.danceSteps().find((x) => x.id === this.editingStep())?.position
            : this.danceSteps().length,
        },
        this.editingStep() ?? undefined,
      );
      this.resetStep();
      await this.load();
    } catch (e) {
      this.fail(e);
    }
  }
  async removeStep(x: DanceStep) {
    if (!confirm('Schritt löschen?')) return;
    try {
      await this.service.deleteStep(x.id);
      await this.load();
    } catch (e) {
      this.fail(e);
    }
  }
  async move(x: DanceStep, delta: number) {
    const list = [...this.danceSteps()],
      i = list.findIndex((s) => s.id === x.id),
      j = i + delta;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    this.steps.update((all) => [
      ...all.filter((s) => s.dance_id !== this.selected()),
      ...list.map((s, p) => ({ ...s, position: p })),
    ]);
    try {
      await this.service.reorder(list);
    } catch (e) {
      this.fail(e);
      await this.load();
    }
  }
  private fail(e: unknown) {
    this.error.set(e instanceof Error ? e.message : 'Etwas ist schiefgelaufen.');
  }
}
