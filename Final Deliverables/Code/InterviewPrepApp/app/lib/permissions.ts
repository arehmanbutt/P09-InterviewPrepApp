/**
 * Role-based permission helpers for Clerk Organizations.
 *
 * Clerk org roles (configured in Clerk dashboard):
 *   - org:admin      → full access, manage team, settings
 *   - org:member     → create/view interviews (interviewer)
 *   - org:viewer     → view completed interviews only (custom role, add in Clerk)
 *
 * Note: Clerk's default roles are "org:admin" and "org:member".
 * Add "org:viewer" as a custom role in the Clerk dashboard if needed.
 */

type OrgRole = string | null;

/** Can create interviews and run them */
export function canCreateInterview(orgRole: OrgRole): boolean {
  return orgRole === "org:admin" || orgRole === "org:member";
}

/** Can view all interviews in the org */
export function canViewInterviews(orgRole: OrgRole): boolean {
  return orgRole === "org:admin" || orgRole === "org:member" || orgRole === "org:viewer";
}

/** Can manage team settings, members, and branding */
export function canManageTeam(orgRole: OrgRole): boolean {
  return orgRole === "org:admin";
}

/** Can view analytics dashboard */
export function canViewAnalytics(orgRole: OrgRole): boolean {
  return orgRole === "org:admin" || orgRole === "org:member";
}

/** Can delete interviews */
export function canDeleteInterview(orgRole: OrgRole): boolean {
  return orgRole === "org:admin";
}

/** Can export candidate data (CSV/PDF) */
export function canExportData(orgRole: OrgRole): boolean {
  return orgRole === "org:admin" || orgRole === "org:member";
}
