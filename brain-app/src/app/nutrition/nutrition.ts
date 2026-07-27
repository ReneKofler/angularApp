import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DEFAULT_DIET_GOALS, DietGoals, DietHistory, DietMeal, NutritionService } from './nutrition.service';

type NutrientKey = 'kcal' | 'protein_g' | 'fat_g' | 'carbs_g' | 'fiber_g' | 'salt_g';

@Component({
  selector: 'app-nutrition',
  imports: [FormsModule, RouterLink],
  templateUrl: './nutrition.html',
  styleUrl: './nutrition.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Nutrition {
  private readonly service = inject(NutritionService);
  readonly date = signal(this.localDate(new Date()));
  readonly meals = signal<DietMeal[]>([]);
  readonly settings = signal<DietGoals>({ ...DEFAULT_DIET_GOALS });
  readonly history = signal<DietHistory[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly editor = signal<'meal' | 'goals' | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly name = signal('');
  readonly nutrients = signal<Record<NutrientKey, number>>({
    kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0, salt_g: 0,
  });
  readonly goalDraft = signal<DietGoals>({ ...DEFAULT_DIET_GOALS });
  readonly nutrientConfig = [
    { key: 'kcal' as const, goal: 'calorie_goal' as const, label: 'Kalorien', unit: 'kcal' },
    { key: 'protein_g' as const, goal: 'protein_goal_g' as const, label: 'Protein', unit: 'g' },
    { key: 'fat_g' as const, goal: 'fat_goal_g' as const, label: 'Fett', unit: 'g' },
    { key: 'carbs_g' as const, goal: 'carbs_goal_g' as const, label: 'Kohlenhydrate', unit: 'g' },
    { key: 'fiber_g' as const, goal: 'fiber_goal_g' as const, label: 'Ballaststoffe', unit: 'g' },
    { key: 'salt_g' as const, goal: 'salt_goal_g' as const, label: 'Salz', unit: 'g' },
  ];
  readonly totals = computed(() => this.meals().reduce(
    (total, meal) => ({
      kcal: total.kcal + Number(meal.kcal), protein_g: total.protein_g + Number(meal.protein_g),
      fat_g: total.fat_g + Number(meal.fat_g), carbs_g: total.carbs_g + Number(meal.carbs_g),
      fiber_g: total.fiber_g + Number(meal.fiber_g), salt_g: total.salt_g + Number(meal.salt_g),
    }),
    { kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0, salt_g: 0 },
  ));
  readonly activeGoals = computed(() => {
    const endOfDay = `${this.date()}T23:59:59.999`;
    return this.history().find((item) => item.changed_at <= endOfDay) ?? this.settings();
  });

  constructor() { void this.reload(); }

  async reload() {
    this.loading.set(true); this.error.set('');
    try {
      const data = await this.service.load(this.date());
      this.meals.set(data.meals); this.settings.set(data.settings); this.history.set(data.history);
    } catch (error) { this.error.set(this.message(error)); }
    finally { this.loading.set(false); }
  }

  changeDate(value: string) { this.date.set(value); this.editor.set(null); void this.reload(); }
  shiftDate(days: number) {
    const value = new Date(`${this.date()}T12:00:00`);
    value.setDate(value.getDate() + days); this.changeDate(this.localDate(value));
  }
  newMeal() {
    this.editingId.set(null); this.name.set('');
    this.nutrients.set({ kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0, salt_g: 0 });
    this.editor.set('meal');
  }
  editMeal(meal: DietMeal) {
    this.editingId.set(meal.id); this.name.set(meal.name);
    this.nutrients.set({
      kcal: meal.kcal, protein_g: meal.protein_g, fat_g: meal.fat_g,
      carbs_g: meal.carbs_g, fiber_g: meal.fiber_g, salt_g: meal.salt_g,
    });
    this.editor.set('meal');
  }
  setNutrient(key: NutrientKey, value: number | string) {
    this.nutrients.update((current) => ({ ...current, [key]: Math.max(0, Number(value) || 0) }));
  }
  async saveMeal() {
    if (!this.name().trim()) { this.error.set('Name ist erforderlich.'); return; }
    await this.run(async () => {
      await this.service.saveMeal(
        { name: this.name().trim(), meal_date: this.date(), ...this.nutrients() },
        this.editingId() ?? undefined,
      );
      this.editor.set(null); await this.reload();
    });
  }
  async deleteMeal() {
    const id = this.editingId();
    if (!id || !confirm(`${this.name()} löschen?`)) return;
    await this.run(async () => { await this.service.deleteMeal(id); this.editor.set(null); await this.reload(); });
  }
  openGoals() { this.goalDraft.set({ ...this.settings() }); this.editor.set('goals'); }
  setGoal(key: keyof DietGoals, value: number | string) {
    this.goalDraft.update((current) => ({ ...current, [key]: Math.max(0, Number(value) || 0) }));
  }
  async saveGoals() {
    await this.run(async () => {
      const goals = await this.service.saveGoals(this.goalDraft());
      this.settings.set(goals);
      this.history.update((items) => [
        { ...goals, id: `pending-${Date.now()}`, user_id: '', changed_at: new Date().toISOString() },
        ...items,
      ]);
      this.editor.set(null);
    });
  }
  rounded(value: number) { return Math.round((value + Number.EPSILON) * 10) / 10; }
  progress(value: number, goal: number) {
    return goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;
  }
  private async run(action: () => Promise<void>) {
    this.saving.set(true); this.error.set('');
    try { await action(); } catch (error) { this.error.set(this.message(error)); }
    finally { this.saving.set(false); }
  }
  private localDate(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  private message(error: unknown) {
    return error instanceof Error ? error.message : 'Etwas ist schiefgelaufen.';
  }
}
