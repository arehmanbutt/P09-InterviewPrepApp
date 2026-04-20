// Run: npx tsx app/lib/generateEncryptionKey.ts
import { randomBytes } from "crypto";
console.log("ENCRYPTION_KEY=" + randomBytes(32).toString("hex"));
