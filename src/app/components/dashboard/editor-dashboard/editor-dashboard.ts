import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Rest } from '../../../rest';
import { Article, ArticleStatus, ArticleCreateRequest } from '../../../shared/models/articles';
import Swal from 'sweetalert2';

interface EditorStats {
  assignedToMe: number;
  completedReviews: number;
  underReview: number;
  overdue: number;
  myDrafts: number;
  myPublished: number;
  totalArticles: number;
  thisMonthCompleted: number;
}

interface StatusCount {
  status: ArticleStatus;
  count: number;
  displayName: string;
  color: string;
}

interface EditorActivity {
  title: string;
  action: string;
  type: 'edit' | 'review' | 'approve' | 'publish' | 'revision';
  timestamp: string;
}

@Component({
  selector: 'app-editor-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './editor-dashboard.html',
  styleUrl: './editor-dashboard.css'
})
export class EditorDashboard implements OnInit {
  stats: EditorStats = {
    assignedToMe: 0,
    completedReviews: 0,
    underReview: 0,
    overdue: 0,
    myDrafts: 0,
    myPublished: 0,
    totalArticles: 0,
    thisMonthCompleted: 0
  };

  myAssignments: Article[] = [];
  myStatusCounts: StatusCount[] = [];
  recentActivity: EditorActivity[] = [];
  recentlyCompleted: Article[] = [];
  loading = false;

  // Filter options
  selectedFilter = 'all';

  // Modal properties
  showReviewModal = false;
  showInfoModal = false;
  selectedArticle: Article | null = null;
  selectedArticleId: number | null = null;
  editorNotes = '';
  infoRequest = '';
  tagsInput = '';

  constructor(
    private restService: Rest,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  async loadDashboardData() {
    this.loading = true;
    try {
      await Promise.all([
        this.loadMyStats(),
        this.loadMyAssignments(),
        this.loadMyStatusCounts(),
        this.loadRecentActivity(),
        this.loadRecentlyCompleted()
      ]);
    } catch (error) {
      console.error('Error loading editor dashboard data:', error);
      this.showErrorAlert('Failed to load dashboard data');
    } finally {
      this.loading = false;
    }
  }

  async loadMyStats() {
    try {
      // Load my articles counts
      const myCountsResponse = await this.restService.getMyArticleCounts().toPromise();
      
      // Load my status statistics
      const myStatusResponse = await this.restService.getMyStatusStatistics().toPromise();

      this.stats = {
        assignedToMe: this.calculateAssignedToMe(myStatusResponse),
        completedReviews: myCountsResponse?.published || 0,
        underReview: (myStatusResponse?.underReview || 0) + (myStatusResponse?.readyForReview || 0),
        overdue: this.calculateOverdue(myStatusResponse),
        myDrafts: myStatusResponse?.draft || 0,
        myPublished: myStatusResponse?.published || 0,
        totalArticles: myCountsResponse?.total || 0,
        thisMonthCompleted: myCountsResponse?.published || 0
      };
    } catch (error) {
      console.error('Error loading my stats:', error);
      // Set default values
      this.stats = {
        assignedToMe: 0,
        completedReviews: 0,
        underReview: 0,
        overdue: 0,
        myDrafts: 0,
        myPublished: 0,
        totalArticles: 0,
        thisMonthCompleted: 0
      };
    }
  }

  async loadMyAssignments() {
    try {
      // Load articles that are assigned to me or in my workflow
      const responses = await Promise.all([
        this.restService.getMyArticlesByStatus(ArticleStatus.READY_FOR_REVIEW, 0, 5).toPromise(),
        this.restService.getMyArticlesByStatus(ArticleStatus.UNDER_REVIEW, 0, 5).toPromise(),
        this.restService.getMyArticlesByStatus(ArticleStatus.NEEDS_REVISION, 0, 5).toPromise(),
        this.restService.getMyArticlesByStatus(ArticleStatus.IN_PROGRESS, 0, 5).toPromise()
      ]);
      
      const allAssignments: Article[] = [];
      responses.forEach(response => {
        if (response?.content) {
          allAssignments.push(...response.content);
        }
      });
      
      this.myAssignments = allAssignments.slice(0, 10);
    } catch (error) {
      console.error('Error loading my assignments:', error);
      // Try alternative approach - load all my articles and filter
      try {
        const response = await this.restService.getMyArticles(0, 20).toPromise();
        this.myAssignments = (response?.content || [])
          .filter(article => this.isInEditorialWorkflow(article.status))
          .slice(0, 10);
      } catch (alternativeError) {
        console.error('Alternative load failed:', alternativeError);
        this.myAssignments = [];
      }
    }
  }

  async loadMyStatusCounts() {
    try {
      const response = await this.restService.getMyStatusStatistics().toPromise();
      this.myStatusCounts = this.convertToMyStatusCounts(response);
    } catch (error) {
      console.error('Error loading my status counts:', error);
      this.myStatusCounts = [];
    }
  }

  async loadRecentActivity() {
    try {
      const response = await this.restService.getMyArticles(0, 10).toPromise();
      this.recentActivity = (response?.content || []).map(article => ({
        title: article.title,
        action: this.getActivityAction(article.status),
        type: this.getActivityType(article.status),
        timestamp: article.updatedAt || article.createdAt
      }));
    } catch (error) {
      console.error('Error loading recent activity:', error);
      this.recentActivity = [];
    }
  }

  async loadRecentlyCompleted() {
    try {
      const response = await this.restService.getMyPublishedArticles(0, 10).toPromise();
      this.recentlyCompleted = response?.content || [];
    } catch (error) {
      console.error('Error loading recently completed:', error);
      // Try alternative approach
      try {
        const response = await this.restService.getMyArticlesByStatus(ArticleStatus.PUBLISHED, 0, 10).toPromise();
        this.recentlyCompleted = response?.content || [];
      } catch (alternativeError) {
        console.error('Alternative load failed:', alternativeError);
        this.recentlyCompleted = [];
      }
    }
  }

  // Helper Methods
  calculateAssignedToMe(statusStats: any): number {
    if (!statusStats) return 0;
    return (statusStats.readyForReview || 0) + 
           (statusStats.underReview || 0) + 
           (statusStats.needsRevision || 0) + 
           (statusStats.inProgress || 0);
  }

  calculateOverdue(statusStats: any): number {
    if (!statusStats) return 0;
    // This would typically be calculated based on due dates
    // For now, return a portion of items that might be overdue
    return Math.floor((statusStats.underReview || 0) * 0.2);
  }

  isInEditorialWorkflow(status: ArticleStatus): boolean {
    const workflowStatuses = [
      ArticleStatus.READY_FOR_REVIEW,
      ArticleStatus.UNDER_REVIEW,
      ArticleStatus.PENDING_APPROVAL,
      ArticleStatus.NEEDS_REVISION,
      ArticleStatus.IN_PROGRESS,
      ArticleStatus.RETURNED_TO_WRITER
    ];
    return workflowStatuses.includes(status);
  }

  convertToMyStatusCounts(statistics: any): StatusCount[] {
    if (!statistics) return [];
    
    const editorRelevantStatuses = [
      'IN_PROGRESS', 'READY_FOR_REVIEW', 'UNDER_REVIEW', 
      'NEEDS_REVISION', 'DRAFT', 'PUBLISHED'
    ];
    
    return editorRelevantStatuses
      .map(status => ({
        status: status as ArticleStatus,
        count: statistics[status.toLowerCase().replace('_', '')] || statistics[status.toLowerCase()] || 0,
        displayName: this.getStatusDisplayName(status),
        color: this.getStatusColor(status)
      }))
      .filter(item => item.count > 0);
  }

  // Filter and Action Methods
  applyFilter() {
    // This method would filter myAssignments based on selectedFilter
    // For now, just reload assignments
    this.loadMyAssignments();
  }

  refreshAssignments() {
    this.loadMyAssignments();
    this.loadMyStats();
    this.loadMyStatusCounts();
  }

  refreshCompleted() {
    this.loadRecentlyCompleted();
  }

  // Article Action Methods
  startEditing(article: Article) {
    this.selectedArticle = { ...article }; // Create a copy for editing
    this.showReviewModal = true;
    this.editorNotes = '';
    this.tagsInput = '';
  }

  reviewArticle(article: Article) {
    this.startEditing(article);
  }

  async submitForApproval(articleId: number) {
    const result = await Swal.fire({
      title: 'Submit for Approval?',
      text: 'This will send the article to the approval workflow.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, submit it!'
    });

    if (result.isConfirmed) {
      try {
        await this.restService.updateArticleStatus(articleId, ArticleStatus.PENDING_APPROVAL).toPromise();
        this.refreshAssignments();
        this.showSuccessAlert('Article submitted for approval successfully!');
      } catch (error) {
        console.error('Error submitting for approval:', error);
        this.showErrorAlert('Failed to submit article for approval. Please try again.');
      }
    }
  }

  requestMoreInfo(articleId: number) {
    this.selectedArticleId = articleId;
    this.showInfoModal = true;
    this.infoRequest = '';
  }

  canSubmitForApproval(status: ArticleStatus): boolean {
    return [
      ArticleStatus.READY_FOR_REVIEW,
      ArticleStatus.UNDER_REVIEW,
      ArticleStatus.NEEDS_REVISION
    ].includes(status);
  }

  // Modal Methods
  closeReviewModal() {
    this.showReviewModal = false;
    this.selectedArticle = null;
    this.editorNotes = '';
    this.tagsInput = '';
  }

  closeInfoModal() {
    this.showInfoModal = false;
    this.selectedArticleId = null;
    this.infoRequest = '';
  }

  async sendInfoRequest() {
    if (!this.infoRequest.trim() || !this.selectedArticleId) {
      this.showWarningAlert('Please enter a message for the author');
      return;
    }

    try {
      await this.restService.returnArticleToWriter(this.selectedArticleId, this.infoRequest).toPromise();
      this.closeInfoModal();
      this.refreshAssignments();
      this.showSuccessAlert('Information request sent to author successfully!');
    } catch (error) {
      console.error('Error sending info request:', error);
      this.showErrorAlert('Failed to send information request. Please try again.');
    }
  }

  // Article Edit Methods
  addTag() {
    if (!this.tagsInput.trim() || !this.selectedArticle) return;
    
    const tag = this.tagsInput.trim();
    if (!this.selectedArticle.tags) {
      this.selectedArticle.tags = [];
    }
    
    if (!this.selectedArticle.tags.includes(tag)) {
      this.selectedArticle.tags.push(tag);
    }
    
    this.tagsInput = '';
  }

  removeTag(index: number) {
    if (this.selectedArticle?.tags) {
      this.selectedArticle.tags.splice(index, 1);
    }
  }

  async saveDraft() {
    if (!this.selectedArticle) return;

    try {
      const updateData = {
        title: this.selectedArticle.title,
        content: this.selectedArticle.content,
        summary: this.selectedArticle.summary,
        imageUrl: this.selectedArticle.imageUrl,
        tags: this.selectedArticle.tags || [],
        status: ArticleStatus.DRAFT
      };

      await this.restService.updateArticle(this.selectedArticle.id, updateData).toPromise();
      this.closeReviewModal();
      this.refreshAssignments();
      this.showSuccessAlert('Article saved as draft successfully!');
    } catch (error) {
      console.error('Error saving draft:', error);
      this.showErrorAlert('Failed to save draft. Please try again.');
    }
  }

  async requestRevision() {
    if (!this.selectedArticle) return;

    const { value: feedback } = await Swal.fire({
      title: 'Request Revision',
      input: 'textarea',
      inputLabel: 'Feedback for revision',
      inputPlaceholder: 'Please explain what needs to be revised...',
      inputValidator: (value) => {
        if (!value) {
          return 'Please provide feedback for the revision request';
        }
        return null;
      },
      showCancelButton: true,
      confirmButtonText: 'Request Revision',
      cancelButtonText: 'Cancel'
    });

    if (feedback) {
      try {
        await this.restService.updateArticleStatus(this.selectedArticle.id, ArticleStatus.NEEDS_REVISION).toPromise();
        await this.restService.returnArticleToWriter(this.selectedArticle.id, feedback).toPromise();
        this.closeReviewModal();
        this.refreshAssignments();
        this.showSuccessAlert('Revision request sent successfully!');
      } catch (error) {
        console.error('Error requesting revision:', error);
        this.showErrorAlert('Failed to request revision. Please try again.');
      }
    }
  }

  async submitForReview() {
    if (!this.selectedArticle) return;

    try {
      // First update the article with any changes
      const updateData = {
        title: this.selectedArticle.title,
        content: this.selectedArticle.content,
        summary: this.selectedArticle.summary,
        imageUrl: this.selectedArticle.imageUrl,
        tags: this.selectedArticle.tags || []
      };

      await this.restService.updateArticle(this.selectedArticle.id, updateData).toPromise();
      await this.restService.updateArticleStatus(this.selectedArticle.id, ArticleStatus.READY_FOR_REVIEW).toPromise();
      
      this.closeReviewModal();
      this.refreshAssignments();
      this.showSuccessAlert('Article submitted for review successfully!');
    } catch (error) {
      console.error('Error submitting for review:', error);
      this.showErrorAlert('Failed to submit for review. Please try again.');
    }
  }

  async approveAndForward() {
    if (!this.selectedArticle) return;

    try {
      // Update article with changes first
      const updateData = {
        title: this.selectedArticle.title,
        content: this.selectedArticle.content,
        summary: this.selectedArticle.summary,
        imageUrl: this.selectedArticle.imageUrl,
        tags: this.selectedArticle.tags || []
      };

      await this.restService.updateArticle(this.selectedArticle.id, updateData).toPromise();
      await this.restService.updateArticleStatus(this.selectedArticle.id, ArticleStatus.PENDING_APPROVAL).toPromise();
      
      this.closeReviewModal();
      this.refreshAssignments();
      this.showSuccessAlert('Article approved and forwarded successfully!');
    } catch (error) {
      console.error('Error approving and forwarding:', error);
      this.showErrorAlert('Failed to approve and forward. Please try again.');
    }
  }

  // Quick Action Methods
  createNewArticle() {
    this.router.navigate(['/articles/create']);
  }

  viewMyDrafts() {
    this.router.navigate(['/articles/my-drafts']);
  }

  viewMyPublished() {
    this.router.navigate(['/articles/my-published']);
  }

  viewAnalytics() {
    this.router.navigate(['/analytics']);
  }

  viewArticle(article: Article) {
    this.router.navigate(['/articles', article.id]);
  }

  // Priority and Status Helper Methods
  getPriorityClass(priority: string): string {
    const classMap: { [key: string]: string } = {
      'High': 'bg-red-100 text-red-700',
      'Medium': 'bg-yellow-100 text-yellow-700',
      'Low': 'bg-green-100 text-green-700',
      'Urgent': 'bg-red-200 text-red-800',
      'Normal': 'bg-gray-100 text-gray-700'
    };
    return classMap[priority] || 'bg-gray-100 text-gray-700';
  }

  getStatusDisplayName(status: string): string {
    const statusMap: { [key: string]: string } = {
      'READY_FOR_REVIEW': 'Ready for Review',
      'UNDER_REVIEW': 'Under Review',
      'PENDING_APPROVAL': 'Pending Approval',
      'APPROVED': 'Approved',
      'NEEDS_REVISION': 'Needs Revision',
      'PUBLISHED': 'Published',
      'DRAFT': 'Draft',
      'IN_PROGRESS': 'In Progress',
      'RETURNED_TO_WRITER': 'Returned to Writer'
    };
    return statusMap[status] || status;
  }

  getStatusClass(status: string): string {
    const classMap: { [key: string]: string } = {
      'READY_FOR_REVIEW': 'bg-yellow-100 text-yellow-700',
      'UNDER_REVIEW': 'bg-blue-100 text-blue-700',
      'PENDING_APPROVAL': 'bg-purple-100 text-purple-700',
      'APPROVED': 'bg-green-100 text-green-700',
      'NEEDS_REVISION': 'bg-orange-100 text-orange-700',
      'PUBLISHED': 'bg-emerald-100 text-emerald-700',
      'DRAFT': 'bg-gray-100 text-gray-700',
      'IN_PROGRESS': 'bg-indigo-100 text-indigo-700',
      'RETURNED_TO_WRITER': 'bg-red-100 text-red-700'
    };
    return classMap[status] || 'bg-gray-100 text-gray-700';
  }

  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'READY_FOR_REVIEW': '#fbbf24',
      'UNDER_REVIEW': '#3b82f6',
      'PENDING_APPROVAL': '#8b5cf6',
      'APPROVED': '#10b981',
      'NEEDS_REVISION': '#f59e0b',
      'PUBLISHED': '#059669',
      'DRAFT': '#6b7280',
      'IN_PROGRESS': '#6366f1',
      'RETURNED_TO_WRITER': '#ef4444'
    };
    return colorMap[status] || '#6b7280';
  }

  getActivityAction(status: string): string {
    const actionMap: { [key: string]: string } = {
      'PUBLISHED': 'published',
      'APPROVED': 'approved',
      'UNDER_REVIEW': 'started review',
      'NEEDS_REVISION': 'requested revision',
      'RETURNED_TO_WRITER': 'returned to writer',
      'IN_PROGRESS': 'started editing',
      'READY_FOR_REVIEW': 'submitted for review'
    };
    return actionMap[status] || 'updated';
  }

  getActivityType(status: string): 'edit' | 'review' | 'approve' | 'publish' | 'revision' {
    if (['PUBLISHED'].includes(status)) return 'publish';
    if (['APPROVED', 'PENDING_APPROVAL'].includes(status)) return 'approve';
    if (['NEEDS_REVISION', 'RETURNED_TO_WRITER'].includes(status)) return 'revision';
    if (['UNDER_REVIEW', 'READY_FOR_REVIEW'].includes(status)) return 'review';
    return 'edit';
  }

  getActivityIcon(type: string): { class: string, icon: string } {
    const iconMap: { [key: string]: { class: string, icon: string } } = {
      'edit': {
        class: 'bg-blue-100 text-blue-600',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>'
      },
      'review': {
        class: 'bg-purple-100 text-purple-600',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>'
      },
      'approve': {
        class: 'bg-green-100 text-green-600',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>'
      },
      'publish': {
        class: 'bg-emerald-100 text-emerald-600',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>'
      },
      'revision': {
        class: 'bg-orange-100 text-orange-600',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>'
      }
    };
    return iconMap[type] || iconMap['edit'];
  }

  getActivityTypeClass(type: string): string {
    const classMap: { [key: string]: string } = {
      'edit': 'text-blue-600',
      'review': 'text-purple-600',
      'approve': 'text-green-600',
      'publish': 'text-emerald-600',
      'revision': 'text-orange-600'
    };
    return classMap[type] || 'text-blue-600';
  }

  // Alert Methods
  showSuccessAlert(message: string) {
    Swal.fire({
      icon: 'success',
      title: 'Success!',
      text: message,
      timer: 3000,
      showConfirmButton: false
    });
  }

  showErrorAlert(message: string) {
    Swal.fire({
      icon: 'error',
      title: 'Error!',
      text: message,
      confirmButtonColor: '#ef4444'
    });
  }

  showWarningAlert(message: string) {
    Swal.fire({
      icon: 'warning',
      title: 'Warning!',
      text: message,
      confirmButtonColor: '#f59e0b'
    });
  }

  // Date formatting
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Additional utility methods
  isOverdue(article: Article): boolean {
    // This would check if the article is overdue based on assigned deadlines
    // For now, return false as we don't have due dates in the model
    return false;
  }

  getUrgencyLevel(article: Article): 'low' | 'medium' | 'high' | 'urgent' {
    // This would determine urgency based on various factors
    // For now, return based on status
    switch (article.status) {
      case ArticleStatus.OVERDUE:
        return 'urgent';
      case ArticleStatus.RUSH:
        return 'high';
      case ArticleStatus.PENDING_APPROVAL:
        return 'medium';
      default:
        return 'low';
    }
  }

  // Performance tracking methods
  getCompletionRate(): number {
    if (this.stats.assignedToMe === 0) return 0;
    return Math.round((this.stats.completedReviews / this.stats.assignedToMe) * 100);
  }

  getProductivityTrend(): 'up' | 'down' | 'stable' {
    // This would compare current month vs previous month
    // For now, return stable
    return 'stable';
  }

  // Filter methods for assignments
  getFilteredAssignments(): Article[] {
    switch (this.selectedFilter) {
      case 'urgent':
        return this.myAssignments.filter(a => this.getUrgencyLevel(a) === 'urgent' || this.getUrgencyLevel(a) === 'high');
      case 'today':
        // Filter assignments that might be due today (placeholder logic)
        return this.myAssignments.filter(a => a.status === ArticleStatus.READY_FOR_REVIEW);
      case 'overdue':
        return this.myAssignments.filter(a => this.isOverdue(a));
      default:
        return this.myAssignments;
    }
  }

  // Batch operations
  async submitMultipleForReview(articleIds: number[]) {
    const confirmResult = await Swal.fire({
      title: 'Submit Multiple Articles?',
      text: `Submit ${articleIds.length} articles for review?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, submit all!'
    });

    if (confirmResult.isConfirmed) {
      const loadingAlert = Swal.fire({
        title: 'Submitting Articles...',
        text: 'This may take a moment',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        const submitPromises = articleIds.map(id => 
          this.restService.updateArticleStatus(id, ArticleStatus.READY_FOR_REVIEW).toPromise()
        );
        
        await Promise.all(submitPromises);
        // loadingAlert.close();
        this.refreshAssignments();
        this.showSuccessAlert(`Successfully submitted ${articleIds.length} articles for review!`);
      } catch (error) {
          // loadingAlert.close();
        console.error('Error submitting multiple articles:', error);
        this.showErrorAlert('Failed to submit some articles. Please try again.');
      }
    }
  }

  // Navigation helpers
  navigateToArticle(articleId: number) {
    this.router.navigate(['/articles', articleId]);
  }

  navigateToEditor(articleId: number) {
    this.router.navigate(['/articles', articleId, 'edit']);
  }

  navigateToPreview(articleId: number) {
    this.router.navigate(['/articles', articleId, 'preview']);
  }

  // Keyboard shortcuts (can be implemented with HostListener)
  handleKeyboardShortcuts(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'n':
          event.preventDefault();
          this.createNewArticle();
          break;
        case 'r':
          event.preventDefault();
          this.refreshAssignments();
          break;
        case 'd':
          event.preventDefault();
          this.viewMyDrafts();
          break;
      }
    }
  }

  // Export/Import methods (if needed)
  exportMyArticles() {
    // This would export the user's articles to CSV or other format
    console.log('Export functionality to be implemented');
  }

  // Search and filtering
  searchAssignments(query: string) {
    if (!query.trim()) {
      return this.myAssignments;
    }
    
    const lowercaseQuery = query.toLowerCase();
    return this.myAssignments.filter(assignment => 
      assignment.title.toLowerCase().includes(lowercaseQuery) ||
      assignment.content?.toLowerCase().includes(lowercaseQuery) ||
      assignment.author.fullName?.toLowerCase().includes(lowercaseQuery)
    );
  }

  // Theme and preferences
  toggleTheme() {
    // This would toggle between light and dark themes
    console.log('Theme toggle to be implemented');
  }

  // Notification methods
  markNotificationAsRead(notificationId: number) {
    // This would mark a notification as read
    console.log('Notification system to be implemented');
  }

  // Help and tutorial methods
  showHelp() {
    Swal.fire({
      title: 'Editor Dashboard Help',
      html: `
        <div class="text-left">
          <h4 class="font-semibold mb-2">Quick Actions:</h4>
          <ul class="list-disc list-inside mb-4">
            <li>Click "Edit" to modify an article</li>
            <li>Click "Review" to review and approve</li>
            <li>Click "Submit" to move to next stage</li>
            <li>Click "More Info" to request details from author</li>
          </ul>
          <h4 class="font-semibold mb-2">Keyboard Shortcuts:</h4>
          <ul class="list-disc list-inside">
            <li>Ctrl/Cmd + N: New article</li>
            <li>Ctrl/Cmd + R: Refresh dashboard</li>
            <li>Ctrl/Cmd + D: View drafts</li>
          </ul>
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Got it!'
    });
  }
}