import {ChangeDetectionStrategy,Component,computed,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {CustomSport,Workout,WorkoutDraft,WorkoutsService} from './workouts.service';

const META:Record<string,{label:string;emoji:string}>={
  running:{label:'Running',emoji:'🏃'},padel:{label:'Padel',emoji:'🏸'},biking:{label:'Biking',emoji:'🚴'},
  flagfootball:{label:'Flag Football',emoji:'🏈'},greasing_the_groove:{label:'Greasing the Groove',emoji:'🔄'},
  swimming:{label:'Swimming',emoji:'🏊'},competition:{label:'Competition',emoji:'🏆'},crossfit:{label:'CrossFit',emoji:'🏋️'},
  hiking:{label:'Wandern',emoji:'🥾'},
};
@Component({selector:'app-workouts',imports:[FormsModule,RouterLink],templateUrl:'./workouts.html',styleUrl:'./workouts.scss',changeDetection:ChangeDetectionStrategy.OnPush})
export class Workouts {
  private readonly service=inject(WorkoutsService);
  readonly workouts=signal<Workout[]>([]);readonly customSports=signal<CustomSport[]>([]);readonly loading=signal(true);
  readonly error=signal('');readonly query=signal('');readonly filter=signal('all');readonly editorOpen=signal(false);
  readonly managerOpen=signal(false);readonly editingSportId=signal<string|null>(null);readonly sportEmoji=signal('🏅');readonly sportName=signal('');
  readonly sportCapabilities=signal({distance:false,duration:false,pace:false,heartRate:false,elevation:false,stationary:false});
  readonly editingId=signal<string|null>(null);readonly workoutType=signal('running');readonly workoutDate=signal(this.today());
  readonly workoutName=signal('');readonly distance=signal<number|null>(null);readonly duration=signal('');
  readonly paceValue=signal('');readonly heartRate=signal<number|null>(null);readonly notes=signal('');
  readonly types=computed(()=>[...new Set([...this.workouts().map(w=>w.workout_type),...Object.keys(META)])]);
  readonly entryTypes=computed(()=>[...new Set(['running','biking','padel','flagfootball','swimming','competition','hiking','greasing_the_groove',...this.customSports().map(s=>s.name.toLowerCase())])]);
  readonly filtered=computed(()=>{const q=this.query().trim().toLowerCase();return this.workouts().filter(w=>
    (this.filter()==='all'||w.workout_type===this.filter())&&(!q||`${w.workout_name??''} ${w.run_type??''} ${w.notes??''} ${this.label(w.workout_type)}`.toLowerCase().includes(q)));});
  constructor(){void this.reload();}
  async reload(){this.loading.set(true);this.error.set('');try{const data=await this.service.load();this.workouts.set(data.workouts);this.customSports.set(data.sportTypes);}catch(e){this.error.set(this.message(e));}finally{this.loading.set(false);}}
  newWorkout(){this.editingId.set(null);this.workoutType.set('running');this.workoutDate.set(this.today());this.workoutName.set('');this.distance.set(null);this.duration.set('');this.paceValue.set('');this.heartRate.set(null);this.notes.set('');this.editorOpen.set(true);}
  edit(w:Workout){this.editingId.set(w.id);this.workoutType.set(w.workout_type);this.workoutDate.set(w.workout_date);this.workoutName.set(w.workout_name??w.run_type??'');this.distance.set(w.distance_km);this.duration.set(w.duration??'');this.paceValue.set(w.pace??'');this.heartRate.set(w.avg_heart_rate);this.notes.set(w.notes??'');this.editorOpen.set(true);}
  async save(){if(!this.workoutDate()){this.error.set('Bitte Datum auswählen.');return;}const draft:WorkoutDraft={workout_type:this.workoutType(),workout_date:this.workoutDate(),workout_name:this.workoutName().trim()||null,distance_km:this.distance(),duration:this.duration().trim()||null,pace:this.paceValue().trim()||null,avg_heart_rate:this.heartRate(),elevation_m:null,reps:null,stationary:null,run_type:this.workoutType()==='running'?(this.workoutName().trim()||null):null,notes:this.notes().trim()||null};
    try{await this.service.saveWorkout(draft,this.editingId()??undefined);this.editorOpen.set(false);await this.reload();}catch(e){this.error.set(this.message(e));}}
  async remove(w:Workout){if(!confirm(`${this.label(w.workout_type)} löschen?`))return;try{await this.service.deleteWorkout(w.id);await this.reload();}catch(e){this.error.set(this.message(e));}}
  removeEditing(){const workout=this.workouts().find(w=>w.id===this.editingId());if(workout)void this.remove(workout);}
  label(type:string){return META[type]?.label??this.customSports().find(s=>s.name.toLowerCase()===type)?.name??type;}
  emoji(type:string){return META[type]?.emoji??this.customSports().find(s=>s.name.toLowerCase()===type)?.emoji??'🏅';}
  supports(field:'distance'|'duration'|'pace'|'heartRate'):boolean{
    const type=this.workoutType();const custom=this.customSports().find(s=>s.name.toLowerCase()===type);
    if(custom)return field==='distance'?custom.has_distance:field==='duration'?custom.has_duration:field==='pace'?custom.has_pace:custom.has_heart_rate;
    const map:Record<string,string[]>={running:['distance','duration','pace','heartRate'],biking:['distance','duration','pace','heartRate'],padel:['duration','heartRate'],flagfootball:['duration','heartRate'],swimming:['distance','duration','pace','heartRate'],competition:['duration','heartRate'],hiking:['distance','duration','pace','heartRate'],greasing_the_groove:['duration']};
    return map[type]?.includes(field)??true;
  }
  openManager(){this.resetSport();this.managerOpen.set(true);}
  editSport(s:CustomSport){this.editingSportId.set(s.id);this.sportEmoji.set(s.emoji);this.sportName.set(s.name);this.sportCapabilities.set({distance:s.has_distance,duration:s.has_duration,pace:s.has_pace,heartRate:s.has_heart_rate,elevation:s.has_elevation,stationary:s.has_stationary});}
  sportCapability(key:'distance'|'duration'|'pace'|'heartRate'|'elevation'|'stationary'){return this.sportCapabilities()[key];}
  toggleSportCapability(key:'distance'|'duration'|'pace'|'heartRate'|'elevation'|'stationary',value:boolean){this.sportCapabilities.update(c=>({...c,[key]:value}));}
  async saveSport(){const name=this.sportName().trim();if(!name){this.error.set('Bitte einen Namen eingeben.');return;}const c=this.sportCapabilities();try{await this.service.saveSport({name,emoji:this.sportEmoji()||'🏅',has_distance:c.distance,has_duration:c.duration,has_pace:c.pace,has_heart_rate:c.heartRate,has_elevation:c.elevation,has_stationary:c.stationary},this.editingSportId()??undefined);await this.reload();this.resetSport();}catch(e){this.error.set(this.message(e));}}
  private resetSport(){this.editingSportId.set(null);this.sportEmoji.set('🏅');this.sportName.set('');this.sportCapabilities.set({distance:false,duration:false,pace:false,heartRate:false,elevation:false,stationary:false});}
  date(value:string){const m=value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${Number(m[3])}.${Number(m[2])}.${m[1]}`:value;}
  details(w:Workout){const parts=[];if(w.distance_km!=null)parts.push(`${w.distance_km} km`);if(w.duration)parts.push(w.duration);if(w.pace)parts.push(`Pace: ${w.pace}`);if(w.avg_heart_rate!=null)parts.push(`${w.avg_heart_rate} bpm`);if(w.reps!=null)parts.push(`${w.reps} Reps`);return parts.join(' · ');}
  private today(){return new Date().toISOString().slice(0,10);}private message(e:unknown){return e instanceof Error?e.message:'Etwas ist schiefgelaufen.';}
}
