import { boolean, integer, pgTable, real, serial, text, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { trimsTable } from "./vehicles";

export const ownershipEstimatesTable = pgTable(
  "ownership_estimates",
  {
    id: serial("id").primaryKey(),
    trimId: integer("trim_id").notNull().references(() => trimsTable.id, { onDelete: "cascade" }),
    reliabilityScore: real("reliability_score").notNull(),
    reliabilityLabel: text("reliability_label").notNull(),
    reliabilityNote: text("reliability_note").notNull(),
    annualOwnershipUsd: integer("annual_ownership_usd").notNull(),
    annualMaintenanceUsd: integer("annual_maintenance_usd").notNull(),
    annualRepairUsd: integer("annual_repair_usd").notNull(),
    annualFuelUsd: integer("annual_fuel_usd").notNull(),
    annualInsuranceUsd: integer("annual_insurance_usd").notNull(),
    fiveYearDepreciationPercent: real("five_year_depreciation_percent").notNull(),
    expectedLifespanMiles: integer("expected_lifespan_miles").notNull(),
    isDemo: boolean("is_demo").notNull().default(true),
  },
  (table) => [uniqueIndex("ownership_estimates_trim_idx").on(table.trimId)],
);

export const maintenanceItemsTable = pgTable("maintenance_items", {
  id: serial("id").primaryKey(),
  trimId: integer("trim_id").notNull().references(() => trimsTable.id, { onDelete: "cascade" }),
  item: text("item").notNull(),
  intervalMiles: integer("interval_miles").notNull(),
  estimatedCostUsd: integer("estimated_cost_usd").notNull(),
  isDemo: boolean("is_demo").notNull().default(true),
});

export const insertOwnershipEstimateSchema = createInsertSchema(ownershipEstimatesTable).omit({ id: true });
export const insertMaintenanceItemSchema = createInsertSchema(maintenanceItemsTable).omit({ id: true });
export type InsertOwnershipEstimate = z.infer<typeof insertOwnershipEstimateSchema>;
export type OwnershipEstimate = typeof ownershipEstimatesTable.$inferSelect;
export type InsertMaintenanceItem = z.infer<typeof insertMaintenanceItemSchema>;
export type MaintenanceItem = typeof maintenanceItemsTable.$inferSelect;