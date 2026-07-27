import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GreasingTheGroove } from './greasing-the-groove';
import { GreasingTheGrooveService } from './greasing-the-groove.service';

describe('GreasingTheGroove', () => {
  const day = {
    id: 'day-1',
    user_id: 'user-1',
    practice_date: new Date().toISOString().slice(0, 10),
    started_at: '2026-07-27T08:00:00Z',
    sport_workout_id: 'workout-1',
    created_at: '2026-07-27T08:00:00Z',
  };
  const entry = {
    id: 'entry-1',
    user_id: 'user-1',
    day_id: 'day-1',
    exercise_id: 'exercise-1',
    name: 'Pull-up',
    reps: 10,
    created_at: '2026-07-27T08:01:00Z',
  };
  const service = {
    load: vi.fn().mockResolvedValue({
      days: [day],
      entries: [entry],
      exercises: [
        { id: 'exercise-1', name: 'Pull-up' },
        { id: 'exercise-2', name: 'Push-up' },
      ],
    }),
    startDay: vi.fn().mockResolvedValue(day),
    createSportEntry: vi.fn().mockImplementation(async (current) => ({
      ...current,
      sport_workout_id: 'workout-1',
    })),
    addExercise: vi.fn(),
    setReps: vi.fn().mockImplementation(async (_day, current, reps) => ({ ...current, reps })),
    removeExercise: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [GreasingTheGroove],
      providers: [provideRouter([]), { provide: GreasingTheGrooveService, useValue: service }],
    }).compileComponents();
  });

  it('shows the daily total and filters already selected exercises', async () => {
    const fixture = TestBed.createComponent(GreasingTheGroove);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.totalReps()).toBe(10);
    expect(fixture.componentInstance.availableExercises()).toEqual([
      { id: 'exercise-2', name: 'Push-up' },
    ]);
    expect(fixture.nativeElement.textContent).toContain('Pull-up');
  });

  it('persists accumulated repetitions', async () => {
    const fixture = TestBed.createComponent(GreasingTheGroove);
    await fixture.whenStable();
    await fixture.componentInstance.addReps(entry, 5);
    expect(service.setReps).toHaveBeenCalledWith(day, entry, 15, [entry]);
    expect(fixture.componentInstance.totalReps()).toBe(15);
  });

  it('uses a single start operation for an empty date', async () => {
    service.load.mockResolvedValueOnce({ days: [], entries: [], exercises: [] });
    const fixture = TestBed.createComponent(GreasingTheGroove);
    await fixture.whenStable();
    await fixture.componentInstance.startDay();
    expect(service.startDay).toHaveBeenCalledWith(expect.any(String));
    expect(fixture.componentInstance.days()).toContain(day);
  });

  it('creates a linked sport entry for a past day', async () => {
    const pastDay = { ...day, practice_date: '2026-06-02', sport_workout_id: null };
    service.load.mockResolvedValueOnce({ days: [pastDay], entries: [], exercises: [] });
    const fixture = TestBed.createComponent(GreasingTheGroove);
    fixture.componentInstance.selectedDate.set('2026-06-02');
    await fixture.whenStable();
    fixture.componentInstance.days.set([pastDay]);
    await fixture.componentInstance.createSportEntry();
    expect(service.createSportEntry).toHaveBeenCalledWith(pastDay, []);
    expect(fixture.componentInstance.selectedDay()?.sport_workout_id).toBe('workout-1');
  });
});
