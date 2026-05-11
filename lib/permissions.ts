export type OrgRole = "ADMIN" | "MEMBER";

export function canManageOrg(role: OrgRole | undefined): boolean {
  return role === "ADMIN";
}

export function canManageMasters(role: OrgRole | undefined): boolean {
  return role === "ADMIN";
}

export function canCloseNC(role: OrgRole | undefined): boolean {
  return role === "ADMIN";
}
