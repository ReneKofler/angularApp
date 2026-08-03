import { Injectable, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';

export interface BodyMeasurement { id:string;user_id:string;weight_kg:number;body_fat_percent:number|null;measurement_date:string;created_at?:string }
export interface BodyGoal { id?:string;user_id?:string;goal_weight_kg:number|null;goal_body_fat_percent:number|null;created_at?:string;updated_at?:string }
export interface BodyGoalHistory extends BodyGoal { id:string;user_id:string;changed_at:string }
export interface BodyMilestone { id:string;user_id:string;milestone_date:string;end_milestone_date:string|null;label:string;created_at?:string }
export interface BodyPreferences { body_fat_visible:boolean;body_height_cm:number|null }
export type MeasurementDraft=Pick<BodyMeasurement,'weight_kg'|'body_fat_percent'|'measurement_date'>;
export type MilestoneDraft=Pick<BodyMilestone,'milestone_date'|'end_milestone_date'|'label'>;

@Injectable({providedIn:'root'})
export class BodyService {
  private readonly auth=inject(AuthService);
  async load(){
    const client=this.client();
    const [measurements,goals,history,milestones,settings]=await Promise.all([
      client.from('body_measurements').select('*').order('measurement_date',{ascending:false}),
      client.from('body_goals').select('*').maybeSingle(),
      client.from('body_goal_history').select('*').order('changed_at',{ascending:false}),
      client.from('body_milestones').select('*').order('milestone_date',{ascending:false}),
      client.from('user_settings').select('body_fat_visible,body_height_cm').maybeSingle(),
    ]);
    for(const result of [measurements,goals,history,milestones,settings]) if(result.error) throw result.error;
    return {
      measurements:(measurements.data??[]) as BodyMeasurement[],
      goal:(goals.data??{goal_weight_kg:null,goal_body_fat_percent:null}) as BodyGoal,
      history:(history.data??[]) as BodyGoalHistory[],milestones:(milestones.data??[]) as BodyMilestone[],
      preferences:{body_fat_visible:settings.data?.body_fat_visible!==false,body_height_cm:settings.data?.body_height_cm??null} as BodyPreferences,
    };
  }
  async saveMeasurement(draft:MeasurementDraft,id?:string){
    const query=id?this.client().from('body_measurements').update(draft).eq('id',id).eq('user_id',this.userId()):this.client().from('body_measurements').insert({...draft,user_id:this.userId()});
    const result=await query.select().single();if(result.error)throw result.error;return result.data as BodyMeasurement;
  }
  async deleteMeasurement(id:string){const result=await this.client().from('body_measurements').delete().eq('id',id).eq('user_id',this.userId());if(result.error)throw result.error}
  async saveGoal(goal:BodyGoal){
    const snapshot={goal_weight_kg:goal.goal_weight_kg,goal_body_fat_percent:goal.goal_body_fat_percent,user_id:this.userId()};
    const history=await this.client().from('body_goal_history').insert({...snapshot,changed_at:new Date().toISOString()});if(history.error)throw history.error;
    const result=await this.client().from('body_goals').upsert({...snapshot,updated_at:new Date().toISOString()},{onConflict:'user_id'}).select().single();if(result.error)throw result.error;return result.data as BodyGoal;
  }
  async saveMilestone(draft:MilestoneDraft,id?:string){
    const query=id?this.client().from('body_milestones').update(draft).eq('id',id).eq('user_id',this.userId()):this.client().from('body_milestones').insert({...draft,user_id:this.userId()});
    const result=await query.select().single();if(result.error)throw result.error;return result.data as BodyMilestone;
  }
  async deleteMilestone(id:string){const result=await this.client().from('body_milestones').delete().eq('id',id).eq('user_id',this.userId());if(result.error)throw result.error}
  async savePreferences(value:BodyPreferences){const result=await this.client().from('user_settings').upsert({...value,user_id:this.userId(),updated_at:new Date().toISOString()},{onConflict:'user_id'});if(result.error)throw result.error}
  private client(){const client=this.auth.supabase;if(!client)throw new Error('Supabase ist nicht konfiguriert.');return client}
  private userId(){const id=this.auth.session()?.user.id;if(!id)throw new Error('Bitte zuerst anmelden.');return id}
}
