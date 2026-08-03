import {Injectable,inject} from '@angular/core';
import {AuthService} from '../core/auth.service';

export type TileTheme='colorful'|'monochrome';
@Injectable({providedIn:'root'})
export class ProfileService{
  private readonly auth=inject(AuthService);
  async load(){const client=this.client(),id=this.userId();const [profile,settings]=await Promise.all([client.from('profiles').select('username').eq('id',id).maybeSingle(),client.from('user_settings').select('preferences').maybeSingle()]);if(profile.error)throw profile.error;if(settings.error)throw settings.error;const preferences=(settings.data?.preferences??{}) as Record<string,unknown>;return{username:profile.data?.username??'',tileTheme:(preferences['tileTheme']==='monochrome'?'monochrome':'colorful') as TileTheme,preferences}}
  async saveUsername(username:string){const result=await this.client().from('profiles').upsert({id:this.userId(),username},{onConflict:'id'});if(result.error)throw result.error}
  async saveTileTheme(tileTheme:TileTheme,preferences:Record<string,unknown>){const result=await this.client().from('user_settings').upsert({user_id:this.userId(),preferences:{...preferences,tileTheme},updated_at:new Date().toISOString()},{onConflict:'user_id'});if(result.error)throw result.error}
  async changePassword(password:string){const result=await this.client().auth.updateUser({password});if(result.error)throw result.error}
  private client(){const client=this.auth.supabase;if(!client)throw new Error('Supabase ist nicht konfiguriert.');return client}
  private userId(){const id=this.auth.session()?.user.id;if(!id)throw new Error('Bitte zuerst anmelden.');return id}
}
