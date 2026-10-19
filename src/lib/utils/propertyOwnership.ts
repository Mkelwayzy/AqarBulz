type PropertyOwnershipDetails = {
  advertiserId?: string | null;
  userId?: string | null;
  ownerId?: string | null;
  advertiser?: { id?: string | null } | null;
};

export function isPropertyOwnedByUser(
  property: PropertyOwnershipDetails,
  userId?: string | null
): boolean {
  return Boolean(
    userId &&
      [property.advertiserId, property.advertiser?.id, property.userId, property.ownerId].includes(userId)
  );
}
