import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PersonalRecord, SportCapabilities, SportType, Workout, WorkoutDraft, WorkoutsService } from './workouts.service';

const BUILT_IN_SPORTS: SportType[] = [
  { id:'running', user_id:'', name:'Running', unit:'km', capabilities:{ distance:true,duration:true,heartRate:true,elevation:true,reps:false,stationary:false } },
  { id:'cycling', user_id:'', name:'Cycling', unit:'km', capabilities:{ distance:true,duration:true,heartRate:true,elevation:true,reps:false,stationary:true } },
  { id:'strength', user_id:'', name:'Strength', unit:'km', capabilities:{ distance:false,duration:true,heartRate:false,elevation:false,reps:true,stationary:true } },
];

@Component({
  selector:'app-workouts', imports:[FormsModule, RouterLink, SlicePipe], templateUrl:'./workouts.html',
  styleUrl:'./workouts.scss', changeDetection:ChangeDetectionStrategy.OnPush,
})
export class Workouts {
  private readonly service=inject(WorkoutsService);
  readonly workouts=signal<Workout[]>([]); readonly customSports=signal<SportType[]>([]);
  readonly records=signal<PersonalRecord[]>([]); readonly loading=signal(true); readonly saving=signal(false);
  readonly error=signal(''); readonly query=signal(''); readonly sportFilter=signal('all');
  readonly editorOpen=signal(false); readonly sportEditorOpen=signal(false); readonly editingId=signal<string|null>(null);
  readonly recordEditorOpen=signal(false); readonly recordSportId=signal('running');
  readonly recordMetric=signal('Fastest time'); readonly recordValue=signal<number|null>(null);
  readonly recordUnit=signal('minutes'); readonly recordDate=signal(this.today());
  readonly sportTypeId=signal('running'); readonly performedAt=signal(this.today());
  readonly distance=signal<number|null>(null); readonly duration=signal<number|null>(null);
  readonly heartRate=signal<number|null>(null); readonly elevation=signal<number|null>(null);
  readonly reps=signal<number|null>(null); readonly stationary=signal(false); readonly notes=signal('');
  readonly sportName=signal(''); readonly sportUnit=signal<'km'|'mi'>('km');
  readonly capabilityKeys:(keyof SportCapabilities)[]=['distance','duration','heartRate','elevation','reps','stationary'];
  readonly capabilities=signal<SportCapabilities>(this.emptyCapabilities());
  readonly sports=computed(()=>[...BUILT_IN_SPORTS,...this.customSports()]);
  readonly selectedSport=computed(()=>this.sports().find(s=>s.id===this.sportTypeId())??this.sports()[0]);
  readonly filteredWorkouts=computed(()=>{
    const needle=this.query().trim().toLowerCase();
    return this.workouts().filter(w=>(this.sportFilter()==='all'||w.sport_type_id===this.sportFilter())
      &&(!needle||`${w.sport_name} ${w.notes}`.toLowerCase().includes(needle)));
  });
  readonly totalDistance=computed(()=>this.filteredWorkouts().reduce((sum,w)=>sum+(w.distance??0),0));
  readonly totalMinutes=computed(()=>this.filteredWorkouts().reduce((sum,w)=>sum+(w.duration_minutes??0),0));

  constructor(){ void this.reload(); }
  async reload():Promise<void>{
    this.loading.set(true); this.error.set('');
    try{const data=await this.service.load();this.workouts.set(data.workouts);this.customSports.set(data.sportTypes);this.records.set(data.records);}
    catch(error){this.error.set(this.message(error));}finally{this.loading.set(false);}
  }
  newWorkout():void{
    this.editingId.set(null);this.sportTypeId.set(this.sports()[0]?.id??'running');this.performedAt.set(this.today());
    this.distance.set(null);this.duration.set(null);this.heartRate.set(null);this.elevation.set(null);this.reps.set(null);
    this.stationary.set(false);this.notes.set('');this.editorOpen.set(true);
  }
  edit(w:Workout):void{
    this.editingId.set(w.id);this.sportTypeId.set(w.sport_type_id??w.sport_name.toLowerCase());this.performedAt.set(w.performed_at.slice(0,10));
    this.distance.set(w.distance);this.duration.set(w.duration_minutes);this.heartRate.set(w.average_heart_rate);
    this.elevation.set(w.elevation_gain);this.reps.set(w.reps);this.stationary.set(w.stationary);this.notes.set(w.notes??'');this.editorOpen.set(true);
  }
  async save():Promise<void>{
    const sport=this.selectedSport();const validation=this.validate(sport);if(validation){this.error.set(validation);return;}const caps=sport.capabilities;
    const draft:WorkoutDraft={sport_type_id:BUILT_IN_SPORTS.some(s=>s.id===sport.id)?null:sport.id,sport_name:sport.name,
      performed_at:this.performedAt(),distance:caps.distance?this.distance():null,duration_minutes:caps.duration?this.duration():null,
      average_heart_rate:caps.heartRate?this.heartRate():null,elevation_gain:caps.elevation?this.elevation():null,
      reps:caps.reps?this.reps():null,stationary:caps.stationary&&this.stationary(),notes:this.notes().trim()};
    this.saving.set(true);this.error.set('');
    try{await this.service.saveWorkout(draft,this.editingId()??undefined);this.editorOpen.set(false);await this.reload();}
    catch(error){this.error.set(this.message(error));}finally{this.saving.set(false);}
  }
  async remove(w:Workout):Promise<void>{
    if(!confirm(`Delete this ${w.sport_name} workout?`))return;
    try{await this.service.deleteWorkout(w.id);await this.reload();}catch(error){this.error.set(this.message(error));}
  }
  openSportEditor():void{this.sportName.set('');this.sportUnit.set('km');this.capabilities.set(this.emptyCapabilities());this.sportEditorOpen.set(true);}
  toggleCapability(key:keyof SportCapabilities,enabled:boolean):void{this.capabilities.update(c=>({...c,[key]:enabled}));}
  capabilityEnabled(key:keyof SportCapabilities):boolean{return this.capabilities()[key];}
  async saveSport():Promise<void>{
    const name=this.sportName().trim();
    if(!name){this.error.set('Enter a sport name.');return;}
    if(this.sports().some(s=>s.name.toLowerCase()===name.toLowerCase())){this.error.set('That sport type already exists.');return;}
    if(!Object.values(this.capabilities()).some(Boolean)){this.error.set('Select at least one supported metric.');return;}
    try{const sport=await this.service.saveSportType({name,unit:this.sportUnit(),capabilities:this.capabilities()});
      this.sportEditorOpen.set(false);await this.reload();this.sportTypeId.set(sport.id);}catch(error){this.error.set(this.message(error));}
  }
  async removeSport(s:SportType):Promise<void>{
    if(!confirm(`Delete the custom sport “${s.name}”?`))return;
    try{await this.service.deleteSportType(s.id);await this.reload();}catch(error){this.error.set(this.message(error));}
  }
  openRecordEditor():void{this.recordSportId.set(this.sports()[0]?.id??'running');this.recordValue.set(null);this.recordDate.set(this.today());this.recordEditorOpen.set(true);}
  async saveRecord():Promise<void>{
    const sport=this.sports().find(s=>s.id===this.recordSportId());
    if(!sport||!this.recordMetric().trim()||!this.recordValue()||this.recordValue()!<=0){this.error.set('Complete the record details with a value greater than zero.');return;}
    try{await this.service.saveRecord({sport_type_id:BUILT_IN_SPORTS.some(s=>s.id===sport.id)?null:sport.id,sport_name:sport.name,
      metric:this.recordMetric().trim(),value:this.recordValue()!,unit:this.recordUnit().trim(),achieved_at:this.recordDate(),workout_id:null});
      this.recordEditorOpen.set(false);await this.reload();}catch(error){this.error.set(this.message(error));}
  }
  async removeRecord(record:PersonalRecord):Promise<void>{
    if(!confirm(`Delete the ${record.metric} record?`))return;
    try{await this.service.deleteRecord(record.id);await this.reload();}catch(error){this.error.set(this.message(error));}
  }
  pace(w:Workout):string{
    if(!w.distance||!w.duration_minutes)return '—';const minutes=w.duration_minutes/w.distance;
    return `${Math.floor(minutes)}:${Math.round((minutes%1)*60).toString().padStart(2,'0')} min/${this.unitFor(w)}`;
  }
  unitFor(w:Workout):string{return this.sports().find(s=>s.id===w.sport_type_id)?.unit??'km';}
  private validate(sport:SportType):string{
    if(!this.performedAt())return 'Choose a workout date.';
    const values:[boolean,number|null,string][]=[[sport.capabilities.distance,this.distance(),'Distance'],[sport.capabilities.duration,this.duration(),'Duration'],
      [sport.capabilities.heartRate,this.heartRate(),'Heart rate'],[sport.capabilities.elevation,this.elevation(),'Elevation'],[sport.capabilities.reps,this.reps(),'Repetitions']];
    const invalid=values.find(([enabled,value])=>enabled&&value!==null&&value<=0);if(invalid)return `${invalid[2]} must be greater than zero.`;
    if(!values.some(([enabled,value])=>enabled&&value!==null))return 'Enter at least one workout metric.';return '';
  }
  private today():string{return new Date().toISOString().slice(0,10);}
  private emptyCapabilities():SportCapabilities{return{distance:false,duration:false,heartRate:false,elevation:false,reps:false,stationary:false};}
  private message(error:unknown):string{return error instanceof Error?error.message:'Something went wrong. Please try again.';}
}
