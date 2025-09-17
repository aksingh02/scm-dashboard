import { Component, OnInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SidebarService } from '../../services/sidebar.service';
import { AuthService } from '../../services/auth.service';
import Swal from 'sweetalert2';

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css'
})
export class Header implements OnInit, OnDestroy {
  isSettingsDropdownOpen = false;
  currentUser: User | null = null;
  private userSubscription?: Subscription;

  constructor(
    private sidebarService: SidebarService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef // Add ChangeDetectorRef for manual change detection
  ) { }

  ngOnInit() {
    // Subscribe to current user changes
    this.userSubscription = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      // Trigger change detection after user update
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  // Listen for clicks outside the dropdown to close it
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    const dropdown = document.querySelector('.settings-dropdown');
    const button = document.querySelector('.settings-button');

    if (dropdown && button && !dropdown.contains(target) && !button.contains(target)) {
      this.closeSettingsDropdown();
    }
  }

  // Listen for route changes to close dropdown
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: Event) {
    this.closeSettingsDropdown();
  }

  toggleSidebar() {
    this.sidebarService.toggle();
  }

  toggleSettingsDropdown(event?: Event) {
    console.log('Debug: Toggling settings dropdown');
    if (event) {
      event.stopPropagation();
      event.preventDefault(); // Prevent any default behavior
    }
    this.isSettingsDropdownOpen = !this.isSettingsDropdownOpen;
    // Force change detection
    this.cdr.detectChanges();
  }

  closeSettingsDropdown() {
    if (this.isSettingsDropdownOpen) {
      this.isSettingsDropdownOpen = false;
      // Force change detection when closing
      this.cdr.detectChanges();
    }
  }

  getUserRoleDisplay(): string {
    if (!this.currentUser || !this.currentUser.roles || this.currentUser.roles.length === 0) {
      return 'User';
    }

    // Get the highest priority role for display
    const roleHierarchy = ['ADMIN', 'EDITOR', 'AUTHOR', 'JOURNALIST', 'COLUMNIST', 'CONTRIBUTOR', 'REPORTER', 'USER'];

    for (const role of roleHierarchy) {
      if (this.currentUser.roles.some(userRole =>
        userRole === role || userRole === `ROLE_${role}`)) {
        return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
      }
    }

    // Fallback to first role if none match hierarchy
    const firstRole = this.currentUser.roles[0];
    return firstRole.replace('ROLE_', '').charAt(0).toUpperCase() +
      firstRole.replace('ROLE_', '').slice(1).toLowerCase();
  }

  navigateToProfile() {
    this.closeSettingsDropdown();
    this.router.navigate(['/profile']).then(() => {
      // Ensure dropdown stays closed after navigation
      this.isSettingsDropdownOpen = false;
      this.cdr.detectChanges();
    });
  }

  navigateToSettings() {
    this.closeSettingsDropdown();
    this.router.navigate(['/settings']).then(() => {
      // Ensure dropdown stays closed after navigation
      this.isSettingsDropdownOpen = false;
      this.cdr.detectChanges();
    });
  }

  onLogout() {
    this.closeSettingsDropdown();

    Swal.fire({
      title: 'Are you sure?',
      text: 'You will be logged out of your session.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, logout',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.logout();
        this.router.navigate(['/login']).then(() => {
          this.isSettingsDropdownOpen = false;
          this.currentUser = null;
          this.cdr.detectChanges();
        });

        Swal.fire({
          title: 'Logged out!',
          text: 'You have been successfully logged out.',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  }

}