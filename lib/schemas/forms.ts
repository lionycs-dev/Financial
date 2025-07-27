import { z } from 'zod';

// Revenue Stream Schema
export const revenueStreamSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.enum([
    'Subscription',
    'RepeatPurchase',
    'SinglePurchase',
    'RevenueOnly',
  ]),
  description: z.string().optional(),
});

export type RevenueStreamFormData = z.infer<typeof revenueStreamSchema>;

// Product Schema
export const productSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  unitCost: z
    .string()
    .min(1, 'Unit cost is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Unit cost must be a valid positive number',
    }),
  cac: z
    .string()
    .min(1, 'CAC is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'CAC must be a valid positive number',
    }),
});

export type ProductFormData = z.infer<typeof productSchema>;

// Pricing Plan Schema
export const pricingPlanSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  priceFormula: z.string().min(1, 'Price formula is required'),
  frequency: z.enum([
    'Monthly',
    'Quarterly',
    'SemiAnnual',
    'Annual',
    'OneTime',
    'Custom',
  ]),
  customFrequency: z.number().optional(),
  invoiceTiming: z.enum(['Immediate', 'Upfront', 'Net30', 'Net60', 'Custom']),
  customInvoiceTiming: z.number().optional(),
  leadToCashLag: z.number().min(0, 'Lead to cash lag must be positive'),
  escalatorPct: z
    .string()
    .optional()
    .refine(
      (val) =>
        val === undefined ||
        val === '' ||
        (!isNaN(Number(val)) && Number(val) >= 0),
      {
        message: 'Escalator percentage must be a valid positive number',
      }
    ),
});

export type PricingPlanFormData = z.infer<typeof pricingPlanSchema>;

// Product with Pricing Plans Schema (for nested form)
export const productWithPricingPlansSchema = z.object({
  product: productSchema,
  pricingPlans: z
    .array(pricingPlanSchema)
    .min(1, 'At least one pricing plan is required'),
});

export type ProductWithPricingPlansFormData = z.infer<
  typeof productWithPricingPlansSchema
>;

// Client Group Schema
export const clientGroupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  startingCustomers: z.number().min(1, 'Starting customers must be at least 1'),
  churnRate: z
    .string()
    .min(1, 'Churn rate is required')
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 1,
      {
        message: 'Churn rate must be between 0 and 1',
      }
    ),
  acvGrowthRate: z
    .string()
    .min(1, 'ACV growth rate is required')
    .refine((val) => !isNaN(Number(val)) && Number(val) >= -1, {
      message: 'ACV growth rate must be greater than -1',
    }),
  firstPurchaseMix: z.record(z.string(), z.number()).optional().default({}),
});

export type ClientGroupFormData = z.infer<typeof clientGroupSchema>;

// Conversion Rule Schema
export const conversionRuleSchema = z.object({
  clientGroupId: z.number().min(1, 'Client group is required'),
  fromProductId: z.number().min(1, 'From product is required'),
  toProductId: z.number().min(1, 'To product is required'),
  afterMonths: z.number().min(1, 'After months must be at least 1'),
  probability: z
    .string()
    .min(1, 'Probability is required')
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 1,
      {
        message: 'Probability must be between 0 and 1',
      }
    ),
});

export type ConversionRuleFormData = z.infer<typeof conversionRuleSchema>;
