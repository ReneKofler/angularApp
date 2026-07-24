import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Crossfit } from './crossfit';
import { CrossfitLog, CrossfitService, LibraryWorkout } from './crossfit.service';

describe('Crossfit', () => {
  const library: LibraryWorkout = {
    id: 'library-1',
    user_id: 'user-1',
    name: 'Fran',
    crossfit_type: 'for_time',
    exercises: ['21-15-9 Thrusters', 'Pull-ups'],
    time_cap: 10,
    rounds: null,
    work_minutes: null,
    rest_minutes: null,
    is_favourite: true,
    description: 'Classic couplet',
    amrap_duration: null,
    is_hero: false,
    is_girl: true,
    is_open: false,
    total_reps: 90,
    is_partner: false,
    crossfit_focus: 'Conditioning',
  };
  const log: CrossfitLog = {
    id: 'log-1',
    user_id: 'user-1',
    workout_type: 'crossfit',
    workout_date: '2026-07-24',
    workout_name: 'Fran',
    crossfit_type: 'for_time',
    crossfit_description: 'Classic couplet',
    exercises: library.exercises,
    time_cap: 10,
    rounds: null,
    work_minutes: null,
    rest_minutes: null,
    duration: null,
    result_rounds: null,
    total_reps: null,
    dnf: true,
    missing_reps: 6,
    avg_heart_rate: 150,
    is_hero: false,
    is_girl: true,
    is_open: false,
    is_partner: false,
    done_alone: null,
    notes: null,
  };
  const service = {
    load: vi
      .fn()
      .mockResolvedValue({ library: [library], logs: [log], exercises: [], records: [] }),
    saveLibrary: vi.fn(),
    toggleFavourite: vi.fn(),
    deleteLibrary: vi.fn(),
    saveLog: vi.fn().mockResolvedValue(log),
    deleteLog: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    service.load.mockResolvedValue({ library: [library], logs: [log], exercises: [], records: [] });
    await TestBed.configureTestingModule({
      imports: [Crossfit],
      providers: [provideRouter([]), { provide: CrossfitService, useValue: service }],
    }).compileComponents();
  });

  it('renders library metadata and result variants', async () => {
    const fixture = TestBed.createComponent(Crossfit);
    await fixture.whenStable();
    fixture.componentInstance.tab.set('workouts');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Fran');
    expect(fixture.nativeElement.textContent).toContain('Time Cap 10 Min.');
    expect(fixture.nativeElement.textContent).toContain('Girl');

    fixture.componentInstance.tab.set('sports');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('DNF · 6 Reps fehlen');
  });

  it('populates a log from a selected library workout', async () => {
    const fixture = TestBed.createComponent(Crossfit);
    await fixture.whenStable();
    fixture.componentInstance.startLog(library);
    fixture.componentInstance.logDuration.set('07:42');
    await fixture.componentInstance.saveLog();

    expect(service.saveLog).toHaveBeenCalledWith(
      expect.objectContaining({
        workout_type: 'crossfit',
        workout_name: 'Fran',
        crossfit_type: 'for_time',
        exercises: library.exercises,
        duration: '07:42',
        is_girl: true,
      }),
    );
  });

  it('keeps DNF and missing reps together', async () => {
    const fixture = TestBed.createComponent(Crossfit);
    await fixture.whenStable();
    fixture.componentInstance.startLog(library);
    fixture.componentInstance.logDnf.set(true);
    fixture.componentInstance.logMissingReps.set(4);
    await fixture.componentInstance.saveLog();

    expect(service.saveLog).toHaveBeenCalledWith(
      expect.objectContaining({ dnf: true, missing_reps: 4, duration: null }),
    );
  });
});
