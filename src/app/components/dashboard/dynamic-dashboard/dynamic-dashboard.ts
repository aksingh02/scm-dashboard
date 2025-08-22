// dynamic-dashboard.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../shared/services/auth.service';
import { RoleService } from '../../../shared/services/role.service';

// Import all dashboard components
import { AdminDashboard } from '../admin-dashboard/admin-dashboard';
import { PublisherDashboard } from '../publisher-dashboard/publisher-dashboard';
import { EditorDashboard } from '../editor-dashboard/editor-dashboard';
import { AuthorDashboard } from '../author-dashboard/author-dashboard';
import { JournalistDashboard } from '../journalist-dashboard/journalist-dashboard';

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
}

@Component({
  selector: 'app-dynamic-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    AdminDashboard,
    PublisherDashboard,
    EditorDashboard,
    AuthorDashboard,
    JournalistDashboard
  ],
  templateUrl: './dynamic-dashboard.html',
  styleUrls: ['./dynamic-dashboard.css']
})
export class DynamicDashboard implements OnInit, OnDestroy {
  currentUser: User | null = null;
  dashboardType: string = '';
  isLoading = true;
  errorMessage = '';
  
  private userSubscription!: Subscription;

  constructor(
    private authService: AuthService,
    private roleService: RoleService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.userSubscription = this.authService.currentUser$.subscribe({
      next: (user) => {
        this.currentUser = user;
        if (user && user.roles) {
          this.determineDashboardType();
        } else {
          this.handleError('User data not available');
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.handleError('Failed to load user information');
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  private determineDashboardType() {
    if (!this.currentUser || !this.currentUser.roles) {
      this.errorMessage = 'No user roles found';
      return;
    }

    const highestRole = this.roleService.getHighestRole(this.currentUser.roles);
    
    switch (highestRole) {
      case 'ADMIN':
        this.dashboardType = 'admin';
        break;
      case 'PUBLISHER':
        this.dashboardType = 'publisher';
        break;
      case 'EDITOR':
        this.dashboardType = 'editor';
        break;
      case 'AUTHOR':
        this.dashboardType = 'author';
        break;
      case 'JOURNALIST':
      case 'COLUMNIST':
      case 'CONTRIBUTOR':
      case 'REPORTER':
        this.dashboardType = 'journalist';
        break;
      default:
        this.dashboardType = 'editor'; // Fallback
        break;
    }
  }

  private handleError(message: string) {
    this.errorMessage = message;
    console.error('Dynamic Dashboard Error:', message);
  }

  refreshDashboard() {
    this.isLoading = true;
    this.errorMessage = '';
    
    // Refresh user data
    // this.authService.refreshUserData().subscribe({
    //   next: () => {
    //     this.isLoading = false;
    //   },
    //   error: (error) => {
    //     this.handleError('Failed to refresh dashboard');
    //     this.isLoading = false;
    //   }
    // });
  }

  // Helper methods for role checking
  isAdmin(): boolean {
    return this.currentUser ? this.roleService.isAdmin(this.currentUser.roles) : false;
  }

  isPublisher(): boolean {
    return this.currentUser ? this.roleService.isPublisherOrAbove(this.currentUser.roles) : false;
  }

  isEditor(): boolean {
    return this.currentUser ? this.roleService.isEditorOrAbove(this.currentUser.roles) : false;
  }

  getRoleDisplayName(): string {
    if (!this.currentUser || !this.currentUser.roles) {
      return 'User';
    }
    
    const highestRole = this.roleService.getHighestRole(this.currentUser.roles);
    return this.roleService.getRoleDisplayName(highestRole);
  }
}