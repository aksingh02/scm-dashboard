import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { SidebarService } from '../../services/sidebar.service';
import { AuthService } from '../../services/auth.service';
import { RoleService, NavigationItem } from '../../services/role.service';

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class Sidebar implements OnInit, OnDestroy {
  isVisible = true;
  currentUser: User | null = null;
  navigationItems: NavigationItem[] = [];
  
  private sidebarSubscription!: Subscription;
  private userSubscription!: Subscription;
  private navigationSubscription!: Subscription;

  constructor(
    private sidebarService: SidebarService,
    private authService: AuthService,
    private roleService: RoleService
  ) {}

  ngOnInit() {
    // Subscribe to sidebar visibility changes
    this.sidebarSubscription = this.sidebarService.isVisible$.subscribe(
      isVisible => this.isVisible = isVisible
    );

    // Subscribe to current user changes
    this.userSubscription = this.authService.currentUser$.subscribe(
      user => {
        this.currentUser = user;
        // Update navigation when user changes
        if (user) {
          this.loadNavigationItems();
        }
      }
    );
  }

  ngOnDestroy() {
    if (this.sidebarSubscription) {
      this.sidebarSubscription.unsubscribe();
    }
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
    if (this.navigationSubscription) {
      this.navigationSubscription.unsubscribe();
    }
  }

  private loadNavigationItems() {
    this.navigationSubscription = this.roleService.getNavigationItems().subscribe(
      items => this.navigationItems = items
    );
  }

  getUserInitial(): string {
    if (!this.currentUser) return 'U';
    
    if (this.currentUser.fullName) {
      return this.currentUser.fullName.charAt(0).toUpperCase();
    }
    
    return this.currentUser.username.charAt(0).toUpperCase();
  }

  getUserDisplayName(): string {
    if (!this.currentUser) return 'Admin User';
    
    return this.currentUser.fullName || this.currentUser.username;
  }

  getUserRoleDisplay(): string {
    if (!this.currentUser || !this.currentUser.roles || this.currentUser.roles.length === 0) {
      return 'Content Manager';
    }

    const highestRole = this.roleService.getHighestRole(this.currentUser.roles);
    return this.roleService.getRoleDisplayName(highestRole);
  }

  /**
   * Check if user has access to a specific navigation item
   */
  hasAccess(item: NavigationItem): boolean {
    if (!this.currentUser || !this.currentUser.roles) {
      return false;
    }

    return this.roleService.hasRequiredRole(this.currentUser.roles, item.roles);
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    if (!this.currentUser || !this.currentUser.roles) {
      return false;
    }
    return this.roleService.isAdmin(this.currentUser.roles);
  }

  /**
   * Check if user can manage content (editor or above)
   */
  canManageContent(): boolean {
    if (!this.currentUser || !this.currentUser.roles) {
      return false;
    }
    return this.roleService.isEditorOrAbove(this.currentUser.roles);
  }

  /**
   * Check if user can create content
   */
  canCreateContent(): boolean {
    if (!this.currentUser || !this.currentUser.roles) {
      return false;
    }
    return this.roleService.canCreateContent(this.currentUser.roles);
  }
}