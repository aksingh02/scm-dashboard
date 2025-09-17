import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Rest } from '../../../rest';
import { Category } from '../../../shared/models/category';

// ⬇️ import SweetAlert2
import Swal from 'sweetalert2';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.html',
  styleUrl: './categories.css'
})
export class Categories implements OnInit {
  isFormVisible: boolean = false;
  categories: Category[] = [];

  constructor(private rest: Rest) {}

  ngOnInit() {
    this.loadCategories();
  }

  loadCategories() {
    this.rest.getArticlesCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        console.log('Categories loaded:', this.categories);
      },
      error: (error) => { 
        console.error('Error loading categories:', error);
        // ❌ alert
        Swal.fire({
          icon: 'error',
          title: 'Oops…',
          text: 'Failed to load categories. Please try again later.',
          confirmButtonColor: '#3B82F6'
        });
      }
    });
  }
  
  newCategory: Category = {
    id: 0,
    name: '',
    slug: '',
    description: '',
    color: '#3B82F6',
    icon: 'folder',
    articleCount: 0,
    active: false
  };

  colorOptions = [
    '#3B82F6','#EF4444','#F59E0B','#10B981',
    '#8B5CF6','#06B6D4','#EC4899','#84CC16'
  ];

  showForm() {
    this.isFormVisible = true;
    this.resetForm();
  }

  hideForm() {
    this.isFormVisible = false;
    this.resetForm();
  }

  resetForm() {
    this.newCategory = {
      id: 0,
      name: '',
      slug: '',
      description: '',
      color: '#3B82F6',
      icon: 'folder',
      articleCount: 0,
      active: false
    };
  }

  onNameChange() {
    if (this.newCategory.name) {
      this.newCategory.slug = this.newCategory.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
    }
  }

  selectColor(color: string) {
    this.newCategory.color = color;
  }

  saveCategory() {
    if (this.newCategory.name.trim()) {
      const category: Category = {
        ...this.newCategory,
        id: Date.now()
      };
      
      this.categories.push(category);
      this.hideForm();
      
      // ✅ Sweetalert success
      Swal.fire({
        icon: 'success',
        title: 'Saved!',
        text: `Category "${category.name}" saved successfully`,
        timer: 1500,
        showConfirmButton: false
      });

      console.log('Category saved:', category);
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Name required',
        text: 'Please enter a category name'
      });
    }
  }

  deleteCategory(categoryId: number) {
    // ✅ Sweetalert confirm
    Swal.fire({
      title: 'Are you sure?',
      text: 'This will permanently delete the category!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.categories = this.categories.filter(cat => cat.id !== categoryId);
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'The category has been deleted.',
          timer: 1500,
          showConfirmButton: false
        });
      }
    });
  }

  getIconSvg(iconName: string): string {
    const icons: { [key: string]: string } = {
      laptop: 'M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z',
      briefcase: 'M20 6h-2.5l-1.1-1.4c-.5-.6-1.3-1-2.1-1H9.7c-.8 0-1.6.4-2.1 1L6.5 6H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2z',
      government: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z',
      trophy: 'M7 4V2a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v2h1a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-1v1a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-1H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3z',
      heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
      folder: 'M10 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2h-8l-2-2z'
    };
    return icons[iconName] || icons['folder'];
  }
}