import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Note, NoteDraft, NoteList, NoteMode, NotePriority, NotesService } from './notes.service';

@Component({
  selector: 'app-notes', imports: [FormsModule, RouterLink], templateUrl: './notes.html',
  styleUrl: './notes.scss', changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Notes {
  private readonly notesService = inject(NotesService);
  readonly notes = signal<Note[]>([]); readonly lists = signal<NoteList[]>([]);
  readonly loading = signal(true); readonly saving = signal(false); readonly error = signal('');
  readonly query = signal(''); readonly listFilter = signal('all');
  readonly statusFilter = signal<'all' | 'open' | 'done'>('all');
  readonly priorityFilter = signal<'all' | NotePriority>('all');
  readonly editingId = signal<string | null>(null); readonly editorOpen = signal(false);
  readonly title = signal(''); readonly content = signal(''); readonly tags = signal('');
  readonly done = signal(false); readonly listId = signal(''); readonly reminderDate = signal('');
  readonly mode = signal<NoteMode>('text'); readonly priority = signal<NotePriority>('normal');
  readonly listName = signal('');

  readonly filteredNotes = computed(() => {
    const needle = this.query().trim().toLocaleLowerCase();
    return this.notes().filter((note) => {
      const searchable = `${note.title} ${note.content} ${(note.tags ?? []).join(' ')}`.toLocaleLowerCase();
      return (!needle || searchable.includes(needle))
        && (this.listFilter() === 'all' || (this.listFilter() === 'none' ? note.list_id === null : note.list_id === this.listFilter()))
        && (this.statusFilter() === 'all' || (this.statusFilter() === 'done' ? note.done : !note.done))
        && (this.priorityFilter() === 'all' || note.priority === this.priorityFilter());
    });
  });

  constructor() { void this.reload(); }
  async reload(): Promise<void> {
    this.loading.set(true); this.error.set('');
    try { const data = await this.notesService.load(); this.notes.set(data.notes); this.lists.set(data.lists); }
    catch (error) { this.error.set(this.message(error)); }
    finally { this.loading.set(false); }
  }
  newNote(): void {
    this.editingId.set(null); this.title.set(''); this.content.set(''); this.tags.set('');
    this.done.set(false); this.listId.set(this.listFilter() !== 'all' && this.listFilter() !== 'none' ? this.listFilter() : '');
    this.reminderDate.set(''); this.mode.set('text'); this.priority.set('normal'); this.editorOpen.set(true);
  }
  edit(note: Note): void {
    this.editingId.set(note.id); this.title.set(note.title); this.content.set(note.content);
    this.tags.set((note.tags ?? []).join(', ')); this.done.set(note.done); this.listId.set(note.list_id ?? '');
    this.reminderDate.set(note.reminder_date ?? ''); this.mode.set(note.mode ?? 'text');
    this.priority.set(note.priority ?? 'normal'); this.editorOpen.set(true);
  }
  async save(): Promise<void> {
    if (!this.title().trim() && !this.content().trim()) { this.error.set('Add a title or some content before saving.'); return; }
    const current = this.notes().find((note) => note.id === this.editingId());
    const draft: NoteDraft = {
      title: this.title().trim(), content: this.content().trim(),
      tags: [...new Set(this.tags().split(',').map((tag) => tag.trim()).filter(Boolean))],
      done: this.done(), list_id: this.listId() || null, reminder_date: this.reminderDate() || null,
      mode: this.mode(), priority: this.priority(), position: current?.position ?? this.notes().length,
    };
    this.saving.set(true); this.error.set('');
    try { await this.notesService.saveNote(draft, this.editingId() ?? undefined); this.editorOpen.set(false); await this.reload(); }
    catch (error) { this.error.set(this.message(error)); }
    finally { this.saving.set(false); }
  }
  async toggle(note: Note): Promise<void> {
    try { await this.notesService.saveNote({ ...this.draft(note), done: !note.done }, note.id); await this.reload(); }
    catch (error) { this.error.set(this.message(error)); }
  }
  async remove(note: Note): Promise<void> {
    if (!confirm(`Delete “${note.title || 'Untitled note'}”? This cannot be undone.`)) return;
    try { await this.notesService.deleteNote(note.id); await this.reload(); }
    catch (error) { this.error.set(this.message(error)); }
  }
  async addList(): Promise<void> {
    const name = this.listName().trim(); if (!name) return;
    try { await this.notesService.saveList(name, this.lists().length); this.listName.set(''); await this.reload(); }
    catch (error) { this.error.set(this.message(error)); }
  }
  async renameList(list: NoteList): Promise<void> {
    const name = prompt('List name', list.name)?.trim(); if (!name || name === list.name) return;
    try { await this.notesService.saveList(name, list.position, list.id); await this.reload(); }
    catch (error) { this.error.set(this.message(error)); }
  }
  async removeList(list: NoteList): Promise<void> {
    if (!confirm(`Delete “${list.name}”? Its notes will move to All notes.`)) return;
    try { await this.notesService.deleteList(list.id); if (this.listFilter() === list.id) this.listFilter.set('all'); await this.reload(); }
    catch (error) { this.error.set(this.message(error)); }
  }
  private draft(note: Note): NoteDraft {
    const { title, content, tags, done, list_id, position, reminder_date, mode, priority } = note;
    return { title, content, tags, done, list_id, position, reminder_date, mode, priority };
  }
  private message(error: unknown): string { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
}
