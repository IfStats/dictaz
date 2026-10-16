CREATE TYPE "public"."article_status" AS ENUM('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'REJECTED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."content_origin" AS ENUM('HUMAN', 'AI', 'IMPORTED');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('ARTICLE', 'NEWS_BRIEF', 'OPINION', 'AI_GENERATED', 'VIDEO', 'AUDIO');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('ADMIN', 'EDITOR', 'GUEST_WRITER', 'SUBSCRIBER');--> statement-breakpoint
CREATE TYPE "public"."editorial_vertical" AS ENUM('TECHNOLOGY', 'FOOTBALL', 'COMMERCE', 'POLITICS');--> statement-breakpoint
CREATE TABLE "articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(300) NOT NULL,
	"slug" varchar(320) NOT NULL,
	"excerpt" text,
	"body" jsonb,
	"author_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"content_type" "content_type" DEFAULT 'ARTICLE' NOT NULL,
	"origin" "content_origin" DEFAULT 'HUMAN' NOT NULL,
	"status" "article_status" DEFAULT 'DRAFT' NOT NULL,
	"technology_angle" text,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"scheduled_for" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "articles_slug_unique" UNIQUE("slug"),
	CONSTRAINT "articles_approval_required" CHECK ("articles"."status" NOT IN ('APPROVED', 'SCHEDULED', 'PUBLISHED')
          OR ("articles"."approved_by_user_id" IS NOT NULL
              AND "articles"."approved_at" IS NOT NULL)),
	CONSTRAINT "articles_publication_date_required" CHECK ("articles"."status" <> 'PUBLISHED'
          OR "articles"."published_at" IS NOT NULL),
	CONSTRAINT "articles_schedule_date_required" CHECK ("articles"."status" <> 'SCHEDULED'
          OR "articles"."scheduled_for" IS NOT NULL)
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(140) NOT NULL,
	"vertical" "editorial_vertical" NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"user_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	CONSTRAINT "user_roles_user_id_role_pk" PRIMARY KEY("user_id","role")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"display_name" varchar(160),
	"bio" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "articles" ADD CONSTRAINT "articles_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "articles_author_idx" ON "articles" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "articles_category_idx" ON "articles" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "articles_status_idx" ON "articles" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_unique" ON "users" USING btree (lower("email"));