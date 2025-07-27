// Helper function to parse relationship IDs
export function parseRelationshipId(relationshipId: string) {
  const parts = relationshipId.split('-');
  
  if (parts.length >= 4) {
    const sourceType = parts[0];
    const sourceId = parts[1];
    const targetType = parts[2];
    const targetId = parts[3];
    
    return {
      sourceType,
      sourceId: parseInt(sourceId),
      targetType,
      targetId: parseInt(targetId),
    };
  }
  
  return null;
}