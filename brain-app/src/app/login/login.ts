import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  readonly pending = signal(false);
  readonly error = signal('');
  readonly expired = this.route.snapshot.queryParamMap.get('reason') === 'expired';
  readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  async submit(): Promise<void> {
    if (this.form.invalid) return this.form.markAllAsTouched();
    this.pending.set(true);
    try {
      const redirect = this.route.snapshot.queryParamMap.get('redirect') ?? '/';
      this.error.set(
        (await this.auth.signIn(
          this.form.controls.email.value,
          this.form.controls.password.value,
          redirect,
        )) ?? '',
      );
    } finally {
      this.pending.set(false);
    }
  }
}
