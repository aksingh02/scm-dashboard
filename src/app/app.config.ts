import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { HTTP_INTERCEPTORS, provideHttpClient, withFetch } from '@angular/common/http';
import { AuthInterceptor } from './shared/interceptors/auth.interceptor';
import { RoleDashboardResolver } from './shared/resolvers/role-dashboard.resolver';
import { RoleService } from './shared/services/role.service';

export const appConfig: ApplicationConfig = {
  providers: [
    RoleService,
    RoleDashboardResolver,
    provideHttpClient(withFetch()),
    provideRouter(routes),
    provideBrowserGlobalErrorListeners(),
    // provideZoneChangeDetection(),
    provideClientHydration(withEventReplay()),

    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ]
};