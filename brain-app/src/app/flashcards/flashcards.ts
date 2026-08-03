import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Flashcard, FlashcardCategory, FlashcardsService } from './flashcards.service';
@Component({
  selector: 'app-flashcards',
  imports: [FormsModule, RouterLink],
  templateUrl: './flashcards.html',
  styleUrl: './flashcards.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Flashcards {
  private service = inject(FlashcardsService);
  readonly categories = signal<FlashcardCategory[]>([]);
  readonly cards = signal<Flashcard[]>([]);
  readonly selected = signal('');
  readonly query = signal('');
  readonly editor = signal(false);
  readonly categoryEditor = signal(false);
  readonly study = signal(false);
  readonly revealed = signal(false);
  readonly studyIndex = signal(0);
  readonly editing = signal<string | null>(null);
  readonly categoryName = signal('');
  readonly error = signal('');
  readonly message = signal('');
  readonly form = signal({ title: '', front: '', back: '', category_id: '' });
  readonly visible = computed(() =>
    this.cards().filter(
      (x) =>
        (!this.selected() || x.category_id === this.selected()) &&
        `${x.title} ${x.front} ${x.back}`.toLowerCase().includes(this.query().toLowerCase()),
    ),
  );
  readonly current = computed(() => this.visible()[this.studyIndex()]);
  constructor() {
    void this.load();
  }
  async load() {
    try {
      const x = await this.service.load();
      this.categories.set(x.categories);
      this.cards.set(x.cards);
    } catch (e) {
      this.error.set(this.text(e));
    }
  }
  openCategory(id: string) {
    this.selected.set(id);
    this.query.set('');
  }
  closeCategory() {
    this.selected.set('');
    this.study.set(false);
  }
  count(id: string) {
    return this.cards().filter((x) => x.category_id === id).length;
  }
  newCategory() {
    this.categoryName.set('');
    this.categoryEditor.set(true);
  }
  async saveCategory() {
    const name = this.categoryName().trim();
    if (!name) return;
    try {
      await this.service.saveCategory(name);
      this.categoryEditor.set(false);
      await this.load();
    } catch (e) {
      this.error.set(this.text(e));
    }
  }
  async removeCategory() {
    const id = this.selected();
    if (id && confirm('Kategorie wirklich löschen?'))
      try {
        await this.service.removeCategory(id);
        this.closeCategory();
        await this.load();
      } catch (e) {
        this.error.set(this.text(e));
      }
  }
  newCard() {
    this.editing.set(null);
    this.form.set({ title: '', front: '', back: '', category_id: this.selected() });
    this.editor.set(true);
  }
  edit(x: Flashcard) {
    this.editing.set(x.id);
    this.form.set({ title: x.title, front: x.front, back: x.back, category_id: x.category_id });
    this.editor.set(true);
  }
  patch(k: string, v: string) {
    this.form.update((x) => ({ ...x, [k]: v }));
  }
  async saveCard() {
    const f = this.form();
    if (!f.front.trim() || !f.back.trim()) return;
    try {
      await this.service.saveCard(f, this.editing() ?? undefined);
      this.editor.set(false);
      this.message.set('Karte gespeichert.');
      await this.load();
    } catch (e) {
      this.error.set(this.text(e));
    }
  }
  async removeCard() {
    const id = this.editing();
    if (id && confirm('Karte wirklich löschen?'))
      try {
        await this.service.removeCard(id);
        this.editor.set(false);
        await this.load();
      } catch (e) {
        this.error.set(this.text(e));
      }
  }
  startStudy() {
    if (!this.visible().length) return;
    this.studyIndex.set(0);
    this.revealed.set(false);
    this.study.set(true);
  }
  toggleReveal() {
    this.revealed.update((x) => !x);
  }
  next(delta: number) {
    const n = this.visible().length;
    if (!n) return;
    this.studyIndex.update((i) => (i + delta + n) % n);
    this.revealed.set(false);
  }
  handleStudyKey(e: KeyboardEvent) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      this.toggleReveal();
    }
    if (e.key === 'ArrowRight') this.next(1);
    if (e.key === 'ArrowLeft') this.next(-1);
  }
  category() {
    return this.categories().find((x) => x.id === this.selected());
  }
  private text(e: unknown) {
    return e instanceof Error ? e.message : 'Etwas ist schiefgelaufen.';
  }
}
