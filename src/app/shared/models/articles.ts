
// export interface Article {
//   id: number;
//   title: string;
//   description: string;
//   excerpt: string;
//   content: string;
//   slug: string;
//   imageUrl: string;
//   viewCount: number;
//   likeCount: number;
//   tags: string[];
//   createdAt: string;
//   updatedAt: string;
//   publishedAt: string;
//   trending: boolean;
//   featured: boolean;
//   published: boolean;
// }

import { Category } from "./category";

export interface Article {
  id: number;
  title: string;
  excerpt: string;
  content: string;
  summary?: string;
  slug: string;
  imageUrl: string;
  status: ArticleStatus;
  author: Author;
  categories: number[];
  tags: string[];
  featuredImage?: string;
  featured: boolean;
  trending: boolean;
  published: boolean;
  publishedAt?: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
  viewCount: number;
  likeCount: number;
  readTime?: number;
  metaTitle?: string;
  metaDescription?: string;
  seoKeywords?: string[];
  inEditorialWorkflow: boolean;
}

export interface Author {
  id: number;
  username: string;
  email: string;
  fullName: string;
  bio?: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
  active?: boolean;
  avatarUrl?: string;
}

export interface ApiResponse {
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  content: Article[];
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  first: boolean;
  last: boolean;
  numberOfElements: number;
  pageable: {
    offset: number;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    pageSize: number;
    pageNumber: number;
    unpaged: boolean;
    paged: boolean;
  };
  empty: boolean;
}

export interface ArticleCreateRequest {
  title: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  categoryIds: number[];      // Changed from single category to array of IDs
  tags: string[];            // Added tags array
  status: string;            // Should be "DRAFT", "PUBLISHED", or "ARCHIVED"
  trending: boolean;         // Added trending field
  published: boolean;        // Keep existing published boolean
  featured: boolean;         // Keep existing featured boolean
}

export enum ArticleStatus {
  // Core Publishing Workflow
  DRAFT = 'DRAFT',
  IN_PROGRESS = 'IN_PROGRESS',
  READY_FOR_REVIEW = 'READY_FOR_REVIEW',
  UNDER_REVIEW = 'UNDER_REVIEW',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',

  // Rejection/Revision Statuses
  REJECTED = 'REJECTED',
  NEEDS_REVISION = 'NEEDS_REVISION',
  RETURNED_TO_WRITER = 'RETURNED_TO_WRITER',
  ON_HOLD = 'ON_HOLD',

  // Special Editorial Statuses
  FACT_CHECKING = 'FACT_CHECKING',
  LEGAL_REVIEW = 'LEGAL_REVIEW',
  COPY_EDIT = 'COPY_EDIT',
  PROOFREADING = 'PROOFREADING',

  // Post-Publication Statuses
  UPDATED = 'UPDATED',
  RETRACTED = 'RETRACTED',
  UNPUBLISHED = 'UNPUBLISHED',
  EXPIRED = 'EXPIRED',

  // Administrative Statuses
  ASSIGNED = 'ASSIGNED',
  UNASSIGNED = 'UNASSIGNED',
  OVERDUE = 'OVERDUE',
  RUSH = 'RUSH'
}

export interface ArticleStatusStatistics {
  draft: number;
  inProgress: number;
  readyForReview: number;
  underReview: number;
  pendingApproval: number;
  approved: number;
  published: number;
  needsRevision: number;
  returnedToWriter: number;
  rejected: number;
  [key: string]: number;
}

export interface DashboardStats {
  total: number;
  published: number;
  pendingReview: number;
  needsAttention: number;
  totalViews: number;
  activeAuthors: number;
}
