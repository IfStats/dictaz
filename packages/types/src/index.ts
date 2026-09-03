export type DictazEnvironment = 'development' | 'test' | 'staging' | 'production';

export type ContentOrigin = 'HUMAN' | 'AI' | 'IMPORTED';

export type ArticleStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'SCHEDULED'
  | 'PUBLISHED'
  | 'REJECTED'
  | 'ARCHIVED';

export type ContentType =
  | 'ARTICLE'
  | 'NEWS_BRIEF'
  | 'OPINION'
  | 'AI_GENERATED'
  | 'VIDEO'
  | 'AUDIO';

export interface DictazArticleSummary {
  id: string;
  title: string;
  slug: string;
  status: ArticleStatus;
  origin: ContentOrigin;
  contentType: ContentType;
}
