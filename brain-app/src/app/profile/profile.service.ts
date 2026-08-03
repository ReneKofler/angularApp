import {Injectable,inject} from '@angular/core';
import {AuthService} from '../core/auth.service';

export type TileStyle='colorful'|'uniform';
@Injectable({providedIn:'root'})
export class ProfileService{
  private readonly auth=inject(AuthService);
  async load(){const client=this.client(),id=this.userId();const [profile,settings]=await Promise.all([client.from('profiles').select('username').eq('id',id).maybeSingle(),client.from('user_settings').select('tile_style').maybeSingle()]);if(profile.error)throw profile.error;if(settings.error)throw settings.error;return{username:profile.data?.username??'',tileStyle:(settings.data?.tile_style==='uniform'?'uniform':'colorful') as TileStyle}}
  async saveUsername(username:string){const result=await this.client().from('profiles').upsert({id:this.userId(),username},{onConflict:'id'});if(result.error)throw result.error}
  async saveTileStyle(tileStyle:TileStyle){const result=await this.client().from('user_settings').upsert({user_id:this.userId(),tile_style:tileStyle,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(result.error)throw result.error}
  async changePassword(password:string){const result=await this.client().auth.updateUser({password});if(result.error)throw result.error}
  private client(){const client=this.auth.supabase;if(!client)throw new Error('Supabase ist nicht konfiguriert.');return client}
  private userId(){const id=this.auth.session()?.user.id;if(!id)throw new Error('Bitte zuerst anmelden.');return id}
}
