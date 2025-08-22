import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { 
  CanActivate, 
  CanActivateChild, 
  ActivatedRouteSnapshot, 
  RouterStateSnapshot, 
  Router,
  UrlTree 
} from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {
  
  private isBrowser: boolean;

  constructor(
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
    
    return this.checkAuth(state.url);
  }

  canActivateChild(
    childRoute: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree | Observable<boolean | UrlTree> | Promise<boolean | UrlTree> {
    
    return this.checkAuth(state.url);
  }

  private checkAuth(url: string): boolean | UrlTree {
    console.log('AuthGuard: Checking authentication for URL:', url);
    
    // Skip auth check during SSR
    if (!this.isBrowser) {
      console.log('AuthGuard: Skipping auth check during SSR');
      return true;
    }

    try {
      const isAuthenticated = this.authService.isAuthenticated();
      console.log('AuthGuard: Authentication status:', isAuthenticated);
      
      if (isAuthenticated) {
        // Double-check that we have user data
        const currentUser = this.authService.getCurrentUser();
        console.log('AuthGuard: Current user:', currentUser);
        
        if (currentUser) {
          return true;
        } else {
          console.log('AuthGuard: No user data found despite valid token');
          // Try to restore user from token
          const token = this.authService.getStoredToken();
          if (token) {
            const user = this.authService.getUserFromToken(token);
            if (user) {
              console.log('AuthGuard: User restored from token');
              return true;
            }
          }
        }
      }

      console.log('AuthGuard: Authentication failed, redirecting to login');
      
      // Store the attempted URL for redirecting after login
      if (this.isBrowser && url !== '/login') {
        localStorage.setItem('redirectUrl', url);
        console.log('AuthGuard: Stored redirect URL:', url);
      }
      
      // Redirect to login page
      return this.router.createUrlTree(['/login']);
    } catch (error) {
      console.error('AuthGuard: Error during authentication check:', error);
      
      // Store redirect URL and go to login on error
      if (this.isBrowser && url !== '/login') {
        localStorage.setItem('redirectUrl', url);
      }
      
      return this.router.createUrlTree(['/login']);
    }
  }
}

// Enhanced Role-based guard
@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  
  private isBrowser: boolean;

  constructor(
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    
    console.log('RoleGuard: Checking role access for URL:', state.url);
    
    // Skip role check during SSR
    if (!this.isBrowser) {
      console.log('RoleGuard: Skipping role check during SSR');
      return true;
    }

    try {
      const requiredRoles = route.data?.['roles'] as string[];
      console.log('RoleGuard: Required roles:', requiredRoles);
      
      if (!this.authService.isAuthenticated()) {
        console.log('RoleGuard: User not authenticated');
        if (this.isBrowser) {
          localStorage.setItem('redirectUrl', state.url);
        }
        return this.router.createUrlTree(['/login']);
      }

      if (!requiredRoles || requiredRoles.length === 0) {
        console.log('RoleGuard: No specific roles required');
        return true; // No specific roles required
      }

      const currentUser = this.authService.getCurrentUser();
      console.log('RoleGuard: Current user:', currentUser);
      
      if (!currentUser) {
        console.log('RoleGuard: No current user found');
        if (this.isBrowser) {
          localStorage.setItem('redirectUrl', state.url);
        }
        return this.router.createUrlTree(['/login']);
      }

      const hasRequiredRole = this.authService.hasAnyRole(requiredRoles);
      console.log('RoleGuard: User has required role:', hasRequiredRole);
      
      if (hasRequiredRole) {
        return true;
      }

      console.log('RoleGuard: User does not have required role, redirecting to unauthorized');
      // User doesn't have required role, redirect to unauthorized page
      return this.router.createUrlTree(['/unauthorized']);
      
    } catch (error) {
      console.error('RoleGuard: Error during role check:', error);
      return this.router.createUrlTree(['/unauthorized']);
    }
  }
}

// Additional guard for admin-only routes
@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  
  private isBrowser: boolean;

  constructor(
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): boolean | UrlTree {
    
    if (!this.isBrowser) {
      return true; // Skip during SSR
    }

    if (!this.authService.isAuthenticated()) {
      if (this.isBrowser) {
        localStorage.setItem('redirectUrl', state.url);
      }
      return this.router.createUrlTree(['/login']);
    }

    if (this.authService.hasRole('ADMIN')) {
      return true;
    }

    return this.router.createUrlTree(['/unauthorized']);
  }
}