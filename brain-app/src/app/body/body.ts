import {ChangeDetectionStrategy,Component,computed,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {DatePipe} from '@angular/common';
import {BodyGoal,BodyMeasurement,BodyMilestone,BodyPreferences,BodyService,MeasurementDraft,MilestoneDraft} from './body.service';

@Component({selector:'app-body',imports:[FormsModule,RouterLink,DatePipe],templateUrl:'./body.html',styleUrl:'./body.scss',changeDetection:ChangeDetectionStrategy.OnPush})
export class Body {
  private readonly service=inject(BodyService);
  readonly measurements=signal<BodyMeasurement[]>([]);readonly goal=signal<BodyGoal>({goal_weight_kg:null,goal_body_fat_percent:null});readonly history=signal<any[]>([]);readonly milestones=signal<BodyMilestone[]>([]);
  readonly preferences=signal<BodyPreferences>({body_fat_visible:true,body_height_cm:null});readonly loading=signal(true);readonly saving=signal(false);readonly error=signal('');readonly editor=signal<'measurement'|'goal'|'milestone'|'settings'|null>(null);readonly editingId=signal<string|null>(null);
  readonly measurementDraft=signal<MeasurementDraft>({weight_kg:0,body_fat_percent:null,measurement_date:this.localDate(new Date())});readonly goalDraft=signal<BodyGoal>({goal_weight_kg:null,goal_body_fat_percent:null});readonly milestoneDraft=signal<MilestoneDraft>({label:'',milestone_date:this.localDate(new Date()),end_milestone_date:null});readonly preferenceDraft=signal<BodyPreferences>({body_fat_visible:true,body_height_cm:null});
  readonly latest=computed(()=>this.measurements()[0]??null);readonly oldest=computed(()=>this.measurements().at(-1)??null);
  readonly weightChange=computed(()=>this.latest()&&this.oldest()?this.round(this.latest()!.weight_kg-this.oldest()!.weight_kg):null);
  readonly weightProgress=computed(()=>this.progress(this.oldest()?.weight_kg,this.latest()?.weight_kg,this.goal().goal_weight_kg));
  readonly visibleMeasurements=computed(()=>this.measurements().slice(0,12).reverse());
  constructor(){void this.reload()}
  async reload(){this.loading.set(true);this.error.set('');try{const data=await this.service.load();this.measurements.set(data.measurements);this.goal.set(data.goal);this.history.set(data.history);this.milestones.set(data.milestones);this.preferences.set(data.preferences)}catch(error){this.error.set(this.message(error))}finally{this.loading.set(false)}}
  newMeasurement(){this.editingId.set(null);this.measurementDraft.set({weight_kg:this.latest()?.weight_kg??0,body_fat_percent:null,measurement_date:this.localDate(new Date())});this.editor.set('measurement')}
  editMeasurement(item:BodyMeasurement){this.editingId.set(item.id);this.measurementDraft.set({weight_kg:item.weight_kg,body_fat_percent:item.body_fat_percent,measurement_date:item.measurement_date});this.editor.set('measurement')}
  updateMeasurement<K extends keyof MeasurementDraft>(key:K,value:MeasurementDraft[K]){this.measurementDraft.update(d=>({...d,[key]:value}))}
  async saveMeasurement(){const d=this.measurementDraft();if(!d.measurement_date||d.weight_kg<=0){this.error.set('Datum und Gewicht sind erforderlich.');return}await this.run(async()=>{await this.service.saveMeasurement(d,this.editingId()??undefined);this.editor.set(null);await this.reload()})}
  async removeMeasurement(){const id=this.editingId();if(!id||!confirm('Messung löschen?'))return;await this.run(async()=>{await this.service.deleteMeasurement(id);this.editor.set(null);await this.reload()})}
  openGoal(){this.goalDraft.set({...this.goal()});this.editor.set('goal')}
  updateGoal(key:'goal_weight_kg'|'goal_body_fat_percent',value:number|string){this.goalDraft.update(d=>({...d,[key]:value===''?null:Math.max(0,Number(value))}))}
  async saveGoal(){await this.run(async()=>{await this.service.saveGoal(this.goalDraft());this.editor.set(null);await this.reload()})}
  newMilestone(){this.editingId.set(null);this.milestoneDraft.set({label:'',milestone_date:this.localDate(new Date()),end_milestone_date:null});this.editor.set('milestone')}
  editMilestone(item:BodyMilestone){this.editingId.set(item.id);this.milestoneDraft.set({label:item.label,milestone_date:item.milestone_date,end_milestone_date:item.end_milestone_date});this.editor.set('milestone')}
  updateMilestone<K extends keyof MilestoneDraft>(key:K,value:MilestoneDraft[K]){this.milestoneDraft.update(d=>({...d,[key]:value}))}
  async saveMilestone(){if(!this.milestoneDraft().label.trim()){this.error.set('Bezeichnung ist erforderlich.');return}await this.run(async()=>{await this.service.saveMilestone(this.milestoneDraft(),this.editingId()??undefined);this.editor.set(null);await this.reload()})}
  async removeMilestone(){const id=this.editingId();if(!id||!confirm('Meilenstein löschen?'))return;await this.run(async()=>{await this.service.deleteMilestone(id);this.editor.set(null);await this.reload()})}
  openSettings(){this.preferenceDraft.set({...this.preferences()});this.editor.set('settings')}
  async saveSettings(){await this.run(async()=>{await this.service.savePreferences(this.preferenceDraft());this.preferences.set(this.preferenceDraft());this.editor.set(null)})}
  barHeight(value:number){const values=this.visibleMeasurements().map(x=>x.weight_kg);const min=Math.min(...values),max=Math.max(...values);return max===min?50:15+((value-min)/(max-min))*75}
  progress(start:number|undefined,current:number|undefined,target:number|null|undefined){if(start==null||current==null||target==null||start===target)return null;return Math.max(0,Math.min(100,Math.round(((start-current)/(start-target))*100)))}
  round(value:number){return Math.round((value+Number.EPSILON)*10)/10}
  private async run(action:()=>Promise<void>){this.saving.set(true);this.error.set('');try{await action()}catch(error){this.error.set(this.message(error))}finally{this.saving.set(false)}}
  private localDate(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
  private message(error:unknown){return error instanceof Error?error.message:'Etwas ist schiefgelaufen.'}
}
