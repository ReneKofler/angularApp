import { Injectable, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';

export type NoteMode = 'text' | 'checklist';
export type NotePriority = 'low' | 'normal' | 'high';
export interface NoteList { id: string; user_id: string; name: string; position: number; created_at?: string; }
export interface Note {
  id: string; user_id: string; title: string; content: string; tags: string[]; done: boolean;
  list_id: string | null; position: number; reminder_date: string | null; mode: NoteMode;
  priority: NotePriority; created_at?: string; updated_at?: string;
}
export type NoteDraft = Pick<Note, 'title' | 'content' | 'tags' | 'done' | 'list_id' | 'position' | 'reminder_date' | 'mode' | 'priority'>;

@Injectable({ providedIn: 'root' })
export class NotesService {
  private readonly auth = inject(AuthService);

  async load(): Promise<{ notes: Note[]; lists: NoteList[] }> {
    const client = this.client();
    const [notesResult, listsResult] = await Promise.all([
      client.from('notes').select('*').order('position').order('created_at', { ascending: false }),
      client.from('note_lists').select('*').order('position').order('created_at'),
    ]);
    if (notesResult.error) throw notesResult.error;
    if (listsResult.error) throw listsResult.error;
    return { notes: (notesResult.data ?? []) as Note[], lists: (listsResult.data ?? []) as NoteList[] };
  }

  async saveNote(draft: NoteDraft, id?: string): Promise<Note> {
    const client = this.client();
    const userId = this.userId();
    const query = id
      ? client.from('notes').update(draft).eq('id', id).eq('user_id', userId)
      : client.from('notes').insert({ ...draft, user_id: userId });
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data as Note;
  }

  async deleteNote(id: string): Promise<void> {
    const { error } = await this.client().from('notes').delete().eq('id', id).eq('user_id', this.userId());
    if (error) throw error;
  }

  async saveList(name: string, position: number, id?: string): Promise<NoteList> {
    const client = this.client();
    const userId = this.userId();
    const query = id
      ? client.from('note_lists').update({ name, position }).eq('id', id).eq('user_id', userId)
      : client.from('note_lists').insert({ name, position, user_id: userId });
    const { data, error } = await query.select().single();
    if (error) throw error;
    return data as NoteList;
  }

  async deleteList(id: string): Promise<void> {
    const client = this.client();
    const userId = this.userId();
    const { error: unlinkError } = await client.from('notes').update({ list_id: null }).eq('list_id', id).eq('user_id', userId);
    if (unlinkError) throw unlinkError;
    const { error } = await client.from('note_lists').delete().eq('id', id).eq('user_id', userId);
    if (error) throw error;
  }

  private client() {
    const client = this.auth.supabase;
    if (!client) throw new Error('Supabase is not configured.');
    return client;
  }
  private userId(): string {
    const userId = this.auth.session()?.user.id;
    if (!userId) throw new Error('Sign in to manage notes.');
    return userId;
  }
}
