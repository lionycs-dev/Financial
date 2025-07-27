'use server';

import { ProductRepository } from '@/lib/repositories/product-repository';
import { PricingPlanRepository } from '@/lib/repositories/pricing-plan-repository';
import { ClientGroupRepository } from '@/lib/repositories/client-group-repository';
import { ConversionRuleRepository } from '@/lib/repositories/conversion-rule-repository';

const productRepository = new ProductRepository();
const pricingPlanRepository = new PricingPlanRepository();
const clientGroupRepository = new ClientGroupRepository();
const conversionRuleRepository = new ConversionRuleRepository();

export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'product_to_stream' | 'product_to_pricing' | 'clientgroup_to_product' | 'product_conversion' | 'custom';
  properties: {
    weight?: string;
    probability?: string;
    afterMonths?: string;
    entryWeight?: string;
  };
}

export async function getAllRelationships(): Promise<Relationship[]> {
  const relationships: Relationship[] = [];

  try {
    // Get products with their revenue streams
    const products = await productRepository.getAll();
    
    // Create product -> stream relationships
    products.forEach((product) => {
      if (product.streamId) {  // Fixed: was checking product.revenueStream
        relationships.push({
          id: `stream-${product.streamId}-product-${product.id}`,
          sourceId: `stream-${product.streamId}`,
          targetId: `product-${product.id}`,
          type: 'product_to_stream',
          properties: {
            entryWeight: product.entryWeight,
          },
        });
      }
    });

    // Get client groups and create clientgroup -> product relationships
    const clientGroups = await clientGroupRepository.getAll();
    
    clientGroups.forEach((clientGroup) => {
      const purchaseMix = clientGroup.firstPurchaseMix as Record<string, number> || {};
      Object.entries(purchaseMix).forEach(([productId, weight]) => {
        relationships.push({
          id: `clientgroup-${clientGroup.id}-product-${productId}`,
          sourceId: `clientgroup-${clientGroup.id}`,
          targetId: `product-${productId}`,
          type: 'clientgroup_to_product',
          properties: {
            weight: weight.toString(),
          },
        });
      });
    });

    // Get conversion rules and create product -> product relationships
    const conversionRules = await conversionRuleRepository.getAll();
    
    conversionRules.forEach((rule) => {
      relationships.push({
        id: `conversion-${rule.id}-product-${rule.fromProductId}-product-${rule.toProductId}`,
        sourceId: `product-${rule.fromProductId}`,
        targetId: `product-${rule.toProductId}`,
        type: 'product_conversion',
        properties: {
          probability: rule.probability,
          afterMonths: rule.afterMonths.toString(),
        },
      });
    });

    // Get pricing plans and create product -> pricing relationships
    const pricingPlans = await pricingPlanRepository.getAll();
    
    pricingPlans.forEach((plan) => {
      relationships.push({
        id: `product-${plan.productId}-pricing-${plan.id}`,
        sourceId: `product-${plan.productId}`,
        targetId: `pricing-${plan.id}`,
        type: 'product_to_pricing',
        properties: {
          weight: plan.priceFormula,
        },
      });
    });

    return relationships;
  } catch (error) {
    console.error('Failed to get relationships:', error);
    return [];
  }
}

export async function updateProductStreamRelationship(
  productId: number,
  streamId: number,
  properties: { entryWeight: string }
) {
  try {
    await productRepository.update(productId, {
      streamId,
      entryWeight: properties.entryWeight,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to update product-stream relationship:', error);
    return { success: false, error: 'Failed to update relationship' };
  }
}

export async function removeProductStreamRelationship(productId: number) {
  try {
    await productRepository.update(productId, {
      streamId: undefined,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to remove product-stream relationship:', error);
    return { success: false, error: 'Failed to remove relationship' };
  }
}

export async function updateClientGroupProductRelationship(
  clientGroupId: number,
  productId: number,
  properties: { weight: string }
) {
  try {
    const clientGroup = await clientGroupRepository.getById(clientGroupId);
    if (!clientGroup) {
      return { success: false, error: 'Client group not found' };
    }

    // Update the firstPurchaseMix JSON field
    const currentMix = (clientGroup.firstPurchaseMix as Record<string, number>) || {};
    currentMix[productId.toString()] = parseFloat(properties.weight);

    await clientGroupRepository.update(clientGroupId, {
      firstPurchaseMix: currentMix,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to update client group-product relationship:', error);
    return { success: false, error: 'Failed to update relationship' };
  }
}

export async function removeClientGroupProductRelationship(
  clientGroupId: number,
  productId: number
) {
  try {
    const clientGroup = await clientGroupRepository.getById(clientGroupId);
    if (!clientGroup) {
      return { success: false, error: 'Client group not found' };
    }

    // Remove from firstPurchaseMix JSON field
    const currentMix = (clientGroup.firstPurchaseMix as Record<string, number>) || {};
    delete currentMix[productId.toString()];

    await clientGroupRepository.update(clientGroupId, {
      firstPurchaseMix: currentMix,
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to remove client group-product relationship:', error);
    return { success: false, error: 'Failed to remove relationship' };
  }
}

export async function createProductConversionRelationship(
  clientGroupId: number,
  fromProductId: number,
  toProductId: number,
  properties: { probability: string; afterMonths: string }
) {
  try {
    await conversionRuleRepository.create({
      clientGroupId,
      fromProductId,
      toProductId,
      probability: properties.probability,
      afterMonths: parseInt(properties.afterMonths),
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to create product conversion relationship:', error);
    return { success: false, error: 'Failed to create relationship' };
  }
}

export async function updateProductConversionRelationship(
  conversionRuleId: number,
  properties: { probability: string; afterMonths: string }
) {
  try {
    await conversionRuleRepository.update(conversionRuleId, {
      probability: properties.probability,
      afterMonths: parseInt(properties.afterMonths),
    });
    return { success: true };
  } catch (error) {
    console.error('Failed to update product conversion relationship:', error);
    return { success: false, error: 'Failed to update relationship' };
  }
}

export async function removeProductConversionRelationship(conversionRuleId: number) {
  try {
    await conversionRuleRepository.delete(conversionRuleId);
    return { success: true };
  } catch (error) {
    console.error('Failed to remove product conversion relationship:', error);
    return { success: false, error: 'Failed to remove relationship' };
  }
}