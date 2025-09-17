import { Injectable } from '@angular/core';
import { environment } from '../environments/environment';
import { Observable } from 'rxjs';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { ApiResponse, Article, ArticleCreateRequest, ArticleStatus, ArticleStatusStatistics, DashboardStats } from './shared/models/articles';
import { AuthService } from './shared/services/auth.service';

const env = environment;
const endpoint = env.scm_endpoint;
const auth_endpoint = env.scm_auth_endpoint;

// API endpoints
const articles_endpoint = endpoint + "articles/";
const articles_public_endpoint = endpoint + "articles/public";
const articles_create_endpoint = endpoint + "articles";
const articles_draft_endpoint = endpoint + "articles";

// File upload endpoints (if needed)
const file_upload_endpoint = endpoint + "files/upload";
const image_upload_endpoint = endpoint + "images/upload";

// Author/User management endpoints
const signup_endpoint = endpoint + "auth/signup";
const users_endpoint = endpoint + "users/";

// Author interfaces
export interface AuthorCreateRequest {
  username: string;
  email: string;
  password: string;
  fullName: string;
  bio: string;
  role: 'ADMIN' | 'AUTHOR' | 'JOURNALIST' | 'EDITOR' | 'COLUMNIST' | 'CONTRIBUTOR' | 'REPORTER' | 'USER';
}

export interface Author {
  id: number;
  username: string;
  email: string;
  fullName: string;
  bio: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
  enabled?: boolean;
  avatarUrl?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    website?: string;
  };
  articleCount?: number;
}

export interface UsersApiResponse {
  content: Author[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class Rest {

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  // Helper method to get headers with or without auth
  private getHeaders(requireAuth: boolean = false): HttpHeaders {
    if (requireAuth) {
      return this.authService.getAuthHeaders();
    }

    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });
  }

  // ==================== PUBLISHER DASHBOARD METHODS ====================

  /**
   * Get dashboard summary statistics
   */
  getDashboardSummary(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${endpoint}articles/statistics/dashboard`, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Get article counts by status
   */
  getArticleCounts(): Observable<any> {
    return this.http.get(`${endpoint}articles/statistics/counts`, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Get articles in editorial workflow
   */
  getArticlesInEditorialWorkflow(
    page: number = 0,
    size: number = 10
  ): Observable<ApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ApiResponse>(`${endpoint}articles/editorial-workflow`, {
      params,
      headers: this.getHeaders(true)
    });
  }

  /**
   * Get articles needing attention
   */
  getArticlesNeedingAttention(
    page: number = 0,
    size: number = 10
  ): Observable<ApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ApiResponse>(`${endpoint}articles/needs-attention`, {
      params,
      headers: this.getHeaders(true)
    });
  }

  /**
   * Get articles by status
   */
  getArticlesByStatus(
    status: ArticleStatus,
    page: number = 0,
    size: number = 10,
    sortBy: string = 'createdAt',
    sortDir: string = 'desc'
  ): Observable<ApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    return this.http.get<ApiResponse>(`${endpoint}articles/status/${status}`, {
      params,
      headers: this.getHeaders(true)
    });
  }

  /**
   * Get article status statistics
   */
  getArticleStatusStatistics(): Observable<ArticleStatusStatistics> {
    return this.http.get<ArticleStatusStatistics>(`${endpoint}articles/statistics/status`, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Move article to next workflow stage
   */
  moveToNextWorkflowStage(articleId: number): Observable<Article> {
    return this.http.post<Article>(`${endpoint}articles/${articleId}/workflow/next`, {}, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Update article status
   */
  updateArticleStatus(articleId: number, status: string): Observable<Article> {
    const body = { status: status };
    return this.http.put<Article>(`${endpoint}articles/${articleId}/status`, body, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Return article to writer with feedback
   */
  returnArticleToWriter(articleId: number, feedback: string): Observable<Article> {
    const body = { feedback: feedback };
    return this.http.post<Article>(`${endpoint}articles/${articleId}/return`, body, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Reject article with reason
   */
  rejectArticle(articleId: number, reason: string): Observable<Article> {
    const body = { reason: reason };
    return this.http.post<Article>(`${endpoint}articles/${articleId}/reject`, body, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Schedule article for publication
   */
  scheduleArticle(articleId: number, scheduledTime: string): Observable<Article> {
    const body = { scheduledTime: scheduledTime };
    return this.http.post<Article>(`${endpoint}articles/${articleId}/schedule`, body, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Set article as featured
   */
  setFeatured(articleId: number, featured: boolean): Observable<Article> {
    const body = { featured: featured };
    return this.http.post<Article>(`${endpoint}articles/${articleId}/featured`, body, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Set article as trending
   */
  setTrending(articleId: number, trending: boolean): Observable<Article> {
    const body = { trending: trending };
    return this.http.post<Article>(`${endpoint}articles/${articleId}/trending`, body, {
      headers: this.getHeaders(true)
    });
  }

  // ==================== EXISTING ARTICLE METHODS ====================

  getArticlesCategories(): Observable<any> {
    return this.http.get(endpoint + "articles/category", {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Get public articles with pagination and sorting (no auth required)
   */
  getPublicArticles(
    page: number = 0,
    size: number = 10,
    sortBy: string = 'publishedAt',
    sortDir: string = 'desc'
  ): Observable<ApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    return this.http.get<ApiResponse>(endpoint + "articles/public", {
      params,
      headers: this.getHeaders(true)
    });
  }

  /**
   * Get all articles (admin/authenticated users)
   */
  getAllArticles(
    page: number = 0,
    size: number = 10,
    sortBy: string = 'createdAt',
    sortDir: string = 'desc'
  ): Observable<ApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    return this.http.get<ApiResponse>(endpoint + "articles/admin/all", {
      params,
      headers: this.getHeaders(true)
    });
  }

  /**
   * Get single article by ID
   */
  getArticleById(id: number, requireAuth: boolean = true): Observable<Article> {
    const url = requireAuth ? `${endpoint}articles/admin/${id}` : `${articles_endpoint}${id}`;
    return this.http.get<Article>(url, {
      headers: this.getHeaders(requireAuth)
    });
  }

  /**
   * Get single article by slug (public access)
   */
  getArticleBySlug(slug: string): Observable<Article> {
    return this.http.get<Article>(`${endpoint}articles/public/${slug}`, {
      headers: this.getHeaders(false)
    });
  }

  /**
   * Create new article (requires auth)
   */
  createArticle(article: ArticleCreateRequest): Observable<Article> {
    return this.http.post<Article>(articles_create_endpoint, article, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Save article as draft (requires auth)
   */
  saveDraft(article: ArticleCreateRequest): Observable<Article> {
    const draftArticle = { ...article, status: ArticleStatus.DRAFT };
    return this.http.post<Article>(articles_draft_endpoint, draftArticle, {
      headers: this.getHeaders(true)
    });
  }

  createArticleWithImage(formData: FormData): Observable<Article> {
    const token = this.authService.getTokenForHeader();
    let headers = new HttpHeaders({
      'Accept': 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', token);
    }

    return this.http.post<Article>(articles_create_endpoint, formData, {
      headers
    });
  }

  updateArticleWithImage(id: number, formData: FormData): Observable<Article> {
    const token = this.authService.getTokenForHeader();
    let headers = new HttpHeaders({
      'Accept': 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', token);
    }

    return this.http.put<Article>(`${articles_endpoint}${id}`, formData, {
      headers
    });
  }

  /**
   * Update existing article without image (requires auth)
   */
  updateArticleData(id: number, article: Partial<ArticleCreateRequest>): Observable<Article> {
    return this.http.put<Article>(`${articles_endpoint}${id}`, article, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Get single article with full details for editing (requires auth)
   */
  getArticleForEdit(id: number): Observable<Article> {
    return this.http.get<Article>(`${articles_endpoint}${id}/edit`, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Check if user can edit article (requires auth)
   */
  canEditArticle(id: number): Observable<{ canEdit: boolean, reason?: string }> {
    return this.http.get<{ canEdit: boolean, reason?: string }>(`${articles_endpoint}${id}/can-edit`, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Update existing article (requires auth)
   */
  updateArticle(id: number, article: Partial<ArticleCreateRequest>): Observable<Article> {
    return this.http.put<Article>(`${articles_endpoint}${id}`, article, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Delete article (requires auth)
   */
  deleteArticle(id: number): Observable<void> {
    return this.http.delete<void>(`${articles_endpoint}${id}`, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Publish article (requires auth)
   */
  publishArticle(id: number): Observable<Article> {
    return this.http.post<Article>(`${articles_endpoint}${id}/publish`, {}, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Unpublish article (requires auth)
   */
  unpublishArticle(id: number): Observable<Article> {
    return this.http.post<Article>(`${articles_endpoint}${id}/unpublish`, {}, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Toggle featured status (requires auth)
   */
  toggleFeatured(id: number): Observable<Article> {
    return this.http.patch<Article>(`${articles_endpoint}${id}/toggle-featured`, {}, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Increment view count for article
   */
  incrementViewCount(slug: string): Observable<Article> {
    return this.http.post<Article>(`${endpoint}articles/${slug}/view`, {}, {
      headers: this.getHeaders(false)
    });
  }

  /**
   * Search articles
   */
  searchArticles(
    query: string,
    page: number = 0,
    size: number = 10,
    requireAuth: boolean = false
  ): Observable<ApiResponse> {
    const params = new HttpParams()
      .set('q', query)
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ApiResponse>(`${endpoint}articles/search`, {
      params,
      headers: this.getHeaders(requireAuth)
    });
  }

  /**
   * Get articles by tag
   */
  getArticlesByTag(
    tag: string,
    page: number = 0,
    size: number = 10,
    requireAuth: boolean = false
  ): Observable<ApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ApiResponse>(`${endpoint}articles/tag/${tag}`, {
      params,
      headers: this.getHeaders(requireAuth)
    });
  }

  /**
   * Get articles by category
   */
  getArticlesByCategory(
    category: string,
    page: number = 0,
    size: number = 10
  ): Observable<ApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ApiResponse>(`${endpoint}articles/category/${category}`, {
      params,
      headers: this.getHeaders(false)
    });
  }

  /**
   * Get articles by category ID
   */
  getArticlesByCategoryId(
    categoryId: number,
    page: number = 0,
    size: number = 10
  ): Observable<ApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ApiResponse>(`${endpoint}articles/category/id/${categoryId}`, {
      params,
      headers: this.getHeaders(false)
    });
  }

  /**
   * Get articles by multiple categories
   */
  getArticlesByCategories(
    categoryIds: number[],
    page: number = 0,
    size: number = 10
  ): Observable<ApiResponse> {
    const params = new HttpParams()
      .set('categoryIds', categoryIds.join(','))
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ApiResponse>(`${endpoint}articles/categories/multiple`, {
      params,
      headers: this.getHeaders(false)
    });
  }

  /**
   * Get trending articles (public)
   */
  getTrendingArticles(
    page: number = 0,
    size: number = 10
  ): Observable<ApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ApiResponse>(`${endpoint}articles/trending`, {
      params,
      headers: this.getHeaders(false)
    });
  }

  /**
   * Get featured articles (public)
   */
  getFeaturedArticles(
    page: number = 0,
    size: number = 10
  ): Observable<ApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ApiResponse>(`${endpoint}articles/featured`, {
      params,
      headers: this.getHeaders(false)
    });
  }

  /**
   * Get latest articles (public)
   */
  getLatestArticles(
    page: number = 0,
    size: number = 10
  ): Observable<ApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ApiResponse>(`${endpoint}articles/latest`, {
      params,
      headers: this.getHeaders(false)
    });
  }

  /**
   * Get most viewed articles (public)
   */
  getMostViewedArticles(
    page: number = 0,
    size: number = 10
  ): Observable<ApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ApiResponse>(`${endpoint}articles/most-viewed`, {
      params,
      headers: this.getHeaders(false)
    });
  }

  /**
   * Get all categories
   */
  getAllCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${endpoint}articles/categories`, {
      headers: this.getHeaders(false)
    });
  }

  /**
   * Get all tags
   */
  getAllTags(): Observable<string[]> {
    return this.http.get<string[]>(`${endpoint}articles/tags`, {
      headers: this.getHeaders(false)
    });
  }

  /**
   * Get articles by tags
   */
  getArticlesByTags(
    tags: string[],
    matchAll: boolean = false
  ): Observable<Article[]> {
    const params = new HttpParams()
      .set('tags', tags.join(','))
      .set('matchAll', matchAll.toString());

    return this.http.get<Article[]>(`${endpoint}articles/tags/search`, {
      params,
      headers: this.getHeaders(false)
    });
  }

  // ==================== AUTHOR-SPECIFIC METHODS ====================

  /**
   * Get my articles (author's own articles)
   */
  getMyArticles(
    page: number = 0,
    size: number = 10
  ): Observable<ApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ApiResponse>(`${endpoint}articles/my-articles`, {
      params,
      headers: this.getHeaders(true)
    });
  }

  /**
   * Get my articles by status
   */
  getMyArticlesByStatus(
    status: ArticleStatus,
    page: number = 0,
    size: number = 10
  ): Observable<ApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ApiResponse>(`${endpoint}articles/my-articles/status/${status}`, {
      params,
      headers: this.getHeaders(true)
    });
  }

  /**
   * Get my published articles
   */
  getMyPublishedArticles(
    page: number = 0,
    size: number = 10
  ): Observable<ApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ApiResponse>(`${endpoint}articles/my-articles/published`, {
      params,
      headers: this.getHeaders(true)
    });
  }

  /**
   * Get my article counts
   */
  getMyArticleCounts(): Observable<any> {
    return this.http.get(`${endpoint}articles/my-articles/counts`, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Get my status statistics
   */
  getMyStatusStatistics(): Observable<ArticleStatusStatistics> {
    return this.http.get<ArticleStatusStatistics>(`${endpoint}articles/statistics/my-status`, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Get draft articles
   */
  getDraftArticles(
    page: number = 0,
    size: number = 10
  ): Observable<ApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<ApiResponse>(`${endpoint}articles/drafts`, {
      params,
      headers: this.getHeaders(true)
    });
  }

  // ==================== USER MANAGEMENT METHODS ====================

  /**
   * Create new author (requires admin auth)
   */
  createAuthor(author: AuthorCreateRequest): Observable<Author> {
    return this.http.post<Author>(signup_endpoint, author, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Get all users/authors with pagination (requires admin auth)
   */
  getAllUsers(
    page: number = 0,
    size: number = 10,
    sortBy: string = 'createdAt',
    sortDir: string = 'desc'
  ): Observable<UsersApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sortBy', sortBy)
      .set('sortDir', sortDir);

    return this.http.get<UsersApiResponse>(users_endpoint, {
      params,
      headers: this.getHeaders(true)
    });
  }

  /**
   * Alternative method to get users if direct endpoint fails
   */
  getAllUsersAlternative(
    page: number = 0,
    size: number = 10
  ): Observable<UsersApiResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<UsersApiResponse>(endpoint + "users", {
      params,
      headers: this.getHeaders(true)
    });
  }

  /**
   * Get user/author by ID (requires auth)
   */
  getUserById(id: number): Observable<Author> {
    return this.http.get<Author>(`${users_endpoint}${id}`, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Update user/author (requires auth)
   */
  updateUser(id: number, user: Partial<Author>): Observable<Author> {
    return this.http.put<Author>(`${users_endpoint}${id}`, user, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Delete user/author (requires admin auth)
   */
  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${users_endpoint}${id}`, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Search users/authors (requires auth)
   */
  searchUsers(
    query: string,
    page: number = 0,
    size: number = 10
  ): Observable<UsersApiResponse> {
    const params = new HttpParams()
      .set('search', query)
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<UsersApiResponse>(`${users_endpoint}search`, {
      params,
      headers: this.getHeaders(true)
    });
  }

  /**
   * Get users by role (requires auth)
   */
  getUsersByRole(
    role: string,
    page: number = 0,
    size: number = 10
  ): Observable<UsersApiResponse> {
    const params = new HttpParams()
      .set('role', role)
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<UsersApiResponse>(`${users_endpoint}by-role`, {
      params,
      headers: this.getHeaders(true)
    });
  }

  /**
   * Get users by role without pagination
   */
  getAllUsersByRole(role: string): Observable<Author[]> {
    return this.http.get<Author[]>(`${users_endpoint}role/${role}`, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Get user count
   */
  getUserCount(): Observable<{ totalUsers: number }> {
    return this.http.get<{ totalUsers: number }>(`${users_endpoint}count`, {
      headers: this.getHeaders(true)
    });
  }

  /**
   * Check username availability
   */
  checkUsername(username: string): Observable<{ exists: boolean, available: boolean }> {
    return this.http.get<{ exists: boolean, available: boolean }>(`${users_endpoint}check-username/${username}`, {
      headers: this.getHeaders(false)
    });
  }

  /**
   * Check email availability
   */
  checkEmail(email: string): Observable<{ exists: boolean, available: boolean }> {
    return this.http.get<{ exists: boolean, available: boolean }>(`${users_endpoint}check-email/${email}`, {
      headers: this.getHeaders(false)
    });
  }

  // ==================== FILE UPLOAD METHODS ====================

  /**
   * Upload image (requires auth)
   */
  uploadImage(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('image', file);

    const token = this.authService.getTokenForHeader();
    let headers = new HttpHeaders({
      'Accept': 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', token);
    }

    return this.http.post<{ url: string }>(image_upload_endpoint, formData, {
      headers
    });
  }

  /**
   * Upload file (requires auth)
   */
  uploadFile(file: File): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const token = this.authService.getTokenForHeader();
    let headers = new HttpHeaders({
      'Accept': 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', token);
    }

    return this.http.post<{ url: string }>(file_upload_endpoint, formData, {
      headers
    });
  }
}