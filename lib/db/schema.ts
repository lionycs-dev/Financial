import {
  pgTable,
  serial,
  text,
  timestamp,
  decimal,
  integer,
  pgEnum,
  json,
} from 'drizzle-orm/pg-core';

// Enums
export const revenueTypeEnum = pgEnum('revenue_type', [
  'Subscription',
  'RepeatPurchase',
  'SinglePurchase',
  'RevenueOnly',
]);

export const clientGroupTypeEnum = pgEnum('client_group_type', [
  'B2B',
  'B2C',
  'DTC',
]);

// Revenue Stream table
export const revenueStreams = pgTable('revenue_streams', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  type: revenueTypeEnum('type').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Product table
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }).notNull(),
  productStreamId: integer('product_stream_id')
    .references(() => revenueStreams.id)
    .notNull(),
  weight: decimal('weight', { precision: 5, scale: 4 }).notNull(), // percentage as decimal, sum to 1 within stream
  pricingPlans: json('pricing_plans').notNull().default('[]'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type ProductSelect = typeof products.$inferSelect;
export type ProductInsert = typeof products.$inferInsert;

// Client Group table
export const clientGroups = pgTable('client_groups', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  startingCustomers: integer('starting_customers').notNull(),
  conversionRate: decimal('conversion_rate', { precision: 5, scale: 4 })
    .notNull()
    .default('0'), // new customer acquisition rate (percentage as decimal)
  churnRate: decimal('churn_rate', { precision: 5, scale: 4 }).notNull(), // customer loss rate (percentage as decimal)
  type: clientGroupTypeEnum('type').notNull(), // B2B, B2C, DTC
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type ClientGroupSelect = typeof clientGroups.$inferSelect;
export type ClientGroupInsert = typeof clientGroups.$inferInsert;

// Relationship type enum
export const relationshipTypeEnum = pgEnum('relationship_type', [
  'first_purchase', // Pink/Purple - when customer is acquired
  'existing_relationship', // Orange - not generated from model
  'upselling', // Blue - product to product with timing specification
]);

export type RelationshipType =
  | 'first_purchase'
  | 'existing_relationship'
  | 'upselling';

// Unified Relationships table - handles all relationships between entities
export const relationships = pgTable('relationships', {
  id: serial('id').primaryKey(),
  sourceType: text('source_type').notNull(), // 'stream', 'product', 'clientGroup', 'clientGroupType'
  sourceId: integer('source_id').notNull(),
  targetType: text('target_type').notNull(), // 'stream', 'product', 'clientGroup', 'clientGroupType'
  targetId: integer('target_id').notNull(),
  relationshipType: relationshipTypeEnum('relationship_type').notNull(),
  properties: json('properties').notNull(), // { weight?, probability?, afterMonths?, timing? }
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export type RelationshipSelect = typeof relationships.$inferSelect;
export type RelationshipInsert = typeof relationships.$inferInsert;
