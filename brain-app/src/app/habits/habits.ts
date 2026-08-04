import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  Habit,
  HabitCheck,
  HabitDraft,
  HabitsService,
  HabitStreak,
  TrainingPlan,
} from './habits.service';

export function localDate(value = new Date()): string {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}
export function currentStreak(checks: HabitCheck[], habitId: string, through: string): number {
  const completed = new Set(
    checks.filter((c) => c.habit_id === habitId && c.checked).map((c) => c.check_date),
  );
  let date = new Date(`${through}T12:00:00`);
  let streak = 0;
  while (completed.has(localDate(date))) {
    streak++;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}

@Component({
  selector: 'app-habits',
  imports: [FormsModule, RouterLink],
  templateUrl: './habits.html',
  styleUrl: './habits.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Habits {
  private readonly service = inject(HabitsService);
  readonly localDate = localDate;
  readonly habits = signal<Habit[]>([]);
  readonly checks = signal<HabitCheck[]>([]);
  readonly streaks = signal<HabitStreak[]>([]);
  readonly plans = signal<TrainingPlan[]>([]);
  readonly selectedDate = signal(localDate());
  readonly visibleMonth = signal(localDate().slice(0, 7));
  readonly draggedId = signal<string | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly editorOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly name = signal('');
  readonly description = signal('');
  readonly color = signal('#45806a');
  readonly startDate = signal(localDate());
  readonly endDate = signal('');
  readonly workoutType = signal('');
  readonly sportType = signal('');
  readonly metricName = signal('');
  readonly planId = signal('');
  readonly overviewDates = computed(() => {
    const end = new Date(`${this.selectedDate()}T12:00:00`);
    return [-2, -1, 0].map((offset) => {
      const date = new Date(end);
      date.setDate(end.getDate() + offset);
      return localDate(date);
    });
  });

  constructor() {
    void this.reload();
  }
  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const data = await this.service.load();
      this.habits.set(data.habits);
      this.checks.set(data.checks);
      this.streaks.set(data.streaks);
      this.plans.set(data.plans);
    } catch (error) {
      this.error.set(this.message(error));
    } finally {
      this.loading.set(false);
    }
  }
  changeDate(days: number): void {
    const date = new Date(`${this.selectedDate()}T12:00:00`);
    date.setDate(date.getDate() + days);
    this.selectedDate.set(localDate(date));
  }
  newHabit(): void {
    this.editingId.set(null);
    this.name.set('');
    this.description.set('');
    this.color.set('#45806a');
    this.startDate.set(this.selectedDate());
    this.endDate.set('');
    this.workoutType.set('');
    this.sportType.set('');
    this.metricName.set('');
    this.planId.set('');
    this.editorOpen.set(true);
  }
  edit(habit: Habit): void {
    this.editingId.set(habit.id);
    this.name.set(habit.name);
    this.description.set(habit.description ?? '');
    this.color.set(habit.color);
    this.startDate.set(habit.start_date);
    this.endDate.set(habit.end_date ?? '');
    this.workoutType.set(habit.linked_workout_type ?? '');
    this.sportType.set(habit.sport_type ?? '');
    this.metricName.set(habit.sport_metric_name ?? '');
    this.planId.set(habit.linked_training_plan_id ?? '');
    this.editorOpen.set(true);
  }
  async save(): Promise<void> {
    if (!this.name().trim()) {
      this.error.set('Der Name ist erforderlich.');
      return;
    }
    if (this.endDate() && this.endDate() < this.startDate()) {
      this.error.set('Das Enddatum darf nicht vor dem Startdatum liegen.');
      return;
    }
    const existing = this.habits().find((h) => h.id === this.editingId());
    const draft: HabitDraft = {
      name: this.name().trim(),
      description: this.description().trim() || null,
      color: this.color(),
      start_date: this.startDate(),
      end_date: this.endDate() || null,
      linked_workout_type: this.workoutType().trim() || null,
      position: existing?.position ?? this.habits().length,
      collapsed: existing?.collapsed ?? false,
      sport_type: this.sportType().trim() || null,
      sport_metric_name: this.metricName().trim() || null,
      linked_training_plan_id: this.planId() || null,
    };
    this.saving.set(true);
    this.error.set('');
    try {
      await this.service.saveHabit(draft, this.editingId() ?? undefined);
      this.editorOpen.set(false);
      await this.reload();
    } catch (error) {
      this.error.set(this.message(error));
    } finally {
      this.saving.set(false);
    }
  }
  checkFor(habit: Habit, date = this.selectedDate()): HabitCheck | undefined {
    return this.checks().find((c) => c.habit_id === habit.id && c.check_date === date);
  }
  async toggle(habit: Habit): Promise<void> {
    await this.toggleFor(habit, this.selectedDate());
  }
  async toggleFor(habit: Habit, date: string): Promise<void> {
    const check = this.checkFor(habit, date);
    try {
      await this.service.setCheck(
        habit.id,
        date,
        !check?.checked,
        check?.sport_metric_value ?? null,
      );
      await this.reload();
    } catch (error) {
      this.error.set(this.message(error));
    }
  }
  async setMetric(habit: Habit, raw: string): Promise<void> {
    const value = raw === '' ? null : Number(raw);
    if (value !== null && !Number.isFinite(value)) return;
    try {
      await this.service.setCheck(
        habit.id,
        this.selectedDate(),
        this.checkFor(habit)?.checked ?? false,
        value,
      );
      await this.reload();
    } catch (error) {
      this.error.set(this.message(error));
    }
  }
  async collapse(habit: Habit): Promise<void> {
    await this.update(habit, { collapsed: !habit.collapsed });
  }
  async move(habit: Habit, direction: -1 | 1): Promise<void> {
    const ordered = [...this.habits()];
    const index = ordered.findIndex((h) => h.id === habit.id);
    const target = ordered[index + direction];
    if (!target) return;
    try {
      await Promise.all([
        this.service.saveHabit(this.draft(habit, { position: target.position }), habit.id),
        this.service.saveHabit(this.draft(target, { position: habit.position }), target.id),
      ]);
      await this.reload();
    } catch (error) {
      this.error.set(this.message(error));
    }
  }
  async remove(habit: Habit): Promise<void> {
    if (!confirm(`„${habit.name}“ und den gesamten Verlauf löschen?`)) return;
    try {
      await this.service.deleteHabit(habit.id);
      await this.reload();
    } catch (error) {
      this.error.set(this.message(error));
    }
  }
  streak(habit: Habit): number {
    return currentStreak(this.checks(), habit.id, this.selectedDate());
  }
  total(habit: Habit): number {
    return this.streaks().find((s) => s.habit_id === habit.id)?.total_checks ?? 0;
  }
  activeOn(habit: Habit, date: string): boolean {
    return habit.start_date <= date && (!habit.end_date || habit.end_date >= date);
  }
  isFuture(date: string): boolean {
    return date > localDate();
  }
  weekday(date: string): string {
    return new Intl.DateTimeFormat('de-DE', { weekday: 'short' })
      .format(new Date(`${date}T12:00:00`))
      .replace('.', '')
      .toUpperCase();
  }
  day(date: string): number {
    return Number(date.slice(-2));
  }
  monthLabel(): string {
    return new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric' }).format(
      new Date(`${this.visibleMonth()}-01T12:00:00`),
    );
  }
  changeMonth(offset: number): void {
    const date = new Date(`${this.visibleMonth()}-01T12:00:00`);
    date.setMonth(date.getMonth() + offset);
    this.visibleMonth.set(localDate(date).slice(0, 7));
  }
  calendarDays(): (string | null)[] {
    const first = new Date(`${this.visibleMonth()}-01T12:00:00`);
    const mondayOffset = (first.getDay() + 6) % 7;
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    return [
      ...Array<null>(mondayOffset).fill(null),
      ...Array.from(
        { length: days },
        (_, index) => `${this.visibleMonth()}-${String(index + 1).padStart(2, '0')}`,
      ),
    ];
  }
  monthProgress(habit: Habit): { complete: number; possible: number; percent: number } {
    const dates = this.calendarDays().filter((date): date is string => !!date);
    const eligible = dates.filter((date) => this.activeOn(habit, date) && !this.isFuture(date));
    const complete = eligible.filter((date) => this.checkFor(habit, date)?.checked).length;
    return {
      complete,
      possible: eligible.length,
      percent: eligible.length ? (complete / eligible.length) * 100 : 0,
    };
  }
  metricTotal(habit: Habit): number {
    return this.checks()
      .filter((check) => check.habit_id === habit.id)
      .reduce((sum, check) => sum + (check.sport_metric_value ?? 0), 0);
  }
  startDrag(habit: Habit): void {
    this.draggedId.set(habit.id);
  }
  async dropOn(target: Habit): Promise<void> {
    const source = this.habits().find((habit) => habit.id === this.draggedId());
    this.draggedId.set(null);
    if (!source || source.id === target.id) return;
    const sourceIndex = this.habits().findIndex((habit) => habit.id === source.id);
    const targetIndex = this.habits().findIndex((habit) => habit.id === target.id);
    await this.move(source, targetIndex > sourceIndex ? 1 : -1);
  }
  private async update(habit: Habit, changes: Partial<HabitDraft>): Promise<void> {
    try {
      await this.service.saveHabit(this.draft(habit, changes), habit.id);
      await this.reload();
    } catch (error) {
      this.error.set(this.message(error));
    }
  }
  private draft(h: Habit, changes: Partial<HabitDraft> = {}): HabitDraft {
    return {
      name: h.name,
      description: h.description,
      color: h.color,
      start_date: h.start_date,
      end_date: h.end_date,
      linked_workout_type: h.linked_workout_type,
      position: h.position,
      collapsed: h.collapsed,
      sport_type: h.sport_type,
      sport_metric_name: h.sport_metric_name,
      linked_training_plan_id: h.linked_training_plan_id,
      ...changes,
    };
  }
  private message(error: unknown): string {
    return error instanceof Error ? error.message : 'Die Aktion konnte nicht ausgeführt werden.';
  }
}
