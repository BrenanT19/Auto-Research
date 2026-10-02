CREATE TABLE "makes" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"mark" text NOT NULL,
	"origin" text DEFAULT 'United States' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generations" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_id" integer NOT NULL,
	"name" text NOT NULL,
	"start_year" integer NOT NULL,
	"end_year" integer,
	"body_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" serial PRIMARY KEY NOT NULL,
	"make_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "engines" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_year_id" integer NOT NULL,
	"name" text NOT NULL,
	"horsepower" integer NOT NULL,
	"fuel_type" text NOT NULL,
	"availability" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "model_years" (
	"id" serial PRIMARY KEY NOT NULL,
	"generation_id" integer NOT NULL,
	"year" integer NOT NULL,
	"fuel_type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transmissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_year_id" integer NOT NULL,
	"name" text NOT NULL,
	"gears" text NOT NULL,
	"availability" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trims" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_year_id" integer NOT NULL,
	"engine_id" integer NOT NULL,
	"transmission_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"drivetrain" text NOT NULL,
	"fuel_type" text NOT NULL,
	"mpg_city" integer,
	"mpg_highway" integer,
	"mpg_combined" integer,
	"horsepower" integer NOT NULL,
	"price_usd" integer NOT NULL,
	"research_rank" integer DEFAULT 999 NOT NULL,
	"image_key" text DEFAULT 'pickup' NOT NULL,
	"is_demo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"trim_id" integer NOT NULL,
	"item" text NOT NULL,
	"interval_miles" integer NOT NULL,
	"estimated_cost_usd" integer NOT NULL,
	"is_demo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ownership_estimates" (
	"id" serial PRIMARY KEY NOT NULL,
	"trim_id" integer NOT NULL,
	"reliability_score" real NOT NULL,
	"reliability_label" text NOT NULL,
	"reliability_note" text NOT NULL,
	"annual_ownership_usd" integer NOT NULL,
	"annual_maintenance_usd" integer NOT NULL,
	"annual_repair_usd" integer NOT NULL,
	"annual_fuel_usd" integer NOT NULL,
	"annual_insurance_usd" integer NOT NULL,
	"five_year_depreciation_percent" real NOT NULL,
	"expected_lifespan_miles" integer NOT NULL,
	"is_demo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "common_problems" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_year_id" integer NOT NULL,
	"engine_id" integer,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"typical_mileage_start" integer NOT NULL,
	"typical_mileage_end" integer NOT NULL,
	"repair_cost_low_usd" integer NOT NULL,
	"repair_cost_high_usd" integer NOT NULL,
	"severity" text NOT NULL,
	"is_demo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recalls" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_year_id" integer NOT NULL,
	"campaign_code" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"announced_date" date,
	"source_url" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_demo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "safety_ratings" (
	"id" serial PRIMARY KEY NOT NULL,
	"model_year_id" integer NOT NULL,
	"agency" text NOT NULL,
	"rating" text,
	"source_url" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"is_demo" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "owner_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"trim_id" integer NOT NULL,
	"display_name" text NOT NULL,
	"ownership_months" integer NOT NULL,
	"miles_driven" integer NOT NULL,
	"rating" integer NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"reported_problem" text,
	"is_demo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generations" ADD CONSTRAINT "generations_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "models" ADD CONSTRAINT "models_make_id_makes_id_fk" FOREIGN KEY ("make_id") REFERENCES "public"."makes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engines" ADD CONSTRAINT "engines_model_year_id_model_years_id_fk" FOREIGN KEY ("model_year_id") REFERENCES "public"."model_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_years" ADD CONSTRAINT "model_years_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transmissions" ADD CONSTRAINT "transmissions_model_year_id_model_years_id_fk" FOREIGN KEY ("model_year_id") REFERENCES "public"."model_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trims" ADD CONSTRAINT "trims_model_year_id_model_years_id_fk" FOREIGN KEY ("model_year_id") REFERENCES "public"."model_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trims" ADD CONSTRAINT "trims_engine_id_engines_id_fk" FOREIGN KEY ("engine_id") REFERENCES "public"."engines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trims" ADD CONSTRAINT "trims_transmission_id_transmissions_id_fk" FOREIGN KEY ("transmission_id") REFERENCES "public"."transmissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_items" ADD CONSTRAINT "maintenance_items_trim_id_trims_id_fk" FOREIGN KEY ("trim_id") REFERENCES "public"."trims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ownership_estimates" ADD CONSTRAINT "ownership_estimates_trim_id_trims_id_fk" FOREIGN KEY ("trim_id") REFERENCES "public"."trims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "common_problems" ADD CONSTRAINT "common_problems_model_year_id_model_years_id_fk" FOREIGN KEY ("model_year_id") REFERENCES "public"."model_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "common_problems" ADD CONSTRAINT "common_problems_engine_id_engines_id_fk" FOREIGN KEY ("engine_id") REFERENCES "public"."engines"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recalls" ADD CONSTRAINT "recalls_model_year_id_model_years_id_fk" FOREIGN KEY ("model_year_id") REFERENCES "public"."model_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "safety_ratings" ADD CONSTRAINT "safety_ratings_model_year_id_model_years_id_fk" FOREIGN KEY ("model_year_id") REFERENCES "public"."model_years"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "owner_reports" ADD CONSTRAINT "owner_reports_trim_id_trims_id_fk" FOREIGN KEY ("trim_id") REFERENCES "public"."trims"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "makes_slug_idx" ON "makes" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "generations_model_year_idx" ON "generations" USING btree ("model_id","start_year");--> statement-breakpoint
CREATE UNIQUE INDEX "models_make_slug_idx" ON "models" USING btree ("make_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "model_years_generation_year_idx" ON "model_years" USING btree ("generation_id","year");--> statement-breakpoint
CREATE UNIQUE INDEX "trims_slug_idx" ON "trims" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "ownership_estimates_trim_idx" ON "ownership_estimates" USING btree ("trim_id");