import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Rest, Author, AuthorCreateRequest, UsersApiResponse } from '../../rest';

@Component({
  selector: 'app-authors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './authors.html',
  styleUrl: './authors.css'
})
export class Authors implements OnInit {
  isFormVisible: boolean = false;
  searchQuery: string = '';
  isLoading: boolean = false;
  isSubmitting: boolean = false;
  error: string = '';
  
  // Pagination
  currentPage: number = 0;
  pageSize: number = 12;
  totalPages: number = 0;
  totalElements: number = 0;
  
  newAuthor: AuthorCreateRequest = {
    username: '',
    email: '',
    password: '',
    fullName: '',
    bio: '',
    role: 'CONTRIBUTOR'
  };

  // Extended author model for UI
  extendedNewAuthor = {
    ...this.newAuthor,
    avatarUrl: '',
    socialLinks: {
      twitter: '',
      linkedin: '',
      website: ''
    }
  };

  roleOptions = [
    { value: 'ADMIN', label: 'Admin', color: '#DC2626', description: 'Full system access' },
    { value: 'PUBLISHER', label: 'Publisher', color: '#6B7280', description: 'Approval and publishing' },
    { value: 'AUTHOR', label: 'Author', color: '#059669', description: 'Content creation and management' },
    { value: 'JOURNALIST', label: 'Journalist', color: '#10B981', description: 'News reporting and investigation' },
    { value: 'EDITOR', label: 'Editor', color: '#3B82F6', description: 'Content editing and oversight' },
    { value: 'COLUMNIST', label: 'Columnist', color: '#EF4444', description: 'Opinion and analysis pieces' },
    { value: 'CONTRIBUTOR', label: 'Contributor', color: '#8B5CF6', description: 'Guest content creation' },
    { value: 'REPORTER', label: 'Reporter', color: '#F59E0B', description: 'Field reporting and coverage' },
    { value: 'USER', label: 'User', color: '#6B7280', description: 'Basic user access' },
  ];

  authors: Author[] = [];
  filteredAuthors: Author[] = [];

  constructor(private rest: Rest) {}

  ngOnInit() {
    this.loadAuthors();
  }

  loadAuthors() {
    this.isLoading = true;
    this.error = '';
    
    this.rest.getAllUsers(this.currentPage, this.pageSize, 'createdAt', 'desc').subscribe({
      next: (response: UsersApiResponse) => {
        this.authors = response.content;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.filterAuthors();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading authors:', error);
        
        // Handle 403 specifically - try alternative endpoint or use fallback
        if (error.status === 403) {
          this.tryAlternativeEndpoint();
        } else {
          this.error = 'Failed to load authors. Please try again.';
          this.isLoading = false;
        }
      }
    });
  }

  tryAlternativeEndpoint() {
    this.rest.getAllUsersAlternative(this.currentPage, this.pageSize).subscribe({
      next: (response: UsersApiResponse) => {
        this.authors = response.content;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.filterAuthors();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Alternative endpoint also failed:', error);
        
        if (error.status === 403) {
          this.error = 'You do not have permission to view authors. Please contact your administrator.';
        } else {
          this.error = 'Failed to load authors. Please check your connection and try again.';
        }
        
        // Load mock data as fallback for development
        this.loadMockData();
        this.isLoading = false;
      }
    });
  }

  loadMockData() {
    // Fallback mock data for development/testing
    this.authors = [
      {
        id: 1,
        username: 'john.doe',
        fullName: 'John Doe',
        email: 'john.doe@example.com',
        bio: 'Senior Technology Reporter with 5 years of experience.',
        role: 'JOURNALIST',
        enabled: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        username: 'jane.smith',
        fullName: 'Jane Smith',
        email: 'jane.smith@example.com',
        bio: 'Business Editor specializing in market analysis.',
        role: 'EDITOR',
        enabled: true,
        createdAt: new Date().toISOString()
      }
    ];
    
    this.totalElements = this.authors.length;
    this.totalPages = 1;
    this.filterAuthors();
    
    console.log('Loaded mock data due to API access restrictions');
  }

  filterAuthors() {
    if (!this.searchQuery.trim()) {
      this.filteredAuthors = this.authors;
      return;
    }
    
    const query = this.searchQuery.toLowerCase();
    this.filteredAuthors = this.authors.filter(author => 
      author.fullName.toLowerCase().includes(query) ||
      author.email.toLowerCase().includes(query) ||
      author.username.toLowerCase().includes(query) ||
      author.role.toLowerCase().includes(query)
    );
  }

  onSearchChange() {
    if (this.searchQuery.trim()) {
      this.searchAuthors();
    } else {
      this.filterAuthors();
    }
  }

  searchAuthors() {
    this.isLoading = true;
    
    this.rest.searchUsers(this.searchQuery, 0, this.pageSize).subscribe({
      next: (response: UsersApiResponse) => {
        this.authors = response.content;
        this.filteredAuthors = response.content;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error searching authors:', error);
        this.error = 'Failed to search authors. Please try again.';
        this.isLoading = false;
      }
    });
  }

  showForm() {
    this.isFormVisible = true;
    this.resetForm();
    this.error = '';
  }

  hideForm() {
    this.isFormVisible = false;
    this.resetForm();
    this.error = '';
  }

  resetForm() {
    this.newAuthor = {
      username: '',
      email: '',
      password: '',
      fullName: '',
      bio: '',
      role: 'CONTRIBUTOR'
    };
    
    this.extendedNewAuthor = {
      ...this.newAuthor,
      avatarUrl: '',
      socialLinks: {
        twitter: '',
        linkedin: '',
        website: ''
      }
    };
  }

  selectRole(role: any) {
    this.newAuthor.role = role;
    this.extendedNewAuthor.role = role;
  }

  generateUsername() {
    if (this.extendedNewAuthor.fullName?.trim()) {
      const username = this.extendedNewAuthor.fullName
        .toLowerCase()
        .replace(/\s+/g, '.')
        .replace(/[^a-z0-9.]/g, '');
      
      this.newAuthor.username = username;
      this.extendedNewAuthor.username = username;
    }
  }

  generatePassword() {
    const length = 12;
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let password = "";
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    this.newAuthor.password = password;
  }

  validateForm(): boolean {
    // Clear previous error
    this.error = '';
    
    // Get the actual form values
    const fullName = this.extendedNewAuthor.fullName?.trim();
    const email = this.extendedNewAuthor.email?.trim(); 
    const username = this.extendedNewAuthor.username?.trim();
    const password = this.newAuthor.password?.trim();
    
    if (!fullName) {
      this.error = 'Full name is required';
      return false;
    }
    if (!email) {
      this.error = 'Email is required';
      return false;
    }
    if (!username) {
      this.error = 'Username is required';
      return false;
    }
    if (!password) {
      this.error = 'Password is required';
      return false;
    }
    if (password.length < 6) {
      this.error = 'Password must be at least 6 characters';
      return false;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.error = 'Please enter a valid email address';
      return false;
    }
    
    // Username validation (no spaces, special characters)
    const usernameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!usernameRegex.test(username)) {
      this.error = 'Username can only contain letters, numbers, dots, hyphens, and underscores';
      return false;
    }
    
    return true;
  }

  saveAuthor() {
    // Clear any previous error
    this.error = '';
    
    // Sync the form data properly
    this.syncFormData();
    
    if (!this.validateForm()) {
      return;
    }
    
    this.isSubmitting = true;
    
    console.log('Attempting to create author:', this.newAuthor);
    
    this.rest.createAuthor(this.newAuthor).subscribe({
      next: (author: Author) => {
        console.log('Author created successfully:', author);
        
        // Add the new author to the local list
        this.authors.unshift(author);
        this.filterAuthors();
        
        this.hideForm();
        this.isSubmitting = false;
        
        // Show success message (optional)
        alert('Author created successfully!');
        
        // Optionally reload to get updated data
        // this.loadAuthors();
      },
      error: (error) => {
        console.error('Error creating author:', error);
        
        // Handle specific error messages
        if (error.status === 409) {
          this.error = 'Username or email already exists';
        } else if (error.status === 400) {
          this.error = error.error?.message || 'Invalid data provided. Please check all fields.';
        } else if (error.status === 403) {
          this.error = 'You do not have permission to create authors';
        } else if (error.status === 401) {
          this.error = 'Authentication required. Please log in again.';
        } else {
          this.error = 'Failed to create author. Please try again.';
        }
        
        this.isSubmitting = false;
      }
    });
  }

  syncFormData() {
    // Ensure all form data is properly synced
    this.newAuthor.fullName = this.extendedNewAuthor.fullName?.trim() || '';
    this.newAuthor.email = this.extendedNewAuthor.email?.trim() || '';
    this.newAuthor.username = this.extendedNewAuthor.username?.trim() || '';
    this.newAuthor.bio = this.extendedNewAuthor.bio?.trim() || '';
    this.newAuthor.role = this.extendedNewAuthor.role || 'CONTRIBUTOR';
  }

  deleteAuthor(authorId: number) {
    if (confirm('Are you sure you want to delete this author? This action cannot be undone.')) {
      this.rest.deleteUser(authorId).subscribe({
        next: () => {
          console.log('Author deleted successfully');
          this.authors = this.authors.filter(author => author.id !== authorId);
          this.filterAuthors();
        },
        error: (error) => {
          console.error('Error deleting author:', error);
          if (error.status === 403) {
            alert('You do not have permission to delete authors');
          } else {
            alert('Failed to delete author. Please try again.');
          }
        }
      });
    }
  }

  getRoleColor(role: string): string {
    const roleOption = this.roleOptions.find(option => option.value === role);
    return roleOption?.color || '#6B7280';
  }

  getRoleLabel(role: string): string {
    const roleOption = this.roleOptions.find(option => option.value === role);
    return roleOption?.label || role;
  }

  getRoleDescription(role: string): string {
    const roleOption = this.roleOptions.find(option => option.value === role);
    return roleOption?.description || '';
  }

  getInitials(name: string): string {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  }

  onImageError(event: Event): void {
    const target = event.target as HTMLImageElement;
    if (target) {
      target.style.display = 'none';
      const nextElement = target.nextElementSibling as HTMLElement;
      if (nextElement) {
        nextElement.classList.remove('hidden');
      }
    }
  }

  // Pagination methods
  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadAuthors();
    }
  }

  previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadAuthors();
    }
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadAuthors();
    }
  }

  clearSearch() {
    this.searchQuery = '';
    this.filterAuthors();
  }
}