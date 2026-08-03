import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Ranking, RankingCategory, RankingsService, ConsumedDate } from './rankings.service';
@Component({
  selector: 'app-rankings',
  imports: [FormsModule, RouterLink],
  templateUrl: './rankings.html',
  styleUrl: './rankings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Rankings {
  private service = inject(RankingsService);
  readonly categories = signal<RankingCategory[]>([]);
  readonly items = signal<Ranking[]>([]);
  readonly history = signal<ConsumedDate[]>([]);
  readonly selected = signal('');
  readonly query = signal('');
  readonly sort = signal<'rating' | 'name' | 'priority'>('rating');
  readonly editor = signal(false);
  readonly categoryEditor = signal(false);
  readonly editingCategory = signal<string | null>(null);
  readonly editing = signal<string | null>(null);
  readonly error = signal('');
  readonly message = signal('');
  readonly form = signal<any>({
    name: '',
    rating: 0,
    status: 'Geplant',
    priority: 0,
    watched_episodes: 0,
  });
  readonly categoryForm = signal<any>({
    name: '',
    icon: '⭐',
    color: '#d9167b',
    view_mode: 'grid',
    show_year: true,
  });
  readonly category = computed(() => this.categories().find((x) => x.id === this.selected()));
  readonly visible = computed(() =>
    this.items()
      .filter(
        (x) =>
          (!this.selected() || x.category_id === this.selected()) &&
          x.name.toLowerCase().includes(this.query().toLowerCase()),
      )
      .sort((a, b) =>
        this.sort() === 'name'
          ? a.name.localeCompare(b.name)
          : Number(b[this.sort()] ?? 0) - Number(a[this.sort()] ?? 0),
      ),
  );
  constructor() {
    void this.load();
  }
  async load() {
    try {
      const x = await this.service.load();
      this.categories.set(x.categories);
      this.items.set(x.rankings);
      this.history.set(x.history);
      if (!this.selected() && x.categories[0]) this.selected.set(x.categories[0].id);
    } catch (e) {
      this.error.set(this.text(e));
    }
  }
  newItem() {
    this.editing.set(null);
    this.form.set({
      name: '',
      category_id: this.selected(),
      rating: 0,
      status: 'Geplant',
      priority: 0,
      watched_episodes: 0,
    });
    this.editor.set(true);
  }
  edit(x: Ranking) {
    this.editing.set(x.id);
    this.form.set({ ...x });
    this.editor.set(true);
  }
  patch(key: string, value: any) {
    this.form.update((x: any) => ({ ...x, [key]: value }));
  }
  patchCategory(key: string, value: any) {
    this.categoryForm.update((x: any) => ({ ...x, [key]: value }));
  }
  async save() {
    try {
      await this.service.saveRanking(this.form(), this.editing() ?? undefined);
      this.editor.set(false);
      this.message.set('Eintrag gespeichert.');
      await this.load();
    } catch (e) {
      this.error.set(this.text(e));
    }
  }
  async remove() {
    const id = this.editing();
    if (id && confirm('Eintrag wirklich löschen?')) {
      try {
        await this.service.removeRanking(id);
        this.editor.set(false);
        await this.load();
      } catch (e) {
        this.error.set(this.text(e));
      }
    }
  }
  newCategory() {
    this.editingCategory.set(null);
    this.categoryForm.set({
      name: '',
      icon: '⭐',
      color: '#d9167b',
      position: this.categories().length,
      view_mode: 'grid',
      show_year: true,
    });
    this.categoryEditor.set(true);
  }
  editCategory() {
    const current = this.category();
    if (!current) return;
    this.editingCategory.set(current.id);
    this.categoryForm.set({ ...current });
    this.categoryEditor.set(true);
  }
  async saveCategory() {
    try {
      await this.service.saveCategory(this.categoryForm(), this.editingCategory() ?? undefined);
      this.categoryEditor.set(false);
      await this.load();
    } catch (e) {
      this.error.set(this.text(e));
    }
  }
  async removeCategory() {
    const id = this.editingCategory();
    if (!id || !confirm('Kategorie wirklich löschen?')) return;
    try {
      await this.service.removeCategory(id);
      this.selected.set('');
      this.categoryEditor.set(false);
      await this.load();
    } catch (e) {
      this.error.set(this.text(e));
    }
  }
  async consume(x: Ranking) {
    try {
      await this.service.consume(x.id, new Date().toISOString().slice(0, 10));
      this.message.set('Als konsumiert markiert.');
      await this.load();
    } catch (e) {
      this.error.set(this.text(e));
    }
  }
  dates(id: string) {
    return this.history().filter((x) => x.ranking_id === id);
  }
  progress(x: Ranking) {
    return x.episodes
      ? Math.min(100, Math.round(((x.watched_episodes ?? 0) / x.episodes) * 100))
      : 0;
  }
  private text(e: unknown) {
    return e instanceof Error ? e.message : 'Etwas ist schiefgelaufen.';
  }
}
