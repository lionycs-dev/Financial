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
  cac: decimal('cac', { precision: 10, scale: 2 }).notNull(),
  pricingPlans: json('pricing_plans').notNull().default('[]'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Client Group table
export const clientGroups = pgTable('client_groups', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  startingCustomers: integer('starting_customers').notNull(),
  churnRate: decimal('churn_rate', { precision: 5, scale: 4 }).notNull(), // percentage as decimal
  acvGrowthRate: decimal('acv_growth_rate', {
    precision: 5,
    scale: 4,
  }).notNull(), // percentage as decimal
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Conversion Rule table
export const conversionRules = pgTable('conversion_rules', {
  id: serial('id').primaryKey(),
  clientGroupId: integer('client_group_id')
    .references(() => clientGroups.id)
    .notNull(),
  fromProductId: integer('from_product_id')
    .references(() => products.id)
    .notNull(),
  toProductId: integer('to_product_id')
    .references(() => products.id)
    .notNull(),
  afterMonths: integer('after_months').notNull(),
  probability: decimal('probability', { precision: 5, scale: 4 }).notNull(), // percentage as decimal
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Unified Relationships table - replaces the mixed relationship storage
export const relationships = pgTable('relationships', {
  id: serial('id').primaryKey(),
  sourceType: text('source_type').notNull(), // 'stream', 'product', 'clientGroup'
  sourceId: integer('source_id').notNull(),
  targetType: text('target_type').notNull(), // 'stream', 'product', 'clientGroup'
  targetId: integer('target_id').notNull(),
  relationshipType: text('relationship_type').notNull(), // 'product_to_stream', 'clientgroup_to_product', 'product_conversion'
  properties: json('properties').notNull(), // { weight?, probability?, afterMonths?, entryWeight? }
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
