import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

interface Module {
  icon: string;
  name: string;
  description: string;
  color: string;
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
    { icon:'🏃',name:'Sport Tracking',description:'Workouts schnell erfassen',color:'#df7b00',route:'/workouts' },
    { icon:'🏋️',name:'CrossFit',description:'WODs loggen & tracken',color:'#e60046' },
    { icon:'✅',name:'Habit Tracking',description:'Gewohnheiten aufbauen',color:'#08ad4b' },
    { icon:'📊',name:'Body Measurements',description:'Gewicht & Körperfett tracken',color:'#2668e8' },
    { icon:'⭐',name:'Rankings',description:'Filme, Serien & mehr bewerten',color:'#d9167b' },
    { icon:'📝',name:'Notizen',description:'Schnelle Notizen & Ideen',color:'#9427e8',route:'/notes' },
    { icon:'🥗',name:'Ernährung',description:'Mahlzeiten & Makros',color:'#009e76' },
    { icon:'🍳',name:'Rezepte',description:'Rezepte sammeln & kochen',color:'#e70e22' },
    { icon:'🔄',name:'Einheiten',description:'Einheiten umrechnen',color:'#ed4d00' },
    { icon:'🗓️',name:'Kalender',description:'Übersicht aller Aktivitäten',color:'#079b91' },
    { icon:'📖',name:'Journal',description:'Tagebuch & Gedanken',color:'#4b45e7' },
    { icon:'🛒',name:'Einkaufsliste',description:'Einkäufe planen & tracken',color:'#55ad00' },
    { icon:'💪',name:'Übungen',description:'Übungen verwalten',color:'#7226e6' },
    { icon:'🏢',name:'GYM',description:'Trainingseinheiten tracken',color:'#54657d' },
    { icon:'🎮',name:'Games',description:'Spiele & Challenges',color:'#0497b7' },
    { icon:'🏈',name:'Flag Football',description:'Plays & Routes planen',color:'#9228e5' },
    { icon:'🧘',name:'Stretching',description:'Routinen & Übungen',color:'#00a477' },
    { icon:'🕺',name:'Linedance',description:'Taenze, Songs & Schritte',color:'#c900d4' },
    { icon:'⏱️',name:'Timer',description:'For Time, AMRAP, EMOM / Tabata',color:'#078cca' },
    { icon:'🗂️',name:'Merkkarten',description:'Karten lernen & wiederholen',color:'#5049e7' },
  ];
}
