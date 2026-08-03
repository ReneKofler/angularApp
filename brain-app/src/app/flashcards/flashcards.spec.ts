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
  it('puts an incorrectly answered card at the end of the round', async () => {
    const f = TestBed.createComponent(Flashcards);
    await f.whenStable();
    f.componentInstance.openCategory('c');
    f.componentInstance.startStudy();
    f.componentInstance.answer(false);
    expect(f.componentInstance.correct()).toBe(0);
    expect(f.componentInstance.studyCards().map((card) => card.id)).toEqual(['2', '1']);
    expect(f.componentInstance.current()?.id).toBe('2');
  });
  it('ends the session after the final correct answer', async () => {
    service.load.mockResolvedValueOnce({
      categories: [{ id: 'c', name: 'Deutsch' }],
      cards: [{ id: '1', category_id: 'c', title: 'Hallo', front: 'Hallo', back: 'Hello' }],
    });
    const f = TestBed.createComponent(Flashcards);
    await f.whenStable();
    f.componentInstance.startStudy();
    f.componentInstance.answer(true);
    expect(f.componentInstance.study()).toBe(false);
    expect(f.componentInstance.studyCards()).toEqual([]);
    expect(f.componentInstance.correct()).toBe(1);
  });
  it('supports flip, correct, and incorrect keyboard controls', async () => {
    const f = TestBed.createComponent(Flashcards);
    await f.whenStable();
    f.componentInstance.startStudy();
    f.componentInstance.handleStudyKey(new KeyboardEvent('keydown', { key: ' ' }));
    expect(f.componentInstance.revealed()).toBe(true);
    f.componentInstance.handleStudyKey(new KeyboardEvent('keydown', { key: 'f' }));
    expect(f.componentInstance.studyCards().map((card) => card.id)).toEqual(['2', '1']);
    f.componentInstance.toggleReveal();
    f.componentInstance.handleStudyKey(new KeyboardEvent('keydown', { key: 'r' }));
    expect(f.componentInstance.correct()).toBe(1);
  });
  it('does not start an empty round and closes an active round', async () => {
    const f = TestBed.createComponent(Flashcards);
    await f.whenStable();
    f.componentInstance.selected.set('missing');
    f.componentInstance.startStudy();
    expect(f.componentInstance.study()).toBe(false);
    f.componentInstance.openCategory('c');
    f.componentInstance.startStudy();
    f.componentInstance.closeCategory();
    expect(f.componentInstance.study()).toBe(false);
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
  it('creates categories and deletes empty categories', async () => {
    const f = TestBed.createComponent(Flashcards);
    await f.whenStable();
    f.componentInstance.categoryName.set('Software QM');
    await f.componentInstance.saveCategory();
    expect(service.saveCategory).toHaveBeenCalledWith('Software QM');
    expect(f.componentInstance.categoryName()).toBe('');
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    await f.componentInstance.removeCategory('c');
    expect(service.removeCategory).toHaveBeenCalledWith('c');
  });
  it('updates and deletes cards', async () => {
    const f = TestBed.createComponent(Flashcards);
    await f.whenStable();
    const card = f.componentInstance.cards()[0];
    f.componentInstance.edit(card);
    f.componentInstance.patch('back', 'Hi');
    await f.componentInstance.saveCard();
    expect(service.saveCard).toHaveBeenCalledWith(expect.objectContaining({ back: 'Hi' }), '1');
    f.componentInstance.edit(card);
    vi.spyOn(window, 'confirm').mockReturnValueOnce(true);
    await f.componentInstance.removeCard();
    expect(service.removeCard).toHaveBeenCalledWith('1');
  });
  it('shows service failures instead of losing them', async () => {
    service.saveCard.mockRejectedValueOnce(new Error('Speichern fehlgeschlagen'));
    const f = TestBed.createComponent(Flashcards);
    await f.whenStable();
    f.componentInstance.openCategory('c');
    f.componentInstance.patch('front', 'Frage');
    f.componentInstance.patch('back', 'Antwort');
    await f.componentInstance.saveCard();
    expect(f.componentInstance.error()).toBe('Speichern fehlgeschlagen');
  });
});
