import { HabitCheck } from './habits.service';
import { currentStreak, localDate } from './habits';

describe('habit date helpers', () => {
  it('formats dates without shifting the local calendar day', () => {
    const date = new Date(2026, 6, 20, 23, 30);
    expect(localDate(date)).toBe('2026-07-20');
  });
  it('counts only consecutive completed days through the selected date', () => {
    const checks = [
      { habit_id: 'h1', check_date: '2026-07-20', checked: true },
      { habit_id: 'h1', check_date: '2026-07-19', checked: true },
      { habit_id: 'h1', check_date: '2026-07-18', checked: false },
      { habit_id: 'h1', check_date: '2026-07-17', checked: true },
    ] as HabitCheck[];
    expect(currentStreak(checks, 'h1', '2026-07-20')).toBe(2);
    expect(currentStreak(checks, 'h1', '2026-07-19')).toBe(1);
  });
});
