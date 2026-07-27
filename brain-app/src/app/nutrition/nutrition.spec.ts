import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Nutrition } from './nutrition';
import { DEFAULT_DIET_GOALS, NutritionService } from './nutrition.service';

describe('Nutrition', () => {
  const meal = {
    id: 'meal-1', user_id: 'user-1', name: 'Frühstück', meal_date: '2026-07-27',
    kcal: 501.25, protein_g: 30.04, fat_g: 12.05, carbs_g: 60.06, fiber_g: 8.04, salt_g: 1.26,
  };
  const service = {
    load: vi.fn().mockResolvedValue({ meals: [meal], settings: DEFAULT_DIET_GOALS, history: [] }),
    saveMeal: vi.fn(), deleteMeal: vi.fn(),
    saveGoals: vi.fn().mockImplementation(async (goals) => goals),
  };
  beforeEach(async () => {
    vi.clearAllMocks();
    await TestBed.configureTestingModule({
      imports: [Nutrition],
      providers: [provideRouter([]), { provide: NutritionService, useValue: service }],
    }).compileComponents();
  });

  it('calculates and rounds all daily nutrient totals', async () => {
    const fixture = TestBed.createComponent(Nutrition);
    await fixture.whenStable();
    expect(fixture.componentInstance.rounded(fixture.componentInstance.totals().kcal)).toBe(501.3);
    expect(fixture.componentInstance.rounded(fixture.componentInstance.totals().salt_g)).toBe(1.3);
  });

  it('calculates capped goal progress', async () => {
    const fixture = TestBed.createComponent(Nutrition);
    await fixture.whenStable();
    expect(fixture.componentInstance.progress(500, 2000)).toBe(25);
    expect(fixture.componentInstance.progress(2500, 2000)).toBe(100);
  });

  it('saves every meal nutrient for the selected date', async () => {
    const fixture = TestBed.createComponent(Nutrition);
    await fixture.whenStable();
    fixture.componentInstance.newMeal();
    fixture.componentInstance.name.set('Mittagessen');
    fixture.componentInstance.setNutrient('fiber_g', 9.5);
    await fixture.componentInstance.saveMeal();
    expect(service.saveMeal).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Mittagessen', fiber_g: 9.5, meal_date: expect.any(String),
    }), undefined);
  });

  it('uses the latest goal snapshot applicable to a historical date', async () => {
    const fixture = TestBed.createComponent(Nutrition);
    await fixture.whenStable();
    fixture.componentInstance.date.set('2026-06-15');
    fixture.componentInstance.history.set([
      { ...DEFAULT_DIET_GOALS, id: 'new', user_id: 'u', calorie_goal: 2400, changed_at: '2026-07-01T00:00:00Z' },
      { ...DEFAULT_DIET_GOALS, id: 'old', user_id: 'u', calorie_goal: 1800, changed_at: '2026-06-01T00:00:00Z' },
    ]);
    expect(fixture.componentInstance.activeGoals().calorie_goal).toBe(1800);
  });
});
