'use server';

import { revalidatePath } from 'next/cache';

interface RelationshipData {
  type: 'product_to_stream' | 'clientgroup_to_product' | 'product_conversion';
  sourceId: string;
  targetId: string;
  weight: string;
  probability?: string;
  afterMonths?: string;
}

// In-memory storage for relationships (in production, this would be in database)
const relationships = new Map<string, RelationshipData>();

export async function saveRelationship(data: RelationshipData) {
  try {
    const relationshipId = `${data.sourceId}-${data.targetId}`;
    relationships.set(relationshipId, data);
    
    // In a real app, you would save to database here
    console.log('Saved relationship:', data);
    
    revalidatePath('/dependency-graph');
    return { success: true, data };
  } catch (error) {
    console.error('Failed to save relationship:', error);
    return { success: false, error: 'Failed to save relationship' };
  }
}

export async function getRelationships() {
  try {
    return Array.from(relationships.values());
  } catch (error) {
    console.error('Failed to get relationships:', error);
    throw new Error('Failed to get relationships');
  }
}

export async function deleteRelationship(sourceId: string, targetId: string) {
  try {
    const relationshipId = `${sourceId}-${targetId}`;
    const deleted = relationships.delete(relationshipId);
    
    if (deleted) {
      revalidatePath('/dependency-graph');
      return { success: true };
    } else {
      return { success: false, error: 'Relationship not found' };
    }
  } catch (error) {
    console.error('Failed to delete relationship:', error);
    return { success: false, error: 'Failed to delete relationship' };
  }
}