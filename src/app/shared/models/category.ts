// Category interface to match your backend Category model
export interface Category {
  id: number;
  name: string;
  description: string;
  slug: string;
  color: string;
  icon: string;
  articleCount?: number;
  createdAt?: string;
  updatedAt?: string;
  active: boolean;
}