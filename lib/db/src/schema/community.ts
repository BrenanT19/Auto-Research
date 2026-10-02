import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { trimsTable } from "./vehicles";

// Legacy illustrative reports only: trim_id is NOT a canonical vehicle_trim ID.
// Non-demo rows lack reviewed canonical applicability and are not publishable.
// Real experiences use reviewed owner_experience claims with configuration subjects.
export const ownerReportsTable = pgTable("owner_reports", {
  id: serial("id").primaryKey(),
  trimId: integer("trim_id").notNull().references(() => trimsTable.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  ownershipMonths: integer("ownership_months").notNull(),
  milesDriven: integer("miles_driven").notNull(),
  rating: integer("rating").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  reportedProblem: text("reported_problem"),
  isDemo: boolean("is_demo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertOwnerReportSchema = createInsertSchema(ownerReportsTable).omit({ id: true, createdAt: true });
export type InsertOwnerReport = z.infer<typeof insertOwnerReportSchema>;
export type OwnerReport = typeof ownerReportsTable.$inferSelect;