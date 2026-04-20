/**
 * One-time backfill script — syncs all Clerk users into MongoDB.
 *
 * Run this for existing users who signed up before the Clerk webhook was
 * configured, or to repair any gaps in the User collection.
 *
 * Usage: npx tsx scripts/sync-clerk-users.ts
 *
 * Requirements: CLERK_SECRET_KEY and MONGODB_URI must be set in .env.local
 */

import { readFileSync } from "fs";
import { join } from "path";
import mongoose from "mongoose";

// ---------------------------------------------------------------------------
// Load .env.local (same pattern as other scripts in this repo)
// ---------------------------------------------------------------------------
function loadEnvFile(filePath: string) {
  try {
    const content = readFileSync(filePath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // file not found — rely on environment
  }
}

loadEnvFile(join(process.cwd(), ".env.local"));
loadEnvFile(join(process.cwd(), ".env"));

// ---------------------------------------------------------------------------
// Minimal User model (mirrors app/models/User.ts)
// ---------------------------------------------------------------------------
const UserSchema = new mongoose.Schema(
  {
    clerkId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    subscription: {
      tier: { type: String, default: "free" },
      status: { type: String, default: "active" },
    },
  },
  { timestamps: true, strict: false },
);

const User =
  (mongoose.models.User as mongoose.Model<mongoose.Document>) || mongoose.model("User", UserSchema);

// ---------------------------------------------------------------------------
// Clerk paginated user fetcher
// ---------------------------------------------------------------------------
async function fetchAllClerkUsers(): Promise<Array<{ id: string; email: string }>> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error("CLERK_SECRET_KEY is not set in environment");
  }

  const users: Array<{ id: string; email: string }> = [];
  let offset = 0;
  const limit = 500;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(`https://api.clerk.com/v1/users?limit=${limit}&offset=${offset}`, {
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Clerk API error ${res.status}: ${text}`);
    }

    const page: Array<{
      id: string;
      email_addresses: Array<{ email_address: string }>;
    }> = await res.json();

    if (!Array.isArray(page) || page.length === 0) {
      hasMore = false;
      break;
    }

    for (const user of page) {
      const email = user.email_addresses?.[0]?.email_address ?? `${user.id}@unknown`;
      users.push({ id: user.id, email });
    }

    if (page.length < limit) break;
    offset += limit;
  }

  return users;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const mongoUri = process.env.MONGO_URL;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is not set in environment");
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("Connected.\n");

  console.log("Fetching users from Clerk...");
  const clerkUsers = await fetchAllClerkUsers();
  console.log(`Found ${clerkUsers.length} Clerk users.\n`);

  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const { id, email } of clerkUsers) {
    try {
      const existing = await User.findOne({ clerkId: id });
      if (existing) {
        // Only update email if it changed — don't overwrite subscription data
        if (existing.get("email") !== email) {
          await User.updateOne({ clerkId: id }, { email });
          updated++;
          console.log(`  Updated: ${id} (${email})`);
        }
      } else {
        await User.create({
          clerkId: id,
          email,
          subscription: { tier: "free", status: "active" },
        });
        created++;
        console.log(`  Created: ${id} (${email})`);
      }
    } catch (err) {
      errors++;
      console.error(`  Error for ${id}:`, err);
    }
  }

  console.log("\n--- Done ---");
  console.log(`  Created : ${created}`);
  console.log(`  Updated : ${updated}`);
  console.log(`  Errors  : ${errors}`);
  console.log(`  Total   : ${clerkUsers.length}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
