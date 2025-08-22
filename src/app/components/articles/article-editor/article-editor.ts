import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { Rest } from '../../../rest';
import { ArticleCreateRequest } from '../../../shared/models/articles';

interface Category {
  id: number;
  name: string;
}

@Component({
  selector: 'app-article-editor',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './article-editor.html',
  styleUrl: './article-editor.css'
})
export class ArticleEditor {
  @Output() backToList = new EventEmitter<void>();

  isPreviewMode = false;
  isSubmitting = false;
  submitError: string | null = null;
  categoryOptions: Category[] = [];
  newTag = '';

  article = {
    title: '',
    urlSlug: '',
    excerpt: '',
    content: '',
    status: 'DRAFT',
    featuredArticle: false,
    trending: false,
    selectedCategoryIds: [] as number[],  // Changed to array of IDs
    author: '',
    featuredImageUrl: '',
    tags: [] as string[]
  };

  statusOptions = [
    { label: 'Draft', value: 'DRAFT' },           // Updated to uppercase
    { label: 'Ready for Review', value: 'READY_FOR_REVIEW' },   // Updated to uppercase
    { label: 'Archived', value: 'ARCHIVED' }      // Updated to uppercase
  ];

  constructor(
    private rest: Rest
  ) {}

  get titleCharCount(): number {
    return this.article.title.length;
  }

  get excerptCharCount(): number {
    return this.article.excerpt.length;
  }

  onGoBack(): void {
    this.backToList.emit();
  }

  togglePreview(): void {
    this.isPreviewMode = !this.isPreviewMode;
  }

  onTitleChange(): void {
    this.article.urlSlug = this.generateSlug(this.article.title);
  }

  generateSlug(text: string): string {
    return text.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  }

  onImageUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.article.featuredImageUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  onTagKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addTag();
    }
  }

  addTag(): void {
    const tag = this.newTag.trim();
    if (tag && !this.article.tags.includes(tag)) {
      this.article.tags.push(tag);
    }
    this.newTag = '';
  }

  removeTag(index: number): void {
    this.article.tags.splice(index, 1);
  }

  saveDraft(): void {
    this.submitArticle(false);
  }

  submit(): void {
    this.submitArticle(this.article.status === 'PUBLISHED');
  }

  ngOnInit() {
    this.loadCategories();
  }

  private loadCategories() {
    this.rest.getArticlesCategories().subscribe(categories => {
      this.categoryOptions = categories;
      console.log('Categories loaded:', this.categoryOptions);
    }, error => { 
      console.error('Error loading categories:', error);
      alert('Failed to load categories. Please try again later.');
    });
  }

  // Updated method to handle multiple category selection
  onCategoryChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedOptions = Array.from(target.selectedOptions);
    this.article.selectedCategoryIds = selectedOptions.map(option => parseInt(option.value)).filter(id => !isNaN(id));
  }

  // Helper method to check if category is selected
  isCategorySelected(categoryId: number): boolean {
    return this.article.selectedCategoryIds.includes(categoryId);
  }

  // Method to toggle category selection (for checkbox-style selection)
  toggleCategorySelection(categoryId: number): void {
    const index = this.article.selectedCategoryIds.indexOf(categoryId);
    if (index > -1) {
      this.article.selectedCategoryIds.splice(index, 1);
    } else {
      this.article.selectedCategoryIds.push(categoryId);
    }
  }

  // Helper method to get category name by ID
  getCategoryNameById(categoryId: number): string {
    const category = this.categoryOptions.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown Category';
  }

  private submitArticle(publish: boolean): void {
    if (!this.validateArticle()) {
      return;
    }

    this.isSubmitting = true;
    this.submitError = null;

    // Updated to match the new API request format
    const articleData: ArticleCreateRequest = {
      title: this.article.title,
      excerpt: this.article.excerpt,
      content: this.article.content,
      imageUrl: this.article.featuredImageUrl,
      categoryIds: this.article.selectedCategoryIds,  // Send array of category IDs
      tags: this.article.tags,                        // Include tags array
      status: this.article.status,                    // Send uppercase status
      trending: this.article.trending,                // Include trending field
      published: publish,                             // Keep published boolean
      featured: this.article.featuredArticle         // Keep featured boolean
    };

    const apiCall = publish 
      ? this.rest.createArticle(articleData)
      : this.rest.saveDraft(articleData);

    apiCall.pipe(
        catchError(error => {
          console.error('Error submitting article:', error);
          this.submitError = `Failed to ${publish ? 'publish' : 'save'} article. Please try again.`;
          this.isSubmitting = false;
          return of(null);
        })
      )
      .subscribe(response => {
        this.isSubmitting = false;
        if (response) {
          console.log('Article submitted successfully:', response);
          // Go back to list after successful submission
          this.backToList.emit();
        }
      });
  }

  private validateArticle(): boolean {
    if (!this.article.title.trim()) {
      this.submitError = 'Title is required';
      return false;
    }
    if (!this.article.excerpt.trim()) {
      this.submitError = 'Excerpt is required';
      return false;
    }
    if (!this.article.content.trim()) {
      this.submitError = 'Content is required';
      return false;
    }
    if (this.article.selectedCategoryIds.length === 0) {
      this.submitError = 'At least one category is required';
      return false;
    }
    return true;
  }
}