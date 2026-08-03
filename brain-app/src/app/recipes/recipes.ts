import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Recipe, RecipeDraft, RecipesService } from './recipes.service';
import { MealDraft, NutritionService } from '../nutrition/nutrition.service';

type MealNutrients = Pick<MealDraft, 'kcal' | 'protein_g' | 'fat_g' | 'carbs_g' | 'fiber_g' | 'salt_g'>;
interface IngredientGroup { name: string; items: string[]; pending: string; }

@Component({
  selector: 'app-recipes', imports: [FormsModule, RouterLink],
  templateUrl: './recipes.html', styleUrl: './recipes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Recipes implements OnDestroy {
  private readonly service = inject(RecipesService);
  private readonly nutritionService = inject(NutritionService);
  readonly ratingStars = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  readonly recipes = signal<Recipe[]>([]); readonly loading = signal(true); readonly saving = signal(false);
  readonly error = signal(''); readonly query = signal(''); readonly filter = signal<'all'|'favourites'|'meal-prep'>('all');
  readonly selected = signal<Recipe | null>(null); readonly editing = signal(false);
  readonly cookingMode = signal(false);
  readonly checkedIngredients = signal(new Set<number>());
  readonly checkedSteps = signal(new Set<number>());
  readonly mealDialog = signal(false);
  readonly mealName = signal('');
  readonly mealDate = signal('');
  readonly mealPercentage = signal(100);
  readonly mealNutrients = signal<MealNutrients>({ kcal: 0, protein_g: 0, fat_g: 0, carbs_g: 0, fiber_g: 0, salt_g: 0 });
  readonly ingredientGroups = signal<IngredientGroup[]>([{ name: '', items: [], pending: '' }]);
  readonly preparationSteps = signal<string[]>([]);
  readonly pendingStep = signal('');
  readonly draggedStep = signal<number | null>(null);
  readonly draft = signal<RecipeDraft>(this.emptyDraft());
  readonly filtered = computed(() => {
    const query = this.query().trim().toLowerCase();
    return this.recipes().filter((recipe) =>
      (!query || `${recipe.name} ${recipe.ingredients}`.toLowerCase().includes(query)) &&
      (this.filter() === 'all' || (this.filter() === 'favourites' ? recipe.is_favourite : recipe.meal_prep)));
  });

  constructor() { void this.reload(); }
  async reload() {
    this.loading.set(true); this.error.set('');
    try { this.recipes.set(await this.service.load()); }
    catch (error) { this.error.set(this.message(error)); }
    finally { this.loading.set(false); }
  }
  newRecipe() {
    this.selected.set(null); this.draft.set(this.emptyDraft());
    this.ingredientGroups.set([{ name: '', items: [], pending: '' }]);
    this.preparationSteps.set([]); this.pendingStep.set(''); this.editing.set(true);
  }
  open(recipe: Recipe) {
    this.selected.set(recipe); this.editing.set(false);
    this.checkedIngredients.set(new Set()); this.checkedSteps.set(new Set());
  }
  edit(recipe: Recipe) {
    void this.releaseWakeLock();
    const { id: _id, user_id: _user, created_at: _created, updated_at: _updated, ...draft } = recipe;
    this.selected.set(recipe); this.draft.set(draft); this.editing.set(true);
    this.ingredientGroups.set(this.parseIngredientGroups(recipe.ingredients));
    this.preparationSteps.set(this.listItems(recipe.preparation)); this.pendingStep.set('');
  }
  closeDetail() {
    void this.releaseWakeLock();
    this.selected.set(null); this.editing.set(false);
  }
  update<K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) {
    this.draft.update((current) => ({ ...current, [key]: value }));
  }
  numeric(key: keyof RecipeDraft, value: string | number) {
    this.update(key, value === '' ? null as never : Math.max(0, Number(value)) as never);
  }
  async save() {
    this.update('ingredients', JSON.stringify(this.ingredientGroups().map(({ name, items }) => ({ name, items }))));
    this.update('preparation', JSON.stringify(this.preparationSteps()));
    const draft = this.draft();
    const hasIngredients = this.ingredientGroups().some((group) => group.items.length);
    if (!draft.name.trim() || !hasIngredients || !this.preparationSteps().length) {
      this.error.set('Name, Zutaten und Zubereitung sind erforderlich.'); return;
    }
    await this.run(async () => {
      const saved = await this.service.save(draft, this.selected()?.id);
      this.selected.set(saved); this.editing.set(false); await this.reload();
    });
  }
  async favourite(recipe: Recipe, event?: Event) {
    event?.stopPropagation();
    await this.run(async () => { await this.service.toggleFavourite(recipe); await this.reload(); });
  }
  async remove() {
    const recipe = this.selected();
    if (!recipe || !confirm(`${recipe.name} löschen?`)) return;
    await this.run(async () => { await this.service.delete(recipe.id); this.selected.set(null); this.editing.set(false); await this.reload(); });
  }
  imageFailed(event: Event) { (event.target as HTMLImageElement).style.display = 'none'; }
  setRating(rating: number) { this.update('rating', rating); }
  updateGroupName(index: number, name: string) {
    this.ingredientGroups.update((groups) => groups.map((group, i) => i === index ? { ...group, name } : group));
  }
  updatePendingIngredient(index: number, pending: string) {
    this.ingredientGroups.update((groups) => groups.map((group, i) => i === index ? { ...group, pending } : group));
  }
  addIngredient(index: number) {
    this.ingredientGroups.update((groups) => groups.map((group, i) => i === index && group.pending.trim()
      ? { ...group, items: [...group.items, group.pending.trim()], pending: '' } : group));
  }
  removeIngredient(groupIndex: number, itemIndex: number) {
    this.ingredientGroups.update((groups) => groups.map((group, i) => i === groupIndex
      ? { ...group, items: group.items.filter((_, item) => item !== itemIndex) } : group));
  }
  addIngredientGroup() { this.ingredientGroups.update((groups) => [...groups, { name: '', items: [], pending: '' }]); }
  removeIngredientGroup(index: number) {
    this.ingredientGroups.update((groups) => groups.length > 1 ? groups.filter((_, i) => i !== index) : groups);
  }
  addPreparationStep() {
    const step = this.pendingStep().trim();
    if (!step) return;
    this.preparationSteps.update((steps) => [...steps, step]); this.pendingStep.set('');
  }
  removePreparationStep(index: number) { this.preparationSteps.update((steps) => steps.filter((_, i) => i !== index)); }
  startStepDrag(index: number, event: DragEvent) {
    this.draggedStep.set(index);
    event.dataTransfer?.setData('text/plain', String(index));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }
  dropStep(targetIndex: number, event: DragEvent) {
    event.preventDefault();
    const sourceIndex = this.draggedStep();
    if (sourceIndex === null || sourceIndex === targetIndex) { this.draggedStep.set(null); return; }
    this.movePreparationStep(sourceIndex, targetIndex);
    this.draggedStep.set(null);
  }
  movePreparationStep(from: number, to: number) {
    const length = this.preparationSteps().length;
    if (from < 0 || from >= length || to < 0 || to >= length || from === to) return;
    this.preparationSteps.update((steps) => {
      const reordered = [...steps];
      const [step] = reordered.splice(from, 1);
      reordered.splice(to, 0, step);
      return reordered;
    });
  }
  handleStepKey(index: number, event: KeyboardEvent) {
    if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    this.movePreparationStep(index, index + (event.key === 'ArrowUp' ? -1 : 1));
  }
  listItems(value: string): string[] {
    const plainText = () => value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    try {
      const parsed: unknown = JSON.parse(value);
      const items: string[] = [];
      const collect = (entry: unknown) => {
        if (typeof entry === 'string') {
          if (entry.trim()) items.push(entry.trim());
          return;
        }
        if (Array.isArray(entry)) {
          entry.forEach(collect);
          return;
        }
        if (entry && typeof entry === 'object') {
          const record = entry as Record<string, unknown>;
          if (Array.isArray(record['items'])) {
            record['items'].forEach(collect);
            return;
          }
          const text = record['text'] ?? record['description'] ?? record['item'] ?? record['name'];
          if (typeof text === 'string' && text.trim()) items.push(text.trim());
        }
      };
      collect(parsed);
      return items.length ? items : plainText();
    } catch {
      return plainText();
    }
  }
  toggleChecked(target: 'ingredient' | 'step', index: number) {
    const state = target === 'ingredient' ? this.checkedIngredients : this.checkedSteps;
    state.update((current) => {
      const next = new Set(current);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  }
  print() { window.print(); }
  openMealDialog(recipe: Recipe) {
    this.mealName.set(recipe.name);
    this.mealDate.set(this.localDate(new Date()));
    this.mealPercentage.set(100);
    this.mealNutrients.set(this.recipeNutrients(recipe));
    this.mealDialog.set(true);
  }
  setMealPercentage(value: number | string) {
    const percentage = Math.max(0, Number(value) || 0);
    this.mealPercentage.set(percentage);
    const recipe = this.selected();
    if (!recipe) return;
    const factor = percentage / 100;
    const base = this.recipeNutrients(recipe);
    this.mealNutrients.set(Object.fromEntries(
      Object.entries(base).map(([key, nutrient]) => [key, this.round(nutrient * factor)]),
    ) as MealNutrients);
  }
  setMealNutrient(key: keyof MealNutrients, value: number | string) {
    this.mealNutrients.update((current) => ({ ...current, [key]: Math.max(0, Number(value) || 0) }));
  }
  async addMeal() {
    if (!this.mealName().trim() || !this.mealDate()) {
      this.error.set('Name und Datum sind erforderlich.'); return;
    }
    await this.run(async () => {
      await this.nutritionService.saveMeal({
        name: this.mealName().trim(), meal_date: this.mealDate(), ...this.mealNutrients(),
      });
      this.mealDialog.set(false);
    });
  }
  async toggleCookingMode() {
    if (this.cookingMode()) {
      await this.releaseWakeLock();
      return;
    }
    if (!('wakeLock' in navigator)) {
      this.error.set('Kochmodus wird von diesem Browser nicht unterstützt.');
      return;
    }
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      this.cookingMode.set(true);
      this.wakeLock.addEventListener('release', () => this.cookingMode.set(false), { once: true });
    } catch {
      this.error.set('Kochmodus konnte nicht aktiviert werden.');
    }
  }
  ngOnDestroy() { void this.releaseWakeLock(); }
  private wakeLock: WakeLockSentinel | null = null;
  private async releaseWakeLock() {
    if (this.wakeLock) await this.wakeLock.release();
    this.wakeLock = null;
    this.cookingMode.set(false);
  }
  private recipeNutrients(recipe: Recipe): MealNutrients {
    return {
      kcal: Number(recipe.calories) || 0, protein_g: Number(recipe.protein) || 0,
      fat_g: Number(recipe.fat) || 0, carbs_g: Number(recipe.carbs) || 0,
      fiber_g: Number(recipe.fiber) || 0, salt_g: Number(recipe.salt) || 0,
    };
  }
  private parseIngredientGroups(value: string): IngredientGroup[] {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        const groups = parsed.map((entry) => {
          if (typeof entry === 'string') return { name: '', items: [entry], pending: '' };
          const record = entry as Record<string, unknown>;
          return { name: typeof record['name'] === 'string' ? record['name'] : '',
            items: Array.isArray(record['items']) ? record['items'].filter((item): item is string => typeof item === 'string') : [], pending: '' };
        });
        if (groups.length) return groups;
      }
    } catch { /* Older recipes use plain text. */ }
    return [{ name: '', items: this.listItems(value), pending: '' }];
  }
  private round(value: number) { return Math.round((value + Number.EPSILON) * 10) / 10; }
  private localDate(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  private async run(action: () => Promise<void>) {
    this.saving.set(true); this.error.set('');
    try { await action(); } catch (error) { this.error.set(this.message(error)); }
    finally { this.saving.set(false); }
  }
  private emptyDraft(): RecipeDraft {
    return { name: '', ingredients: '', preparation: '', calories: null, protein: null, carbs: null,
      fat: null, fiber: null, salt: null, servings: 1, prep_time: null, rating: null,
      image_url: null, meal_prep: false, tips: null, is_favourite: false };
  }
  private message(error: unknown) { return error instanceof Error ? error.message : 'Etwas ist schiefgelaufen.'; }
}
