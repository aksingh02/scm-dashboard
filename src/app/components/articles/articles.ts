import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { ArticleEditor } from './article-editor/article-editor';
import { Rest } from '../../rest';
import { Article, ApiResponse } from '../../shared/models/articles';

@Component({
  selector: 'app-articles',
  standalone: true,
  imports: [CommonModule, FormsModule, ArticleEditor],
  templateUrl: './articles.html',
  styleUrl: './articles.css'
})
export class Articles implements OnInit {
  searchTerm: string = '';
  selectedStatus: string = 'All Status';
  selectedCategory: string = 'All Categories';

  // API-related properties
  articles: Article[] = [];
  filteredArticlesCache: Article[] = [];
  isLoading: boolean = false;
  error: string | null = null;

  // Pagination
  currentPage: number = 0;
  pageSize: number = 10;
  totalElements: number = 0;
  totalPages: number = 0;

  // View state
  showEditor: boolean = false;
  showArticleDetail: boolean = false;
  selectedArticle: Article | null = null;
  editingArticle: Article | null = null;

  // Make Math available in template
  Math = Math;

  constructor(
    private rest: Rest
  ) { }

  statusOptions = ['All Status', 'Published', 'Draft'];
  categoryOptions = ['All Categories', 'Technology', 'Finance', 'Sports', 'Health'];

  ngOnInit(): void {
    this.loadArticles();
  }

  loadArticles(): void {
    this.isLoading = true;
    this.error = null;
    this.rest.getPublicArticles(this.currentPage, this.pageSize, 'publishedAt', 'desc')
      .pipe(
        catchError(error => {
          console.error('Error loading articles:', error);
          this.error = 'Failed to load articles. Please try again.';
          this.isLoading = false;
          const fallbackResponse: ApiResponse = {
            content: [],
            totalElements: 0,
            totalPages: 0,
            number: 0,
            size: this.pageSize,
            sort: { empty: true, sorted: false, unsorted: true },
            first: true,
            last: true,
            numberOfElements: 0,
            pageable: {
              offset: 0,
              sort: { empty: true, sorted: false, unsorted: true },
              pageSize: this.pageSize,
              pageNumber: 0,
              unpaged: false,
              paged: true
            },
            empty: true
          };
          return of(fallbackResponse);
        })
      )
      .subscribe((response: ApiResponse) => {
        console.log('Articles loaded:', response);
        this.articles = response.content || [];
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.isLoading = false;
        this.updateFilteredArticles();
      });
  }

  updateFilteredArticles(): void {
    // Temporarily simplified - just copy all articles
    this.filteredArticlesCache = [...this.articles];
    console.log('Filtered articles updated:', this.filteredArticlesCache.length);
  }

  get filteredArticles(): Article[] {
    return this.filteredArticlesCache;
  }

  // Helper method to determine if article matches category based on tags
  private articleMatchesCategory(article: Article, category: string): boolean {
    if (!article.tags || article.tags.length === 0) return false;

    const categoryTagMap: { [key: string]: string[] } = {
      'Technology': ['tech', 'technology', 'ai', 'software', 'programming'],
      'Finance': ['finance', 'economy', 'money', 'investment', 'market'],
      'Sports': ['sports', 'football', 'basketball', 'tennis', 'athletics'],
      'Health': ['health', 'medical', 'wellness', 'fitness', 'nutrition']
    };

    const relevantTags = categoryTagMap[category] || [];
    return article.tags.some(tag =>
      relevantTags.some(relevantTag =>
        tag.toLowerCase().includes(relevantTag.toLowerCase())
      )
    );
  }

  // Format date for display
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  // Get article status for display
  getArticleStatus(article: Article): 'published' | 'draft' {
    return article.published ? 'published' : 'draft';
  }

  // NEW: View article details
  onViewArticle(article: Article): void {
    this.selectedArticle = article;
    this.showArticleDetail = true;
    this.showEditor = false;
    
    // Increment view count
    if (article.urlSlug) {
      this.rest.incrementViewCount(article.urlSlug).subscribe();
    }
  }

  // NEW: Edit article
  onEditArticle(article: Article): void {
    this.editingArticle = article;
    this.showEditor = true;
    this.showArticleDetail = false;
  }

  onNewArticle(): void {
    this.editingArticle = null;
    this.showEditor = true;
    this.showArticleDetail = false;
  }

  onBackToList(): void {
    this.showEditor = false;
    this.showArticleDetail = false;
    this.selectedArticle = null;
    this.editingArticle = null;
    this.refreshArticles(); // Refresh articles when coming back from editor
  }

  onBackFromDetail(): void {
    this.showArticleDetail = false;
    this.selectedArticle = null;
  }

  onSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.updateFilteredArticles();
  }

  onStatusChange(status: string): void {
    this.selectedStatus = status;
    this.updateFilteredArticles();
  }

  onCategoryChange(category: string): void {
    this.selectedCategory = category;
    this.updateFilteredArticles();
  }

  // Pagination methods
  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadArticles();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 0; // Reset to first page
    this.loadArticles();
  }

  // Refresh articles
  refreshArticles(): void {
    this.currentPage = 0;
    this.loadArticles();
  }
}