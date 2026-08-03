import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from '../core/auth.service';
import { FlashcardsService } from './flashcards.service';

describe('FlashcardsService', () => {
  const calls: Array<{ table: string; operation: string; args: unknown[] }> = [];
  let responses: Record<string, { data?: unknown[]; error?: unknown }>;

  const client = {
    from(table: string) {
      const chain = {
        select(...args: unknown[]) {
          calls.push({ table, operation: 'select', args });
          return chain;
        },
        insert(...args: unknown[]) {
          calls.push({ table, operation: 'insert', args });
          return chain;
        },
        update(...args: unknown[]) {
          calls.push({ table, operation: 'update', args });
          return chain;
        },
        delete(...args: unknown[]) {
          calls.push({ table, operation: 'delete', args });
          return chain;
        },
        eq(...args: unknown[]) {
          calls.push({ table, operation: 'eq', args });
          return chain;
        },
        order(...args: unknown[]) {
          calls.push({ table, operation: 'order', args });
          return chain;
        },
        limit(...args: unknown[]) {
          calls.push({ table, operation: 'limit', args });
          return chain;
        },
        then(resolve: (value: unknown) => void) {
          resolve(responses[table] ?? { data: [], error: null });
        },
      };
      return chain;
    },
  };

  beforeEach(() => {
    calls.length = 0;
    responses = {};
    TestBed.configureTestingModule({
      providers: [
        FlashcardsService,
        {
          provide: AuthService,
          useValue: {
            supabase: client,
            session: () => ({ user: { id: 'user-1' } }),
          },
        },
      ],
    });
  });

  it('loads categories and cards scoped to the signed-in user', async () => {
    responses = {
      flashcard_categories: { data: [{ id: 'c', name: 'QM' }] },
      flashcards: { data: [{ id: '1', category_id: 'c' }] },
    };
    const result = await TestBed.inject(FlashcardsService).load();
    expect(result.categories).toHaveLength(1);
    expect(result.cards).toHaveLength(1);
    expect(calls.filter((call) => call.operation === 'eq')).toEqual([
      { table: 'flashcard_categories', operation: 'eq', args: ['user_id', 'user-1'] },
      { table: 'flashcards', operation: 'eq', args: ['user_id', 'user-1'] },
    ]);
  });

  it('scopes card updates and deletes to the signed-in user', async () => {
    const service = TestBed.inject(FlashcardsService);
    await service.saveCard({ front: 'Q', back: 'A' }, 'card-1');
    await service.removeCard('card-1');
    const userFilters = calls.filter(
      (call) => call.operation === 'eq' && call.args[0] === 'user_id',
    );
    expect(userFilters).toHaveLength(2);
    expect(userFilters.every((call) => call.args[1] === 'user-1')).toBe(true);
  });

  it('refuses to delete a category that still contains cards', async () => {
    responses['flashcards'] = { data: [{ id: 'card-1' }] };
    await expect(TestBed.inject(FlashcardsService).removeCategory('c')).rejects.toThrow(
      'Kategorie enthält noch Karten',
    );
    expect(
      calls.some((call) => call.table === 'flashcard_categories' && call.operation === 'delete'),
    ).toBe(false);
  });

  it('deletes an empty category with category and user filters', async () => {
    responses['flashcards'] = { data: [] };
    await TestBed.inject(FlashcardsService).removeCategory('c');
    expect(calls).toContainEqual({
      table: 'flashcard_categories',
      operation: 'eq',
      args: ['user_id', 'user-1'],
    });
  });

  it('propagates database errors', async () => {
    responses['flashcards'] = { error: new Error('Datenbank nicht erreichbar') };
    await expect(TestBed.inject(FlashcardsService).load()).rejects.toThrow(
      'Datenbank nicht erreichbar',
    );
  });
});
