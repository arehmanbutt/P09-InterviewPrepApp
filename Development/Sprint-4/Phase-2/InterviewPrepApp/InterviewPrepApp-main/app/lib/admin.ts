import { getAuthUserId } from "app/lib/auth";

const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

export async function isAdmin(): Promise<boolean> {
  const userId = await getAuthUserId();
  if (!userId) return false;
  return ADMIN_USER_IDS.includes(userId);
}

export async function requireAdmin(): Promise<string> {
  const userId = await getAuthUserId();
  if (!userId) throw new Error("Unauthorized");
  if (!ADMIN_USER_IDS.includes(userId)) throw new Error("Forbidden");
  return userId;
}
