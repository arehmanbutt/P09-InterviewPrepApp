import { auth } from "@clerk/nextjs/server";

export async function getAuthUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

export interface AuthContext {
  userId: string | null;
  orgId: string | null;
  orgRole: string | null;
  orgSlug: string | null;
}

export async function getAuthContext(): Promise<AuthContext> {
  const { userId, orgId, orgRole, orgSlug } = await auth();
  return {
    userId: userId ?? null,
    orgId: orgId ?? null,
    orgRole: orgRole ?? null,
    orgSlug: orgSlug ?? null,
  };
}
