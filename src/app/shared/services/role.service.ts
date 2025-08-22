// role.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';

export interface NavigationItem {
  path: string;
  label: string;
  icon: string;
  roles: string[];
  children?: NavigationItem[];
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  
  private navigationItems: NavigationItem[] = [
    {
      path: '/dashboard',
      label: 'Dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7m-9 2v8m0 0H5a2 2 0 01-2-2v-5.5M12 20h7a2 2 0 002-2v-5.5m-2-2l2 2',
      roles: ['ADMIN', 'PUBLISHER', 'EDITOR', 'AUTHOR', 'JOURNALIST', 'COLUMNIST', 'CONTRIBUTOR', 'REPORTER', 'USER']
    },
    {
      path: '/articles',
      label: 'Articles',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      roles: ['ADMIN', 'PUBLISHER', 'EDITOR', 'AUTHOR', 'JOURNALIST', 'COLUMNIST', 'CONTRIBUTOR', 'REPORTER']
    },
    {
      path: '/categories',
      label: 'Categories',
      icon: 'M4 6h16M4 12h16M4 18h16',
      roles: ['ADMIN', 'PUBLISHER', 'EDITOR']
    },
    {
      path: '/authors',
      label: 'Authors',
      icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      roles: ['ADMIN']
    },
    {
      path: '/reports',
      label: 'Reports',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      roles: ['ADMIN']
    },
    {
      path: '/analytics',
      label: 'Analytics',
      icon: 'M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
      roles: ['ADMIN']
    },
    {
      path: '/settings',
      label: 'Settings',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      roles: ['ADMIN', 'PUBLISHER', 'EDITOR', 'AUTHOR', 'JOURNALIST', 'COLUMNIST', 'CONTRIBUTOR', 'REPORTER', 'USER']
    }
  ];

  constructor(private authService: AuthService) {}

  /**
   * Get navigation items filtered by user roles
   */
  getNavigationItems(): Observable<NavigationItem[]> {
    return new Observable<NavigationItem[]>(subscriber => {
      this.authService.currentUser$.subscribe(user => {
        if (!user || !user.roles) {
          subscriber.next([]);
          return;
        }

        const userRoles = this.normalizeRoles(user.roles);
        const filteredItems = this.navigationItems.filter(item => 
          this.hasRequiredRole(userRoles, item.roles)
        );

        subscriber.next(filteredItems);
      });
    });
  }

  /**
   * Check if user has any of the required roles for a specific route
   */
  hasAccessToRoute(route: string, userRoles: string[]): boolean {
    const normalizedRoles = this.normalizeRoles(userRoles);
    const navItem = this.navigationItems.find(item => item.path === route);
    
    if (!navItem) {
      return false;
    }

    return this.hasRequiredRole(normalizedRoles, navItem.roles);
  }

  /**
   * Check if user has required role
   */
  hasRequiredRole(userRoles: string[], requiredRoles: string[]): boolean {
    return userRoles.some(role => requiredRoles.includes(role));
  }

  /**
   * Get user's highest priority role
   */
  getHighestRole(userRoles: string[]): string {
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

    const normalizedRoles = this.normalizeRoles(userRoles);
    
    let highestRole = 'USER';
    let highestPriority = -1;

    for (const role of normalizedRoles) {
      const priority = roleHierarchy.indexOf(role);
      if (priority > highestPriority) {
        highestPriority = priority;
        highestRole = role;
      }
    }

    return highestRole;
  }

  /**
   * Check if user is admin
   */
  isAdmin(userRoles: string[]): boolean {
    const normalizedRoles = this.normalizeRoles(userRoles);
    return normalizedRoles.includes('ADMIN');
  }

  /**
   * Check if user is publisher or above
   */
  isPublisherOrAbove(userRoles: string[]): boolean {
    const normalizedRoles = this.normalizeRoles(userRoles);
    return normalizedRoles.some(role => ['ADMIN', 'PUBLISHER'].includes(role));
  }

  /**
   * Check if user is editor or above
   */
  isEditorOrAbove(userRoles: string[]): boolean {
    const normalizedRoles = this.normalizeRoles(userRoles);
    return normalizedRoles.some(role => ['ADMIN', 'PUBLISHER', 'EDITOR'].includes(role));
  }

  /**
   * Check if user can create content
   */
  canCreateContent(userRoles: string[]): boolean {
    const normalizedRoles = this.normalizeRoles(userRoles);
    return normalizedRoles.some(role => 
      ['ADMIN', 'PUBLISHER', 'EDITOR', 'AUTHOR', 'JOURNALIST', 'COLUMNIST', 'CONTRIBUTOR', 'REPORTER'].includes(role)
    );
  }

  /**
   * Normalize roles by removing ROLE_ prefix if it exists
   */
  private normalizeRoles(roles: string[]): string[] {
    return roles.map(role => 
      role.startsWith('ROLE_') ? role.substring(5) : role
    );
  }

  /**
   * Get role display name
   */
  getRoleDisplayName(role: string): string {
    const normalizedRole = role.startsWith('ROLE_') ? role.substring(5) : role;
    return normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1).toLowerCase();
  }
}