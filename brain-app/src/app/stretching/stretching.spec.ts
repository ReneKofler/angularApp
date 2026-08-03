import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StretchingService } from './stretching.service';
import { Stretching } from './stretching';

describe('Stretching', () => {
  const routine = { id: 'r', user_id: 'u', name: 'Morgenroutine', description: '', emoji: '🧘' };
  const items = [
    {
      id: '1',
      user_id: 'u',
      routine_id: 'r',
      name: 'Nacken',
      emoji: '🙆',
      duration_seconds: 2,
      notes: 'Langsam',
      image_url: 'bad.jpg',
      position: 0,
    },
    {
      id: '2',
      user_id: 'u',
      routine_id: 'r',
      name: 'Schulter',
      emoji: '🤸',
      duration_seconds: 30,
      notes: '',
      image_url: '',
      position: 1,
    },
  ];
  const service = {
    load: vi.fn(),
    saveRoutine: vi.fn(),
    removeRoutine: vi.fn(),
    saveExercise: vi.fn(),
    removeExercise: vi.fn(),
    reorder: vi.fn(),
  };
  beforeEach(async () => {
    vi.clearAllMocks();
    service.load.mockResolvedValue({ routines: [routine], exercises: items });
    await TestBed.configureTestingModule({
      imports: [Stretching],
      providers: [provideRouter([]), { provide: StretchingService, useValue: service }],
    }).compileComponents();
  });
  it('loads and selects the first routine', async () => {
    const f = TestBed.createComponent(Stretching);
    await f.whenStable();
    expect(f.componentInstance.selected()).toBe('r');
    expect(f.componentInstance.items()).toHaveLength(2);
  });
  it('creates and updates exercises with stable positions', async () => {
    const f = TestBed.createComponent(Stretching);
    await f.whenStable();
    f.componentInstance.patch('name', 'Hüfte');
    await f.componentInstance.save();
    expect(service.saveExercise).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Hüfte', position: 2, routine_id: 'r' }),
      undefined,
    );
    f.componentInstance.edit(items[0]);
    f.componentInstance.patch('notes', 'Sanft');
    await f.componentInstance.save();
    expect(service.saveExercise).toHaveBeenLastCalledWith(
      expect.objectContaining({ notes: 'Sanft', position: 0 }),
      '1',
    );
  });
  it('persists reordered exercises', async () => {
    const f = TestBed.createComponent(Stretching);
    await f.whenStable();
    await f.componentInstance.move(items[1], -1);
    expect(f.componentInstance.items().map((x) => x.id)).toEqual(['2', '1']);
    expect(service.reorder).toHaveBeenCalled();
  });
  it('runs, pauses, navigates and interrupts guided timing', async () => {
    const f = TestBed.createComponent(Stretching);
    await f.whenStable();
    vi.useFakeTimers();
    f.componentInstance.start();
    expect(f.componentInstance.remaining()).toBe(2);
    f.componentInstance.run();
    vi.advanceTimersByTime(1000);
    expect(f.componentInstance.remaining()).toBe(1);
    f.componentInstance.navigate(1);
    expect(f.componentInstance.remaining()).toBe(30);
    expect(f.componentInstance.running()).toBe(false);
    f.componentInstance.close();
    expect(f.componentInstance.guided()).toBe(false);
    vi.useRealTimers();
  });
  it('handles empty routines and load errors', async () => {
    service.load.mockResolvedValueOnce({ routines: [], exercises: [] });
    const empty = TestBed.createComponent(Stretching);
    await empty.whenStable();
    empty.componentInstance.start();
    expect(empty.componentInstance.guided()).toBe(false);
    service.load.mockRejectedValueOnce(new Error('Laden fehlgeschlagen'));
    await empty.componentInstance.load();
    expect(empty.componentInstance.error()).toBe('Laden fehlgeschlagen');
  });
});
