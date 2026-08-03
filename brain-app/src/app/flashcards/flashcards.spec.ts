import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Flashcards } from './flashcards';
import { FlashcardsService } from './flashcards.service';
describe('Flashcards', () => {
  const service = {
    load: vi.fn(),
    saveCategory: vi.fn(),
    removeCategory: vi.fn(),
    saveCard: vi.fn(),
    removeCard: vi.fn(),
  };
  beforeEach(async () => {
    vi.clearAllMocks();
    service.load.mockResolvedValue({
      categories: [{ id: 'c', name: 'Deutsch' }],
      cards: [
        { id: '1', category_id: 'c', title: 'Hallo', front: 'Hallo', back: 'Hello' },
        { id: '2', category_id: 'c', title: 'Tschüss', front: 'Tschüss', back: 'Bye' },
      ],
    });
    await TestBed.configureTestingModule({
      imports: [Flashcards],
      providers: [provideRouter([]), { provide: FlashcardsService, useValue: service }],
    }).compileComponents();
  });
  it('filters titles and card sides', async () => {
    const f = TestBed.createComponent(Flashcards);
    await f.whenStable();
    f.componentInstance.openCategory('c');
    f.componentInstance.query.set('hello');
    expect(f.componentInstance.visible().map((x) => x.id)).toEqual(['1']);
  });
  it('reveals and navigates study cards', async () => {
    const f = TestBed.createComponent(Flashcards);
    await f.whenStable();
    f.componentInstance.openCategory('c');
    f.componentInstance.startStudy();
    expect(f.componentInstance.current()?.id).toBe('1');
    f.componentInstance.toggleReveal();
    expect(f.componentInstance.revealed()).toBe(true);
    f.componentInstance.next(1);
    expect(f.componentInstance.current()?.id).toBe('2');
    expect(f.componentInstance.revealed()).toBe(false);
  });
  it('removes correctly answered cards and tracks the score', async () => {
    const f = TestBed.createComponent(Flashcards);
    await f.whenStable();
    f.componentInstance.openCategory('c');
    f.componentInstance.startStudy();
    f.componentInstance.answer(true);
    expect(f.componentInstance.correct()).toBe(1);
    expect(f.componentInstance.studyCards().map((card) => card.id)).toEqual(['2']);
    expect(f.componentInstance.current()?.id).toBe('2');
  });
  it('saves front and back content', async () => {
    const f = TestBed.createComponent(Flashcards);
    await f.whenStable();
    f.componentInstance.openCategory('c');
    f.componentInstance.newCard();
    f.componentInstance.patch('front', 'Frage');
    f.componentInstance.patch('back', 'Antwort');
    await f.componentInstance.saveCard();
    expect(service.saveCard).toHaveBeenCalledWith(
      expect.objectContaining({ front: 'Frage', back: 'Antwort', category_id: 'c' }),
      undefined,
    );
  });
});
