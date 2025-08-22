import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { catchError, of } from 'rxjs';
import { AuthService } from '../../shared/services/auth.service';
import { RoleService } from '../../shared/services/role.service';

interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  token: string;
  type: string;
  id: number;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class Login implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  showPassword = false;
  rememberMe = false;
  private isBrowser: boolean;
  private redirectUrl = '/dashboard'; // Default redirect

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private roleService: RoleService,
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  ngOnInit(): void {
    // Check if user is already authenticated
    if (this.authService.isAuthenticated()) {
      this.redirectToRoleDashboard();
      return;
    }

    // Get redirect URL from query params or localStorage
    this.getRedirectUrl();

    // Add subtle animations on load
    if (this.isBrowser) {
      this.addLoadAnimations();
    }
  }

  private getRedirectUrl(): void {
    if (!this.isBrowser) return;

    // Check query params first
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    if (returnUrl) {
      this.redirectUrl = returnUrl;
      return;
    }

    // Check localStorage
    const storedUrl = localStorage.getItem('redirectUrl');
    if (storedUrl) {
      this.redirectUrl = storedUrl;
      localStorage.removeItem('redirectUrl'); // Clean up
    }
  }

  private addLoadAnimations(): void {
    setTimeout(() => {
      const loginCard = document.querySelector('.login-card');
      if (loginCard) {
        loginCard.classList.add('animate-fade-in-up');
      }
    }, 100);
  }

  get username() { return this.loginForm.get('username'); }
  get password() { return this.loginForm.get('password'); }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.performLogin();
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach(field => {
      const control = this.loginForm.get(field);
      control?.markAsTouched({ onlySelf: true });
    });
  }

  private performLogin(): void {
    this.isLoading = true;
    this.clearMessages();

    const loginData: LoginRequest = {
      username: this.loginForm.value.username.trim(),
      password: this.loginForm.value.password
    };

    this.authService.login(loginData, this.rememberMe)
      .pipe(
        catchError(error => {
          console.error('Login error:', error);
          this.handleLoginError(error);
          return of(null);
        })
      )
      .subscribe({
        next: (response: LoginResponse | null) => {
          this.isLoading = false;
          if (response) {
            console.log('Login successful:', response);
            this.handleLoginSuccess(response);
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.handleLoginError(error);
        }
      });
  }

  private handleLoginSuccess(response: LoginResponse): void {
    const roleDisplayName = this.roleService.getRoleDisplayName(
      this.roleService.getHighestRole(response.roles)
    );
    
    this.successMessage = `Welcome back, ${response.fullName || response.username}! (${roleDisplayName})`;
    
    // Add success animation
    if (this.isBrowser) {
      const loginCard = document.querySelector('.login-card');
      if (loginCard) {
        loginCard.classList.add('animate-success');
      }
    }

    // Navigate to role-appropriate dashboard after a short delay
    setTimeout(() => {
      this.redirectToRoleDashboard();
    }, 1500);
  }

  /**
   * Redirect user to their role-appropriate dashboard
   */
  private redirectToRoleDashboard(): void {
    this.authService.currentUser$.subscribe(user => {
      if (user && user.roles) {
        const highestRole = this.roleService.getHighestRole(user.roles);
        
        // If there's a specific redirect URL, use it
        if (this.redirectUrl && this.redirectUrl !== '/dashboard') {
          // Check if user has access to the redirect URL
          if (this.roleService.hasAccessToRoute(this.redirectUrl, user.roles)) {
            this.router.navigate([this.redirectUrl]);
            return;
          }
        }

        // Navigate to role-specific dashboard
        switch (highestRole) {
          case 'ADMIN':
            this.router.navigate(['/dashboard/admin']);
            break;
          case 'PUBLISHER':
            this.router.navigate(['/dashboard/publisher']);
            break;
          case 'EDITOR':
            this.router.navigate(['/dashboard/editor']);
            break;
          case 'AUTHOR':
            this.router.navigate(['/dashboard/author']);
            break;
          case 'JOURNALIST':
          case 'COLUMNIST':
          case 'CONTRIBUTOR':
          case 'REPORTER':
            this.router.navigate(['/dashboard/journalist']);
            break;
          default:
            this.router.navigate(['/dashboard']);
            break;
        }
      } else {
        // Fallback to default dashboard
        this.router.navigate(['/dashboard']);
      }
    });
  }

  private handleLoginError(error: any): void {
    if (error.status === 401) {
      this.errorMessage = 'Invalid username or password. Please try again.';
    } else if (error.status === 403) {
      this.errorMessage = 'Your account has been temporarily suspended. Please contact support.';
    } else if (error.status === 429) {
      this.errorMessage = 'Too many login attempts. Please try again later.';
    } else if (error.status === 0) {
      this.errorMessage = 'Unable to connect to the server. Please check your internet connection.';
    } else {
      this.errorMessage = error.message || 'An unexpected error occurred. Please try again.';
    }

    // Add shake animation for error
    if (this.isBrowser) {
      const loginCard = document.querySelector('.login-card');
      if (loginCard) {
        loginCard.classList.add('animate-shake');
        setTimeout(() => {
          loginCard.classList.remove('animate-shake');
        }, 600);
      }
    }
  }

  private clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  onForgotPassword(): void {
    // Navigate to forgot password page or show modal
    this.router.navigate(['/forgot-password']);
  }

  onSignUp(): void {
    // Navigate to registration page
    this.router.navigate(['/register']);
  }

  // Social login methods (if needed)
  onGoogleLogin(): void {
    // Implement Google OAuth login
    console.log('Google login clicked');
  }

  onGithubLogin(): void {
    // Implement GitHub OAuth login
    console.log('GitHub login clicked');
  }

  // Keyboard event handlers
  onEnterKey(event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.loginForm.valid) {
      this.onSubmit();
    }
  }
}