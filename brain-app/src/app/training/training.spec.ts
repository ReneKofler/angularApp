import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Training } from './training';
import { TrainingService } from './training.service';

describe('Training', () => {
  const equipment = [{ id: 'eq-1', user_id: 'u', name: 'Barbell', icon: '🏋️' }];
  const exercises = [
    {
      id: 'ex-1',
      user_id: 'u',
      name: 'Back Squat',
      equipment_ids: ['eq-1'],
      muscle_group_ids: ['legs'],
      has_1rm: true,
      has_max_reps: false,
      has_kg: true,
      has_meter: false,
      has_reps: true,
      has_calories: false,
      has_time: false,
    },
  ];
  const plans = [
    {
      id: 'plan-1',
      user_id: 'u',
      name: 'Leg Day',
      description: null,
      duration_estimate: '45 Min.',
      exercises: [{ exercise_id: 'ex-1', name: 'Back Squat', sets: 3, reps: 5 }],
    },
  ];
  const service = {
    load: vi.fn().mockResolvedValue({ equipment, exercises, plans }),
    saveEquipment: vi.fn(),
    deleteEquipment: vi.fn(),
    saveExercise: vi.fn(),
    deleteExercise: vi.fn(),
    savePlan: vi.fn(),
    deletePlan: vi.fn(),
    logPlan: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [Training],
      providers: [provideRouter([]), { provide: TrainingService, useValue: service }],
    }).compileComponents();
  });

  it('renders capability and equipment associations', async () => {
    const fixture = TestBed.createComponent(Training);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Back Squat');
    expect(fixture.nativeElement.textContent).toContain('Barbell');
    expect(fixture.nativeElement.textContent).toContain('1RM');
  });

  it('adds ordered exercises to a plan', async () => {
    const fixture = TestBed.createComponent(Training);
    await fixture.whenStable();
    fixture.componentInstance.newItem('plan');
    fixture.componentInstance.addPlanExercise('ex-1');
    fixture.componentInstance.addPlanExercise('ex-1');
    fixture.componentInstance.movePlanExercise(1, -1);
    expect(fixture.componentInstance.planExercises()).toHaveLength(2);
  });

  it('logs a plan as a workout', async () => {
    const fixture = TestBed.createComponent(Training);
    await fixture.whenStable();
    fixture.componentInstance.openLog(plans[0]);
    fixture.componentInstance.logDuration.set('42:00');
    await fixture.componentInstance.saveLog();
    expect(service.logPlan).toHaveBeenCalledWith(plans[0], expect.any(String), '42:00', '');
  });
});
