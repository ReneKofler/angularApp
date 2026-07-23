import { Injectable, inject } from '@angular/core';
import { AuthService } from '../core/auth.service';

export interface Workout {
  id:string; user_id:string; workout_type:string; workout_date:string; workout_name:string|null;
  distance_km:number|null; duration:string|null; pace:string|null; avg_heart_rate:number|null;
  elevation_m:number|null; reps:number|null; stationary:boolean|null; run_type:string|null;
  notes:string|null; created_at?:string;
}
export interface CustomSport {
  id:string; user_id:string; name:string; emoji:string; has_distance:boolean; has_duration:boolean;
  has_pace:boolean; has_heart_rate:boolean; has_elevation:boolean; has_stationary:boolean;
}
export type WorkoutDraft=Omit<Workout,'id'|'user_id'|'created_at'>;
export type CustomSportDraft=Pick<CustomSport,'name'|'emoji'|'has_distance'|'has_duration'|'has_pace'|'has_heart_rate'|'has_elevation'|'has_stationary'>;

@Injectable({providedIn:'root'})
export class WorkoutsService {
  private readonly auth=inject(AuthService);
  async load():Promise<{workouts:Workout[];sportTypes:CustomSport[]}>{
    const client=this.client();
    const [workouts,sports]=await Promise.all([
      client.from('workouts').select('*').order('workout_date',{ascending:false}),
      client.from('custom_sport_types').select('*').order('name'),
    ]);
    if(workouts.error)throw workouts.error;if(sports.error)throw sports.error;
    return{workouts:(workouts.data??[])as Workout[],sportTypes:(sports.data??[])as CustomSport[]};
  }
  async saveWorkout(draft:WorkoutDraft,id?:string):Promise<Workout>{
    const client=this.client();const userId=this.userId();
    const query=id?client.from('workouts').update(draft).eq('id',id).eq('user_id',userId):client.from('workouts').insert({...draft,user_id:userId});
    const{data,error}=await query.select().single();if(error)throw error;return data as Workout;
  }
  async deleteWorkout(id:string):Promise<void>{
    const{error}=await this.client().from('workouts').delete().eq('id',id).eq('user_id',this.userId());if(error)throw error;
  }
  async saveSport(draft:CustomSportDraft,id?:string):Promise<CustomSport>{
    const client=this.client();const userId=this.userId();
    const query=id?client.from('custom_sport_types').update(draft).eq('id',id).eq('user_id',userId):client.from('custom_sport_types').insert({...draft,user_id:userId});
    const{data,error}=await query.select().single();if(error)throw error;return data as CustomSport;
  }
  private client(){const client=this.auth.supabase;if(!client)throw new Error('Supabase ist nicht konfiguriert.');return client;}
  private userId(){const id=this.auth.session()?.user.id;if(!id)throw new Error('Bitte zuerst anmelden.');return id;}
}
