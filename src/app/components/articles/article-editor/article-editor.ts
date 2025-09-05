import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { Rest } from '../../../rest';
import { Article, ArticleCreateRequest, Author} from '../../../shared/models/articles';

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
export class ArticleEditor implements OnInit, OnChanges {
  @Output() backToList = new EventEmitter<void>();
  @Input() editingArticle: Article | null = null;

  isPreviewMode = false;
  isSubmitting = false;
  submitError: string | null = null;
  categoryOptions: Category[] = [];
  newTag = '';
  selectedImageFile: File | null = null;
  isEditMode = false;
  author: Author | null = null;

  article = {
    id: null as number | null,
    title: '',
    urlSlug: '',
    excerpt: '',
    content: '',
    status: 'DRAFT',
    featuredArticle: false,
    trending: false,
    selectedCategoryIds: [] as number[],
    author: this.author,
    featuredImageUrl: '',
    tags: [] as string[]
  };

  statusOptions = [
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Ready for Review', value: 'READY_FOR_REVIEW' },
    { label: 'Archived', value: 'ARCHIVED' }
  ];

  constructor(
    private rest: Rest
  ) { }

  ngOnInit() {
    this.loadCategories();
    this.initializeArticle();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['editingArticle'] && changes['editingArticle'].currentValue) {
      this.initializeArticle();
    }
  }

  private initializeArticle() {
    if (this.editingArticle) {
      this.isEditMode = true;
      this.article = {
        id: this.editingArticle.id,
        title: this.editingArticle.title || '',
        urlSlug: this.editingArticle.urlSlug || '',
        excerpt: this.editingArticle.excerpt || '',
        content: this.editingArticle.content || '',
        status: this.editingArticle.status || 'DRAFT',
        featuredArticle: this.editingArticle.featured || false,
        trending: this.editingArticle.trending || false,
        selectedCategoryIds: this.editingArticle.categories || [],
        author: this.editingArticle.author,
        featuredImageUrl: this.editingArticle.imageUrl || '',
        tags: this.editingArticle.tags || []
      };
    } else {
      this.isEditMode = false;
      this.resetArticle();
    }
  }

  private resetArticle() {
    this.article = {
      id: null,
      title: '',
      urlSlug: '',
      excerpt: '',
      content: '',
      status: 'DRAFT',
      featuredArticle: false,
      trending: false,
      selectedCategoryIds: [],
      author: this.author,
      featuredImageUrl: '',
      tags: []
    };
  }

  get titleCharCount(): number {
    return this.article.title.length;
  }

  get excerptCharCount(): number {
    return this.article.excerpt.length;
  }

  get headerTitle(): string {
    return this.isEditMode ? 'Edit Article' : 'New Article';
  }

  get headerDescription(): string {
    return this.isEditMode ? 'Update your article content' : 'Create engaging content for your audience';
  }

  onGoBack(): void {
    this.backToList.emit();
  }

  togglePreview(): void {
    this.isPreviewMode = !this.isPreviewMode;
  }

  onTitleChange(): void {
    // Only auto-generate slug for new articles
    if (!this.isEditMode) {
      this.article.urlSlug = this.generateSlug(this.article.title);
    }
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
      this.selectedImageFile = input.files[0];

      // Show preview
      const reader = new FileReader();
      reader.onload = () => {
        this.article.featuredImageUrl = reader.result as string;
      };
      reader.readAsDataURL(this.selectedImageFile);
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

  private loadCategories() {
    this.rest.getArticlesCategories().subscribe(categories => {
      this.categoryOptions = categories;
      console.log('Categories loaded:', this.categoryOptions);
    }, error => {
      console.error('Error loading categories:', error);
      alert('Failed to load categories. Please try again later.');
    });
  }

  onCategoryChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedOptions = Array.from(target.selectedOptions);
    this.article.selectedCategoryIds = selectedOptions.map(option => parseInt(option.value)).filter(id => !isNaN(id));
  }

  isCategorySelected(categoryId: number): boolean {
    return this.article.selectedCategoryIds.includes(categoryId);
  }

  toggleCategorySelection(categoryId: number): void {
    const index = this.article.selectedCategoryIds.indexOf(categoryId);
    if (index > -1) {
      this.article.selectedCategoryIds.splice(index, 1);
    } else {
      this.article.selectedCategoryIds.push(categoryId);
    }
  }

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

    const formData = new FormData();

    const articleData = {
      title: this.article.title,
      excerpt: this.article.excerpt,
      content: this.article.content,
      categoryIds: this.article.selectedCategoryIds,
      tags: this.article.tags,
      status: this.article.status,
      trending: this.article.trending,
      published: publish,
      featured: this.article.featuredArticle
    };

    formData.append('article', JSON.stringify(articleData));

    if (this.selectedImageFile) {
      formData.append('image', this.selectedImageFile);
    }

    // Choose between create and update based on edit mode
    const apiCall = this.isEditMode && this.article.id 
      ? this.rest.updateArticleWithImage(this.article.id, formData)
      : this.rest.createArticleWithImage(formData);

    apiCall.pipe(
      catchError(error => {
        console.error('Error submitting article:', error);
        const action = this.isEditMode ? 'update' : (publish ? 'publish' : 'save');
        this.submitError = `Failed to ${action} article. Please try again.`;
        this.isSubmitting = false;
        return of(null);
      })
    ).subscribe(response => {
      this.isSubmitting = false;
      if (response) {
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