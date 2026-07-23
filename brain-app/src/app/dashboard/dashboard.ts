import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

interface Module {
  icon: string;
  name: string;
  description: string;
  accent: string;
  route?: string;
}

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Dashboard {
  readonly auth = inject(AuthService);
  readonly modules: Module[] = [
    { icon: '✓', name: 'Habits', description: 'Daily checks and streaks', accent: '#45806a' },
    { icon: '✎', name: 'Notes', description: 'Capture ideas and reminders', accent: '#b97845', route: '/notes' },
    { icon: '↗', name: 'Workouts', description: 'Training, records and plans', accent: '#536e9d', route: '/workouts' },
    { icon: '◇', name: 'Nutrition', description: 'Meals, recipes and goals', accent: '#9d655c' },
    { icon: '◯', name: 'Body', description: 'Measurements and milestones', accent: '#80649b' },
    { icon: '☷', name: 'Journal', description: 'Reflect on your days', accent: '#6d8061' },
    { icon: '☆', name: 'Flashcards', description: 'Learn and remember', accent: '#b39045' },
    {
      icon: '+',
      name: 'More',
      description: 'Groceries, rankings and playbooks',
      accent: '#65736e',
    },
  ];
}
