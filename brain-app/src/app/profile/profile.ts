import {ChangeDetectionStrategy,Component,inject,signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {AuthService} from '../core/auth.service';
import {ProfileService,TileStyle} from './profile.service';

@Component({selector:'app-profile',imports:[FormsModule,RouterLink],templateUrl:'./profile.html',styleUrl:'./profile.scss',changeDetection:ChangeDetectionStrategy.OnPush})
export class Profile{
  readonly auth=inject(AuthService);private readonly service=inject(ProfileService);readonly username=signal('');readonly tileStyle=signal<TileStyle>('colorful');readonly password=signal('');readonly confirmation=signal('');readonly saving=signal(false);readonly error=signal('');readonly success=signal('');
  constructor(){void this.load()}
  async load(){try{const data=await this.service.load();this.username.set(data.username);this.tileStyle.set(data.tileStyle)}catch(error){this.error.set(this.message(error))}}
  async saveProfile(){if(!this.username().trim()){this.error.set('Anzeigename ist erforderlich.');return}await this.run(async()=>{await this.service.saveUsername(this.username().trim());this.success.set('Anzeigename gespeichert.')})}
  async saveTheme(style:TileStyle){this.tileStyle.set(style);await this.run(async()=>{await this.service.saveTileStyle(style);this.success.set('Kachelstil gespeichert.')})}
  async updatePassword(){if(this.password().length<6){this.error.set('Das Passwort muss mindestens 6 Zeichen lang sein.');return}if(this.password()!==this.confirmation()){this.error.set('Die Passwörter stimmen nicht überein.');return}await this.run(async()=>{await this.service.changePassword(this.password());this.password.set('');this.confirmation.set('');this.success.set('Passwort geändert.')})}
  private async run(action:()=>Promise<void>){this.saving.set(true);this.error.set('');this.success.set('');try{await action()}catch(error){this.error.set(this.message(error))}finally{this.saving.set(false)}}private message(error:unknown){return error instanceof Error?error.message:'Etwas ist schiefgelaufen.'}
}
