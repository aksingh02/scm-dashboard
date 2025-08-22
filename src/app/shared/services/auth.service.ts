// shared/services/auth.service.ts - Updated role handling methods
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// Updated interfaces to match your API
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

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private authUrl = environment.scm_auth_endpoint;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    // Check if user is already logged in on service initialization
    this.checkAuthStatus();
  }

  private checkAuthStatus(): void {
    if (!this.isBrowser) return; // Skip during SSR
    
    const token = this.getStoredToken();
    if (token && this.isTokenValid(token)) {
      const user = this.getUserFromToken(token);
      this.currentUserSubject.next(user);
    } else {
      this.clearAuthToken();
    }
  }

  login(credentials: LoginRequest, rememberMe: boolean = false): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.authUrl}signin`, credentials, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      })
    }).pipe(
      map(response => {
        console.log('Login successful:', response); // Debug log
        if (response && response.token) {
          // Store the full token with bearer type
          const fullToken = `${response.type} ${response.token}`;
          this.setAuthToken(fullToken, rememberMe);
          
          // Create user object from response
          const user: User = {
            id: response.id,
            username: response.username,
            email: response.email,
            fullName: response.fullName,
            roles: response.roles
          };
          
          console.log('User roles:', user.roles); // Debug log
          this.currentUserSubject.next(user);
        }
        return response;
      }),
      catchError(this.handleError.bind(this))
    );
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.authUrl}signup`, userData, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      })
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  logout(): void {
    this.clearAuthToken();
    this.currentUserSubject.next(null);
  }

  // Token management methods (SSR-safe)
  getStoredToken(): string | null {
    if (!this.isBrowser) return null;
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  }

  setAuthToken(token: string, remember: boolean = false): void {
    if (!this.isBrowser) return;
    
    if (remember) {
      localStorage.setItem('authToken', token);
      sessionStorage.removeItem('authToken');
    } else {
      sessionStorage.setItem('authToken', token);
      localStorage.removeItem('authToken');
    }
  }

  clearAuthToken(): void {
    if (!this.isBrowser) return;
    
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
  }

  // Token validation
  isTokenValid(token: string): boolean {
    if (!token) return false;

    try {
      const jwtToken = token.startsWith('Bearer ') ? token.substring(7) : token;
      const payload = JSON.parse(atob(jwtToken.split('.')[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      if (payload.exp && payload.exp < currentTime) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Invalid token format:', error);
      return false;
    }
  }

  // Get user info from token - UPDATED to handle ROLE_ prefix
  getUserFromToken(token: string): User | null {
    if (!token) return null;

    try {
      const jwtToken = token.startsWith('Bearer ') ? token.substring(7) : token;
      const payload = JSON.parse(atob(jwtToken.split('.')[1]));
      
      // Handle roles from token (they might have ROLE_ prefix)
      let roles = payload.roles || payload.authorities || [];
      
      return {
        id: payload.sub || payload.userId || payload.id,
        username: payload.username || payload.preferred_username,
        email: payload.email,
        fullName: payload.fullName || payload.name || payload.given_name + ' ' + payload.family_name,
        roles: roles
      };
    } catch (error) {
      console.error('Invalid token format:', error);
      return null;
    }
  }

  // Check authentication status
  isAuthenticated(): boolean {
    if (!this.isBrowser) return false;
    const token = this.getStoredToken();
    return token ? this.isTokenValid(token) : false;
  }

  // Get current user
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  // UPDATED: Check if user has specific role (handles ROLE_ prefix)
  hasRole(role: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    console.log('Checking role:', role, 'User roles:', user.roles); // Debug log
    
    // Check both with and without ROLE_ prefix
    return user.roles.includes(role) || 
           user.roles.includes(`ROLE_${role}`) ||
           user.roles.some(userRole => userRole.replace('ROLE_', '') === role);
  }

  // UPDATED: Check if user has any of the specified roles (handles ROLE_ prefix)
  hasAnyRole(roles: string[]): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    console.log('Checking roles:', roles, 'User roles:', user.roles); // Debug log
    
    return roles.some(role => this.hasRole(role));
  }

  // Helper method to normalize role (remove ROLE_ prefix if present)
  private normalizeRole(role: string): string {
    return role.startsWith('ROLE_') ? role.substring(5) : role;
  }

  // Helper method to get user roles without ROLE_ prefix
  getUserRoles(): string[] {
    const user = this.getCurrentUser();
    if (!user) return [];
    
    return user.roles.map(role => this.normalizeRole(role));
  }

  // Get authorization headers for API calls
  getAuthHeaders(): HttpHeaders {
    const token = this.getStoredToken();
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    if (token && this.isTokenValid(token)) {
      headers = headers.set('Authorization', token);
    }

    return headers;
  }

  // Get token for manual header setting
  getTokenForHeader(): string | null {
    const token = this.getStoredToken();
    if (token && this.isTokenValid(token)) {
      return token;
    }
    return null;
  }

  // Refresh token (if your API supports it)
  refreshToken(): Observable<LoginResponse> {
    const token = this.getStoredToken();
    if (!token) {
      throw new Error('No token available for refresh');
    }

    return this.http.post<LoginResponse>(`${this.authUrl}refresh`, {}, {
      headers: new HttpHeaders({
        'Authorization': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      })
    }).pipe(
      map((response: LoginResponse) => {
        if (response && response.token) {
          const wasRemembered = this.isBrowser ? !!localStorage.getItem('authToken') : false;
          const fullToken = `${response.type} ${response.token}`;
          this.setAuthToken(fullToken, wasRemembered);
          
          const user: User = {
            id: response.id,
            username: response.username,
            email: response.email,
            fullName: response.fullName,
            roles: response.roles
          };
          
          this.currentUserSubject.next(user);
        }
        return response;
      }),
      catchError(error => {
        console.error('Token refresh error:', error);
        this.logout();
        return throwError(() => error);
      })
    );
  }

  // Password reset methods
  requestPasswordReset(email: string): Observable<any> {
    return this.http.post(`${this.authUrl}forgot-password`, { email }, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      })
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  resetPassword(token: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.authUrl}reset-password`, {
      token,
      password: newPassword
    }, {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      })
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.authUrl}change-password`, {
      currentPassword,
      newPassword
    }, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(this.handleError.bind(this))
    );
  }

  // Handle HTTP errors
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `Error: ${error.error.message}`;
    } else {
      switch (error.status) {
        case 401:
          errorMessage = 'Invalid username or password';
          break;
        case 403:
          errorMessage = 'Access forbidden';
          break;
        case 404:
          errorMessage = 'Service not found';
          break;
        case 422:
          errorMessage = error.error?.message || 'Validation error';
          break;
        case 429:
          errorMessage = 'Too many requests. Please try again later';
          break;
        case 500:
          errorMessage = 'Internal server error';
          break;
        case 0:
          errorMessage = 'Unable to connect to server';
          break;
        default:
          errorMessage = error.error?.message || `Error ${error.status}: ${error.message}`;
      }
    }

    console.error('Auth Service Error:', error);
    return throwError(() => ({
      status: error.status,
      message: errorMessage,
      error: error.error
    }));
  }
} 