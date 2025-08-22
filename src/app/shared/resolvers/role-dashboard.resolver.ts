// role-dashboard.resolver.ts
import { Injectable } from '@angular/core';
import { Resolve, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

export interface DashboardConfig {
  component: string;
  route: string;
}

@Injectable({
  providedIn: 'root'
})
export class RoleDashboardResolver implements Resolve<DashboardConfig> {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  resolve(): Observable<DashboardConfig> {
    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user || !user.roles || user.roles.length === 0) {
          // Fallback to default dashboard
          return { component: 'editor', route: '/dashboard/editor' };
        }

        // Determine dashboard based on highest priority role
        const dashboardConfig = this.getDashboardByRole(user.roles);
        return dashboardConfig;
      }),
      catchError(error => {
        console.error('Error resolving dashboard:', error);
        // Fallback to editor dashboard on error
        return of({ component: 'editor', route: '/dashboard/editor' });
      })
    );
  }

  private getDashboardByRole(roles: string[]): DashboardConfig {
    // Role hierarchy - higher index = higher priority
    const roleHierarchy = [
      'USER',
      'REPORTER', 
      'CONTRIBUTOR',
      'COLUMNIST',
      'JOURNALIST',
      'AUTHOR',
      'EDITOR',
      'PUBLISHER',
      'ADMIN'
    ];

    // Normalize roles (remove ROLE_ prefix if exists)
    const normalizedRoles = roles.map(role => 
      role.startsWith('ROLE_') ? role.substring(5) : role
    );

    // Find the highest priority role
    let highestRole = 'USER';
    let highestPriority = -1;

    for (const role of normalizedRoles) {
      const priority = roleHierarchy.indexOf(role);
      if (priority > highestPriority) {
        highestPriority = priority;
        highestRole = role;
      }
    }

    // Map role to dashboard configuration
    switch (highestRole) {
      case 'ADMIN':
        return { component: 'admin', route: '/dashboard/admin' };
      
      case 'PUBLISHER':
        return { component: 'publisher', route: '/dashboard/publisher' };
      
      case 'EDITOR':
        return { component: 'editor', route: '/dashboard/editor' };
      
      case 'AUTHOR':
        return { component: 'author', route: '/dashboard/author' };
      
      case 'JOURNALIST':
      case 'COLUMNIST':
      case 'CONTRIBUTOR': 
      case 'REPORTER':
        return { component: 'journalist', route: '/dashboard/journalist' };
      
      default:
        return { component: 'editor', route: '/dashboard/editor' };
    }
  }
}