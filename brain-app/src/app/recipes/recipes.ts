import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Recipe, RecipeDraft, RecipesService } from './recipes.service';

@Component({
  selector: 'app-recipes', imports: [FormsModule, RouterLink],
  templateUrl: './recipes.html', styleUrl: './recipes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Recipes {
  private readonly service = inject(RecipesService);
  readonly recipes = signal<Recipe[]>([]); readonly loading = signal(true); readonly saving = signal(false);
  readonly error = signal(''); readonly query = signal(''); readonly filter = signal<'all'|'favourites'|'meal-prep'>('all');
  readonly selected = signal<Recipe | null>(null); readonly editing = signal(false);
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
  newRecipe() { this.selected.set(null); this.draft.set(this.emptyDraft()); this.editing.set(true); }
  open(recipe: Recipe) { this.selected.set(recipe); this.editing.set(false); }
  edit(recipe: Recipe) {
    const { id: _id, user_id: _user, created_at: _created, updated_at: _updated, ...draft } = recipe;
    this.selected.set(recipe); this.draft.set(draft); this.editing.set(true);
  }
  update<K extends keyof RecipeDraft>(key: K, value: RecipeDraft[K]) {
    this.draft.update((current) => ({ ...current, [key]: value }));
  }
  numeric(key: keyof RecipeDraft, value: string | number) {
    this.update(key, value === '' ? null as never : Math.max(0, Number(value)) as never);
  }
  async save() {
    const draft = this.draft();
    if (!draft.name.trim() || !draft.ingredients.trim() || !draft.preparation.trim()) {
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
