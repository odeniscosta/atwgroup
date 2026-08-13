export const roles = ["ADMIN", "SELLER", "CUSTOMER", "SUPPORT", "MANAGER"] as const;
export type Role = (typeof roles)[number];

export const permissions: Record<Role, readonly string[]> = {
  ADMIN: ["admin:read", "admin:write", "seller:approve", "catalog:write", "orders:write"],
  MANAGER: ["admin:read", "seller:read", "catalog:write", "orders:write"],
  SUPPORT: ["orders:read", "customer:read", "review:moderate"],
  SELLER: ["store:read", "store:write", "products:write", "orders:read", "reviews:read"],
  CUSTOMER: ["profile:write", "orders:read", "wishlist:write", "reviews:write"],
};

export function hasPermission(role: Role, permission: string) {
  return permissions[role].includes(permission);
}
