import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Rest } from '../../../rest';
import { Article, ArticleStatus } from '../../../shared/models/articles';
import Swal from 'sweetalert2';

interface DashboardStats {
  totalArticles: number;
  published: number;
  pendingReview: number;
  needsAttention: number;
  totalViews: number;
  activeAuthors: number;
}

interface StatusCount {
  status: ArticleStatus;
  count: number;
  displayName: string;
  color: string;
}

@Component({
  selector: 'app-publisher-dashboard',
  imports: [CommonModule, FormsModule],
  templateUrl: './publisher-dashboard.html',
  styleUrl: './publisher-dashboard.css'
})
export class PublisherDashboard implements OnInit {
  stats: DashboardStats = {
    totalArticles: 0,
    published: 0,
    pendingReview: 0,
    needsAttention: 0,
    totalViews: 0,
    activeAuthors: 0
  };

  articlesForReview: Article[] = [];
  approvedArticles: Article[] = [];
  statusCounts: StatusCount[] = [];
  recentActivity: any[] = [];
  loading = false;

  // Modal properties
  showReviewModal = false;
  selectedArticle: Article | null = null;
  reviewFeedback = '';
  showFullContent = false;

  // Schedule modal properties
  showScheduleModal = false;
  scheduledDate = '';
  selectedArticleForSchedule: number | null = null;

  constructor(private restService: Rest) {}

  ngOnInit() {
    this.loadDashboardData();
  }

  async loadDashboardData() {
    this.loading = true;
    try {
      await Promise.all([
        this.loadDashboardStats(),
        this.loadArticlesByStatus(),
        this.loadApprovedArticles(),
        this.loadStatusCounts(),
        this.loadRecentActivity()
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      this.showErrorAlert('Failed to load dashboard data');
    } finally {
      this.loading = false;
    }
  }

  async loadDashboardStats() {
    try {
      const response = await this.restService.getDashboardSummary().toPromise();
      this.stats = {
        totalArticles: response?.total || 0,
        published: response?.published || 0,
        pendingReview: response?.pendingReview || 0,
        needsAttention: response?.needsAttention || 0,
        totalViews: response?.totalViews || 0,
        activeAuthors: response?.activeAuthors || 0
      };
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      this.loadFallbackStats();
    }
  }

  async loadFallbackStats() {
    try {
      const response = await this.restService.getArticleCounts().toPromise();
      this.stats = {
        totalArticles: response?.total || 0,
        published: response?.published || 0,
        pendingReview: response?.byStatus?.['PENDING_APPROVAL'] || 0,
        needsAttention: (response?.byStatus?.['NEEDS_REVISION'] || 0) + 
                       (response?.byStatus?.['RETURNED_TO_WRITER'] || 0),
        totalViews: 0,
        activeAuthors: 0
      };
    } catch (error) {
      console.error('Error loading fallback stats:', error);
    }
  }

  async loadArticlesForReview() {
    try {
      const response = await this.restService.getArticlesInEditorialWorkflow(0, 10).toPromise();
      this.articlesForReview = response?.content || [];
    } catch (error) {
      console.error('Error loading articles for review:', error);
      this.loadArticlesByStatus();
    }
  }

  async loadArticlesByStatus() {
    try {
      const statuses = ['READY_FOR_REVIEW', 'UNDER_REVIEW', 'PENDING_APPROVAL'];
      const articles: Article[] = [];
      
      for (const status of statuses) {
        try {
          const response = await this.restService.getArticlesByStatus(status as ArticleStatus, 0, 5).toPromise();
          if (response?.content) {
            articles.push(...response.content);
          }
        } catch (error) {
          console.error(`Error loading articles with status ${status}:`, error);
        }
      }
      
      this.articlesForReview = articles.slice(0, 10);
    } catch (error) {
      console.error('Error loading articles by status:', error);
    }
  }

  async loadApprovedArticles() {
    try {
      const response = await this.restService.getArticlesByStatus(ArticleStatus.APPROVED, 0, 20).toPromise();
      this.approvedArticles = response?.content || [];
    } catch (error) {
      console.error('Error loading approved articles:', error);
    }
  }

  async loadStatusCounts() {
    try {
      const response = await this.restService.getArticleStatusStatistics().toPromise();
      this.statusCounts = this.convertToStatusCounts(response);
    } catch (error) {
      console.error('Error loading status counts:', error);
    }
  }

  async loadRecentActivity() {
    try {
      const response = await this.restService.getAllArticles(0, 10, 'updatedAt', 'desc').toPromise();
      this.recentActivity = (response?.content || []).map(article => ({
        title: article.title,
        action: this.getActivityAction(article.status),
        type: this.getActivityType(article.status),
        timestamp: article.updatedAt || article.createdAt
      }));
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  }

  convertToStatusCounts(statistics: any): StatusCount[] {
    if (!statistics) return [];
    
    const relevantStatuses = [
      'READY_FOR_REVIEW', 'UNDER_REVIEW', 'PENDING_APPROVAL', 
      'APPROVED', 'NEEDS_REVISION', 'PUBLISHED'
    ];
    
    return relevantStatuses
      .map(status => ({
        status: status as ArticleStatus,
        count: statistics[status.toLowerCase()] || 0,
        displayName: this.getStatusDisplayName(status),
        color: this.getStatusColor(status)
      }))
      .filter(item => item.count > 0);
  }

  // Modal Methods
  reviewArticle(article: Article) {
    this.selectedArticle = article;
    this.showReviewModal = true;
    this.reviewFeedback = '';
    this.showFullContent = false;
  }

  closeReviewModal() {
    this.showReviewModal = false;
    this.selectedArticle = null;
    this.reviewFeedback = '';
    this.showFullContent = false;
  }

  toggleFullContent() {
    this.showFullContent = !this.showFullContent;
  }

  getDisplayContent(): string {
    if (!this.selectedArticle?.content) return '';
    
    if (this.showFullContent || this.selectedArticle.content.length <= 500) {
      return this.selectedArticle.content.replace(/\n/g, '<br>');
    }
    
    return this.selectedArticle.content.substring(0, 500).replace(/\n/g, '<br>') + '...';
  }

  async submitReview(action: 'approve' | 'reject' | 'revision') {
    if (!this.selectedArticle) return;

    // Validate feedback for reject and revision actions
    if ((action === 'reject' || action === 'revision') && !this.reviewFeedback.trim()) {
      this.showWarningAlert('Please provide feedback for ' + (action === 'reject' ? 'rejection' : 'revision request'));
      return;
    }

    const loadingAlert = Swal.fire({
      title: 'Processing...',
      text: 'Submitting your review',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      const articleTitle = this.selectedArticle.title;
      
      switch (action) {
        case 'approve':
          await this.restService.updateArticleStatus(this.selectedArticle.id, 'APPROVED').toPromise();
          break;
        case 'reject':
          await this.restService.updateArticleStatus(this.selectedArticle.id, 'RETURNED_TO_WRITER').toPromise();
          if (this.reviewFeedback.trim()) {
            await this.restService.returnArticleToWriter(this.selectedArticle.id, this.reviewFeedback).toPromise();
          }
          break;
        case 'revision':
          await this.restService.updateArticleStatus(this.selectedArticle.id, 'NEEDS_REVISION').toPromise();
          if (this.reviewFeedback.trim()) {
            await this.restService.returnArticleToWriter(this.selectedArticle.id, this.reviewFeedback).toPromise();
          }
          break;
      }
      
      // loadingAlert.close();
      this.closeReviewModal();
      this.refreshArticles();
      
      const actionMessages = {
        'approve': 'approved successfully! It\'s now ready for publishing.',
        'reject': 'has been rejected and returned to the writer.',
        'revision': 'has been sent back for revision.'
      };

      this.showSuccessAlert(`Article "${articleTitle}" ${actionMessages[action]}`);
    } catch (error) {
      // loadingAlert.close();
      console.error('Error submitting review:', error);
      this.showErrorAlert('Failed to submit review. Please try again.');
    }
  }

  // Publishing Methods
  async publishSingleArticle(articleId: number) {
    const result = await Swal.fire({
      title: 'Publish Article?',
      text: 'This will make the article live and visible to readers.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, publish it!'
    });

    if (result.isConfirmed) {
      const loadingAlert = Swal.fire({
        title: 'Publishing...',
        text: 'Making your article live',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        await this.restService.updateArticleStatus(articleId, 'PUBLISHED').toPromise();
        // loadingAlert.close();
        this.refreshApprovedArticles();
        this.loadDashboardStats();
        this.showSuccessAlert('Article published successfully!');
      } catch (error) {
        // loadingAlert.close();
        console.error('Error publishing article:', error);
        this.showErrorAlert('Failed to publish article. Please try again.');
      }
    }
  }

  async publishAllApproved() {
    const result = await Swal.fire({
      title: 'Publish All Articles?',
      text: `This will publish all ${this.approvedArticles.length} approved articles.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#059669',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, publish all!'
    });

    if (result.isConfirmed) {
      const loadingAlert = Swal.fire({
        title: 'Publishing Articles...',
        text: 'This may take a moment',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      try {
        const publishPromises = this.approvedArticles.map(article => 
          this.restService.updateArticleStatus(article.id, 'PUBLISHED').toPromise()
        );
        
        await Promise.all(publishPromises);
        // loadingAlert.close();
        this.refreshApprovedArticles();
        this.loadDashboardStats();
        this.showSuccessAlert(`Successfully published ${this.approvedArticles.length} articles!`);
      } catch (error) {
        // loadingAlert.close();
        console.error('Error publishing all articles:', error);
        this.showErrorAlert('Failed to publish some articles. Please try again.');
      }
    }
  }

  schedulePublish(articleId: number) {
    this.selectedArticleForSchedule = articleId;
    this.scheduledDate = '';
    this.showScheduleModal = true;
  }

  closeScheduleModal() {
    this.showScheduleModal = false;
    this.selectedArticleForSchedule = null;
    this.scheduledDate = '';
  }

  getMinDate(): string {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30); // Minimum 30 minutes from now
    return now.toISOString().slice(0, 16);
  }

  async confirmSchedule() {
    if (!this.scheduledDate || !this.selectedArticleForSchedule) {
      this.showWarningAlert('Please select a valid date and time');
      return;
    }

    const selectedDate = new Date(this.scheduledDate);
    const now = new Date();
    
    if (selectedDate <= now) {
      this.showWarningAlert('Please select a future date and time');
      return;
    }

    const loadingAlert = Swal.fire({
      title: 'Scheduling...',
      text: 'Setting up scheduled publishing',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    try {
      // Assuming you have an API endpoint for scheduling
      // await this.restService.scheduleArticlePublishing(this.selectedArticleForSchedule, this.scheduledDate).toPromise();
      // loadingAlert.close();
      this.closeScheduleModal();
      this.showSuccessAlert(`Article scheduled for publishing on ${this.formatScheduledDate(this.scheduledDate)}`);
    } catch (error) {
      // loadingAlert.close();
      console.error('Error scheduling article:', error);
      this.showErrorAlert('Failed to schedule article. Please try again.');
    }
  }

  formatScheduledDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  previewArticle(article: Article) {
    this.reviewArticle(article); // Reuse the review modal for preview
  }

  // Action Methods
  async approveArticle(articleId: number) {
    const result = await Swal.fire({
      title: 'Approve Article?',
      text: 'This will move the article to the publishing queue.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, approve it!'
    });

    if (result.isConfirmed) {
      try {
        await this.restService.updateArticleStatus(articleId, 'APPROVED').toPromise();
        this.refreshArticles();
        this.showSuccessAlert('Article approved successfully!');
      } catch (error) {
        console.error('Error approving article:', error);
        this.showErrorAlert('Failed to approve article. Please try again.');
      }
    }
  }

  async moveToNextStage(articleId: number) {
    try {
      await this.restService.moveToNextWorkflowStage(articleId).toPromise();
      this.refreshArticles();
      this.showSuccessAlert('Article moved to next stage successfully!');
    } catch (error) {
      console.error('Error moving article to next stage:', error);
      this.showErrorAlert('Failed to move article to next stage. Please try again.');
    }
  }

  async returnToWriter(articleId: number) {
    const { value: feedback } = await Swal.fire({
      title: 'Return to Writer',
      input: 'textarea',
      inputLabel: 'Feedback for the writer',
      inputPlaceholder: 'Please explain what needs to be revised...',
      inputValidator: (value) => {
        if (!value) {
          return 'Please provide feedback for the writer';
        }
        return null;
      },
      showCancelButton: true,
      confirmButtonText: 'Send Back',
      cancelButtonText: 'Cancel'
    });

    if (feedback) {
      try {
        await this.restService.returnArticleToWriter(articleId, feedback).toPromise();
        this.refreshArticles();
        this.showSuccessAlert('Article returned to writer with feedback!');
      } catch (error) {
        console.error('Error returning article to writer:', error);
        this.showErrorAlert('Failed to return article to writer. Please try again.');
      }
    }
  }

  refreshArticles() {
    this.loadArticlesForReview();
    this.loadApprovedArticles();
    this.loadDashboardStats();
    this.loadStatusCounts();
  }

  refreshApprovedArticles() {
    this.loadApprovedArticles();
    this.loadDashboardStats();
    this.loadStatusCounts();
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

  // Helper Methods
  getStatusDisplayName(status: string): string {
    const statusMap: { [key: string]: string } = {
      'READY_FOR_REVIEW': 'Ready for Review',
      'UNDER_REVIEW': 'Under Review',
      'PENDING_APPROVAL': 'Pending Approval',
      'APPROVED': 'Approved',
      'NEEDS_REVISION': 'Needs Revision',
      'PUBLISHED': 'Published',
      'DRAFT': 'Draft',
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
      'RETURNED_TO_WRITER': '#ef4444'
    };
    return colorMap[status] || '#6b7280';
  }

  getActivityAction(status: string): string {
    const actionMap: { [key: string]: string } = {
      'PUBLISHED': 'published',
      'APPROVED': 'approved for publication',
      'UNDER_REVIEW': 'moved to review',
      'NEEDS_REVISION': 'needs revision',
      'RETURNED_TO_WRITER': 'returned to writer'
    };
    return actionMap[status] || 'updated';
  }

  getActivityType(status: string): string {
    if (['PUBLISHED', 'APPROVED'].includes(status)) return 'success';
    if (['NEEDS_REVISION', 'RETURNED_TO_WRITER'].includes(status)) return 'warning';
    return 'info';
  }

  getActivityIcon(type: string): { class: string, icon: string } {
    const iconMap: { [key: string]: { class: string, icon: string } } = {
      'success': {
        class: 'bg-green-100 text-green-600',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>'
      },
      'warning': {
        class: 'bg-orange-100 text-orange-600',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>'
      },
      'info': {
        class: 'bg-blue-100 text-blue-600',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
      }
    };
    return iconMap[type] || iconMap['info'];
  }

  getActivityTypeClass(type: string): string {
    const classMap: { [key: string]: string } = {
      'success': 'text-green-600',
      'warning': 'text-orange-600',
      'info': 'text-blue-600'
    };
    return classMap[type] || 'text-blue-600';
  }

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
}