import { pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const makesTable = pgTable(
  "makes",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    mark: text("mark").notNull(),
    origin: text("origin").notNull().default("United States"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("makes_slug_idx").on(table.slug)],
);

export const insertMakeSchema = createInsertSchema(makesTable).omit({ id: true, createdAt: true });
export type InsertMake = z.infer<typeof insertMakeSchema>;
export type Make = typeof makesTable.$inferSelect;