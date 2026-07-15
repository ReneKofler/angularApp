import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { UserSettingsService } from './user-settings.service';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Settings implements OnInit {
  readonly settings = inject(UserSettingsService);
  readonly auth = inject(AuthService);
  readonly saved = signal(false);
  readonly notificationStatus = signal<NotificationPermission | 'unsupported'>(
    'Notification' in globalThis ? Notification.permission : 'unsupported',
  );
  readonly form = new FormGroup({
    displayName: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(80)] }),
    theme: new FormControl<'light' | 'dark' | 'system'>('system', { nonNullable: true }),
    bodyVisible: new FormControl(true, { nonNullable: true }),
    heightCm: new FormControl<number | null>(null, [Validators.min(50), Validators.max(260)]),
  });

  async ngOnInit(): Promise<void> {
    await this.settings.load();
    this.form.reset(this.settings.preferences());
  }

  previewTheme(): void {
    this.settings.applyTheme(this.form.controls.theme.value);
  }

  async save(): Promise<void> {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.saved.set(await this.settings.save(this.form.getRawValue()));
  }

  async enableNotifications(): Promise<void> {
    if (!('Notification' in globalThis)) return;
    this.notificationStatus.set(await Notification.requestPermission());
    if (this.notificationStatus() === 'granted') await this.settings.syncPushSubscription();
  }
}
