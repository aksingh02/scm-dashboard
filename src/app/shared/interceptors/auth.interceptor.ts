// shared/interceptors/auth.interceptor.ts - Updated with API key support
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  private isBrowser: boolean;

  constructor(
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip adding auth headers for auth endpoints
    if (this.isAuthUrl(request.url)) {
      return next.handle(request);
    }

    // Add appropriate auth headers (API key or JWT token)
    const authRequest = this.addAuthHeader(request);

    return next.handle(authRequest).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && !authRequest.url.includes('auth/signin')) {
          switch (error.status) {
            case 401:
              // Only try to refresh token for JWT-protected endpoints
              if (!this.authService.isPublicApiEndpoint(authRequest.url)) {
                return this.handle401Error(authRequest, next);
              }
              break;
            case 403:
              // Forbidden - redirect to unauthorized page or login
              this.router.navigate(['/unauthorized']);
              break;
            default:
              break;
          }
        }

        return throwError(() => error);
      })
    );
  }

  private addAuthHeader(request: HttpRequest<any>): HttpRequest<any> {
    // Check if this is a public API endpoint that requires API key
    if (this.authService.isPublicApiEndpoint(request.url)) {
      console.log('Adding API key for public endpoint:', request.url);
      return request.clone({
        headers: request.headers.set('X-API-KEY', this.authService.getApiKey())
      });
    }

    // For other endpoints, use JWT token if available
    const token = this.authService.getTokenForHeader();
    
    if (token && this.isBrowser) {
      console.log('Adding JWT token for protected endpoint:', request.url);
      return request.clone({
        headers: request.headers.set('Authorization', token)
      });
    }
    
    return request;
  }

  private isAuthUrl(url: string): boolean {
    return url.includes('/auth/signin') || 
           url.includes('/auth/signup') || 
           url.includes('/auth/refresh') ||
           url.includes('/auth/forgot-password') ||
           url.includes('/auth/reset-password');
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      const token = this.authService.getTokenForHeader();

      if (token) {
        return this.authService.refreshToken().pipe(
          switchMap((response: any) => {
            this.isRefreshing = false;
            this.refreshTokenSubject.next(response.token);
            
            return next.handle(this.addAuthHeader(request));
          }),
          catchError((err) => {
            this.isRefreshing = false;
            
            this.authService.logout();
            this.router.navigate(['/login']);
            
            return throwError(() => err);
          })
        );
      }
    }

    return this.refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(() => next.handle(this.addAuthHeader(request)))
    );
  }
}