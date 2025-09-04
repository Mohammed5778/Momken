import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';

type LoginStatus = 'idle' | 'loading' | 'error';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  authService = inject(AuthService);
  status = signal<LoginStatus>('idle');
  errorMessage = signal('');

  authSuccess = output<void>();
  navigateToSignup = output<void>();

  async handleLogin(event: Event) {
    event.preventDefault();
    this.status.set('loading');
    this.errorMessage.set('');

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      await this.authService.loginWithEmail(email, password);
      this.authSuccess.emit();
    } catch (error: any) {
      this.status.set('error');
      this.errorMessage.set(error.message);
    } finally {
        if(this.status() === 'loading'){
            this.status.set('idle');
        }
    }
  }

  async handleGoogleLogin() {
    this.status.set('loading');
    this.errorMessage.set('');
    try {
      await this.authService.loginWithGoogle();
      this.authSuccess.emit();
    } catch (error: any) {
      this.status.set('error');
      this.errorMessage.set(error.message);
    } finally {
        if(this.status() === 'loading'){
            this.status.set('idle');
        }
    }
  }
}
