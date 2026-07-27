import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ExerciseOption,
  GreasingTheGrooveService,
  GrooveDay,
  GrooveExercise,
} from './greasing-the-groove.service';

@Component({
  selector: 'app-greasing-the-groove',
  imports: [FormsModule, RouterLink],
  templateUrl: './greasing-the-groove.html',
  styleUrl: './greasing-the-groove.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GreasingTheGroove {
  private readonly service = inject(GreasingTheGrooveService);
  readonly selectedDate = signal(this.today());
  readonly days = signal<GrooveDay[]>([]);
  readonly entries = signal<GrooveExercise[]>([]);
  readonly exercises = signal<ExerciseOption[]>([]);
  readonly exerciseToAdd = signal('');
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');

  readonly selectedDay = computed(
    () => this.days().find((day) => day.practice_date === this.selectedDate()) ?? null,
  );
  readonly dayEntries = computed(() => {
    const day = this.selectedDay();
    return day ? this.entries().filter((entry) => entry.day_id === day.id) : [];
  });
  readonly totalReps = computed(() =>
    this.dayEntries().reduce((total, entry) => total + entry.reps, 0),
  );
  readonly isPastDay = computed(() => this.selectedDate() < this.today());
  readonly availableExercises = computed(() => {
    const selected = new Set(this.dayEntries().map((entry) => entry.exercise_id));
    return this.exercises().filter((exercise) => !selected.has(exercise.id));
  });

  constructor() {
    void this.reload();
  }

  async reload() {
    this.loading.set(true);
    this.error.set('');
    try {
      const { from, to } = this.monthBounds(this.selectedDate());
      const data = await this.service.load(from, to);
      this.days.set(data.days);
      this.entries.set(data.entries);
      this.exercises.set(data.exercises);
    } catch (error) {
      this.error.set(this.message(error));
    } finally {
      this.loading.set(false);
    }
  }

  async changeDate(date: string) {
    const previousMonth = this.selectedDate().slice(0, 7);
    this.selectedDate.set(date);
    if (previousMonth !== date.slice(0, 7)) await this.reload();
  }

  shiftDate(days: number) {
    const date = new Date(`${this.selectedDate()}T12:00:00`);
    date.setDate(date.getDate() + days);
    void this.changeDate(this.localDate(date));
  }

  async startDay() {
    await this.run(async () => {
      const day = await this.service.startDay(this.selectedDate());
      this.days.update((days) =>
        days.some((item) => item.id === day.id) ? days : [day, ...days],
      );
    });
  }

  async addExercise(id: string) {
    const day = this.selectedDay();
    const exercise = this.exercises().find((item) => item.id === id);
    if (!day || !exercise) return;
    await this.run(async () => {
      const entry = await this.service.addExercise(day, exercise, this.dayEntries());
      this.entries.update((entries) => [...entries, entry]);
      this.exerciseToAdd.set('');
    });
  }

  async addReps(entry: GrooveExercise, amount: number) {
    const day = this.selectedDay();
    if (!day) return;
    const reps = Math.max(0, entry.reps + amount);
    await this.run(async () => {
      const updated = await this.service.setReps(day, entry, reps, this.dayEntries());
      this.entries.update((entries) =>
        entries.map((item) => (item.id === updated.id ? updated : item)),
      );
    });
  }

  async setReps(entry: GrooveExercise, value: number | string) {
    const day = this.selectedDay();
    if (!day) return;
    await this.run(async () => {
      const updated = await this.service.setReps(
        day,
        entry,
        Number(value) || 0,
        this.dayEntries(),
      );
      this.entries.update((entries) =>
        entries.map((item) => (item.id === updated.id ? updated : item)),
      );
    });
  }

  async remove(entry: GrooveExercise) {
    const day = this.selectedDay();
    if (!day || !confirm(`${entry.name} entfernen?`)) return;
    await this.run(async () => {
      await this.service.removeExercise(day, entry, this.dayEntries());
      this.entries.update((entries) => entries.filter((item) => item.id !== entry.id));
    });
  }

  async createSportEntry() {
    const day = this.selectedDay();
    if (!day || !this.isPastDay() || day.sport_workout_id) return;
    await this.run(async () => {
      const updated = await this.service.createSportEntry(day, this.dayEntries());
      this.days.update((days) => days.map((item) => (item.id === updated.id ? updated : item)));
    });
  }

  private async run(action: () => Promise<void>) {
    this.saving.set(true);
    this.error.set('');
    try {
      await action();
    } catch (error) {
      this.error.set(this.message(error));
    } finally {
      this.saving.set(false);
    }
  }

  private monthBounds(date: string) {
    const [year, month] = date.split('-').map(Number);
    return {
      from: `${year}-${String(month).padStart(2, '0')}-01`,
      to: this.localDate(new Date(year, month, 0)),
    };
  }

  private today() {
    return this.localDate(new Date());
  }

  private localDate(date: Date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private message(error: unknown) {
    return error instanceof Error ? error.message : 'Etwas ist schiefgelaufen.';
  }
}
