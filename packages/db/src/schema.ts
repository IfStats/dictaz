
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// Identity and access
export const userRoleEnum = pgEnum('user_role', [
  'ADMIN',
  'EDITOR',
  'GUEST_WRITER',
  'SUBSCRIBER',
]);

// Editorial classification
export const verticalEnum = pgEnum('editorial_vertical', [
  'TECHNOLOGY',
  'FOOTBALL',
  'COMMERCE',
  'POLITICS',
]);

export const contentOriginEnum = pgEnum('content_origin', [
  'HUMAN',
  'AI',
  'IMPORTED',
]);

export const contentTypeEnum = pgEnum('content_type', [
  'ARTICLE',
  'NEWS_BRIEF',
  'OPINION',
  'AI_GENERATED',
  'VIDEO',
  'AUDIO',
]);

export const articleStatusEnum = pgEnum('article_status', [
  'DRAFT',
  'PENDING_REVIEW',
  'APPROVED',
  'SCHEDULED',
  'PUBLISHED',
  'REJECTED',
  'ARCHIVED',
]);

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: varchar('email', { length: 320 }).notNull(),
    displayName: varchar('display_name', { length: 160 }),
    bio: text('bio'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('users_email_lower_unique').on(sql`lower(${table.email})`),
  ],
);

export const userRoles = pgTable(
  'user_roles',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: userRoleEnum('role').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.role] }),
  ],
);

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 120 }).notNull(),
  slug: varchar('slug', { length: 140 }).notNull().unique(),
  vertical: verticalEnum('vertical').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    title: varchar('title', { length: 300 }).notNull(),
    slug: varchar('slug', { length: 320 }).notNull().unique(),
    excerpt: text('excerpt'),
    body: jsonb('body').$type<Record<string, unknown>>(),

    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),

    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),

    contentType: contentTypeEnum('content_type')
      .notNull()
      .default('ARTICLE'),

    origin: contentOriginEnum('origin')
      .notNull()
      .default('HUMAN'),

    status: articleStatusEnum('status')
      .notNull()
      .default('DRAFT'),

    technologyAngle: text('technology_angle'),

    approvedByUserId: uuid('approved_by_user_id')
      .references(() => users.id, { onDelete: 'restrict' }),

    approvedAt: timestamp('approved_at', { withTimezone: true }),
    scheduledFor: timestamp('scheduled_for', { withTimezone: true }),
    publishedAt: timestamp('published_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('articles_author_idx').on(table.authorId),
    index('articles_category_idx').on(table.categoryId),
    index('articles_status_idx').on(table.status),

    // Approval is mandatory before release.
    check(
      'articles_approval_required',
      sql`${table.status} NOT IN ('APPROVED', 'SCHEDULED', 'PUBLISHED')
          OR (${table.approvedByUserId} IS NOT NULL
              AND ${table.approvedAt} IS NOT NULL)`,
    ),

    check(
      'articles_publication_date_required',
      sql`${table.status} <> 'PUBLISHED'
          OR ${table.publishedAt} IS NOT NULL`,
    ),

    check(
      'articles_schedule_date_required',
      sql`${table.status} <> 'SCHEDULED'
          OR ${table.scheduledFor} IS NOT NULL`,
    ),
  ],
);
