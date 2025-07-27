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

export const frequencyEnum = pgEnum('frequency', [
  'Monthly',
  'Quarterly',
  'SemiAnnual',
  'Annual',
  'OneTime',
  'Custom',
]);

export const invoiceTimingEnum = pgEnum('invoice_timing', [
  'Immediate',
  'Upfront',
  'Net30',
  'Net60',
  'Custom',
]);

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

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
  streamId: integer('stream_id')
    .references(() => revenueStreams.id)
    .notNull(),
  name: text('name').notNull(),
  unitCost: decimal('unit_cost', { precision: 10, scale: 2 }).notNull(),
  entryWeight: decimal('entry_weight', { precision: 5, scale: 4 }).notNull(), // percentage as decimal
  cac: decimal('cac', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Pricing Plan table
export const pricingPlans = pgTable('pricing_plans', {
  id: serial('id').primaryKey(),
  productId: integer('product_id')
    .references(() => products.id)
    .notNull(),
  name: text('name').notNull(),
  priceFormula: text('price_formula').notNull(),
  frequency: frequencyEnum('frequency').notNull(),
  customFrequency: integer('custom_frequency'), // for custom frequency in months
  invoiceTiming: invoiceTimingEnum('invoice_timing').notNull(),
  customInvoiceTiming: integer('custom_invoice_timing'), // for custom timing in days
  leadToCashLag: integer('lead_to_cash_lag').notNull(), // in days
  escalatorPct: decimal('escalator_pct', { precision: 5, scale: 4 }), // percentage as decimal
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
  firstPurchaseMix: json('first_purchase_mix').notNull(), // {productId: percentage}
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
