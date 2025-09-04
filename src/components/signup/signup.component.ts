
import { ChangeDetectionStrategy, Component, inject, output, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';

type SignupStatus = 'idle' | 'loading' | 'error' | 'success';

@Component({
  selector: 'app-signup',
  templateUrl: './signup.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupComponent {
  authService = inject(AuthService);
  status = signal<SignupStatus>('idle');
  errorMessage = signal('');

  authSuccess = output<void>();
  navigateToLogin = output<void>();

  async handleSignup(event: Event) {
    event.preventDefault();
    this.status.set('loading');
    this.errorMessage.set('');

    const form = event.target as HTMLFormElement;
    const formData = new FormData(form);
    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!fullName) {
        this.status.set('error');
        this.errorMessage.set('يرجى إدخال اسمك الكامل.');
        return;
    }

    if (password !== confirmPassword) {
        this.status.set('error');
        this.errorMessage.set('كلمتا المرور غير متطابقتين.');
        return;
    }

    try {
      await this.authService.signupWithEmail(email, password, fullName);
      this.status.set('success');
    } catch (error: any) {
      this.status.set('error');
      this.errorMessage.set(error.message);
    } finally {
        if(this.status() === 'loading'){
            this.status.set('idle');
        }
    }
  }

  async handleGoogleSignup() {
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