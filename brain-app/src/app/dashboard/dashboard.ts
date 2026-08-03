import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';

interface Module {
  id?: string;
  icon: string;
  name: string;
  description: string;
  color: string;
  route?: string;
  enabled?: boolean;
  position?: number;
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
  readonly defaultModules: Module[] = [
    {
      icon: '🏃',
      name: 'Sport Tracking',
      description: 'Workouts schnell erfassen',
      color: '#df7b00',
      route: '/workouts',
    },
    {
      icon: '🏋️',
      name: 'CrossFit',
      description: 'WODs loggen & tracken',
      color: '#e60046',
      route: '/crossfit',
    },
    { icon: '✅', name: 'Habit Tracking', description: 'Gewohnheiten aufbauen', color: '#08ad4b' },
    {
      icon: '📊',
      name: 'Body Measurements',
      description: 'Gewicht & Körperfett tracken',
      color: '#2668e8',
      route: '/body',
    },
    {
      icon: '⭐',
      name: 'Rankings',
      description: 'Filme, Serien & mehr bewerten',
      color: '#d9167b',
    },
    {
      icon: '📝',
      name: 'Notizen',
      description: 'Schnelle Notizen & Ideen',
      color: '#9427e8',
      route: '/notes',
    },
    {
      icon: '🥗',
      name: 'Ernährung',
      description: 'Mahlzeiten & Makros',
      color: '#009e76',
      route: '/nutrition',
    },
    {
      icon: '🍳',
      name: 'Rezepte',
      description: 'Rezepte sammeln & kochen',
      color: '#e70e22',
      route: '/recipes',
    },
    { icon: '🔄', name: 'Einheiten', description: 'Einheiten umrechnen', color: '#ed4d00' },
    { icon: '🗓️', name: 'Kalender', description: 'Übersicht aller Aktivitäten', color: '#079b91' },
    { icon: '📖', name: 'Journal', description: 'Tagebuch & Gedanken', color: '#4b45e7' },
    {
      icon: '🛒',
      name: 'Einkaufsliste',
      description: 'Einkäufe planen & tracken',
      color: '#55ad00',
    },
    {
      icon: '💪',
      name: 'Übungen',
      description: 'Übungen verwalten',
      color: '#7226e6',
      route: '/training',
    },
    {
      icon: '🔁',
      name: 'Greasing the Groove',
      description: 'Tägliche Wiederholungen sammeln',
      color: '#0f9f82',
      route: '/greasing-the-groove',
    },
    { icon: '🏢', name: 'GYM', description: 'Trainingseinheiten tracken', color: '#54657d' },
    { icon: '🎮', name: 'Games', description: 'Spiele & Challenges', color: '#0497b7' },
    { icon: '🏈', name: 'Flag Football', description: 'Plays & Routes planen', color: '#9228e5' },
    { icon: '🧘', name: 'Stretching', description: 'Routinen & Übungen', color: '#00a477' },
    { icon: '🕺', name: 'Linedance', description: 'Taenze, Songs & Schritte', color: '#c900d4' },
    { icon: '⏱️', name: 'Timer', description: 'For Time, AMRAP, EMOM / Tabata', color: '#078cca' },
    {
      icon: '🗂️',
      name: 'Merkkarten',
      description: 'Karten lernen & wiederholen',
      color: '#5049e7',
    },
  ];
  readonly modules = signal<Module[]>(this.defaultModules.map((module,index)=>({...module,id:String(index+1)})));
  readonly draftModules = signal<Module[]>([]);
  readonly settingsOpen = signal(false);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly draggedIndex = signal<number|null>(null);
  readonly visibleModules = computed(()=>this.modules().filter(module=>(module as Module&{enabled?:boolean}).enabled!==false));

  constructor(){void this.loadSettings()}
  async loadSettings(){
    const client=this.auth.supabase;if(!client)return;
    const result=await client.from('user_settings').select('dashboard_settings').maybeSingle();
    if(result.error){this.error.set(result.error.message);return}
    const stored=(result.data?.dashboard_settings??{}) as Record<string,{color?:string;enabled?:boolean;position?:number}>;
    this.modules.set(this.defaultModules.map((module,index)=>{
      const id=String(index+1),setting=stored[id];return {...module,id,color:setting?.color??module.color,enabled:setting?.enabled??true,position:setting?.position??index};
    }).sort((a:any,b:any)=>a.position-b.position));
  }
  openSettings(){this.draftModules.set(this.modules().map(module=>({...module})));this.settingsOpen.set(true)}
  setColor(index:number,color:string){this.draftModules.update(items=>items.map((item,i)=>i===index?{...item,color}:item))}
  toggleModule(index:number){this.draftModules.update(items=>items.map((item:any,i)=>i===index?{...item,enabled:item.enabled===false}:item))}
  moveModule(from:number,to:number){const length=this.draftModules().length;if(from<0||to<0||from>=length||to>=length||from===to)return;this.draftModules.update(items=>{const next=[...items];const [item]=next.splice(from,1);next.splice(to,0,item);return next})}
  startDrag(index:number,event:DragEvent){this.draggedIndex.set(index);event.dataTransfer?.setData('text/plain',String(index));if(event.dataTransfer)event.dataTransfer.effectAllowed='move'}
  dropModule(index:number,event:DragEvent){event.preventDefault();const from=this.draggedIndex();if(from!==null)this.moveModule(from,index);this.draggedIndex.set(null)}
  handleMoveKey(index:number,event:KeyboardEvent){if(!event.altKey||!['ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();this.moveModule(index,index+(event.key==='ArrowUp'?-1:1))}
  async saveSettings(){
    const client=this.auth.supabase,userId=this.auth.session()?.user.id;if(!client||!userId)return;
    this.saving.set(true);this.error.set('');
    const dashboard_settings=Object.fromEntries(this.draftModules().map((module:any,index)=>[module.id,{color:module.color,enabled:module.enabled!==false,position:index}]));
    const result=await client.from('user_settings').upsert({user_id:userId,dashboard_settings,updated_at:new Date().toISOString()},{onConflict:'user_id'});
    if(result.error)this.error.set(result.error.message);else{this.modules.set(this.draftModules().map((item:any,index)=>({...item,position:index})));this.settingsOpen.set(false)}this.saving.set(false);
  }
}
