import mongoose, { Schema } from "mongoose";
import type { Document } from "mongoose";

export type SubscriptionTier = "free" | "pro" | "business";
export type SubscriptionStatus = "active" | "canceled" | "past_due" | "trialing" | "unpaid";
export type TeamRole = "owner" | "admin" | "member";

export interface ISubscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
}

export interface IUser extends Document {
  clerkId: string;
  email: string;
  stripeCustomerId: string | null;
  subscription: ISubscription;
  resumeData: Record<string, unknown> | null;
  jobTitle: string;
  bio: string;
  teamId: string | null;
  teamRole: TeamRole | null;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    tier: {
      type: String,
      enum: ["free", "pro", "business"],
      default: "free",
    },
    status: {
      type: String,
      enum: ["active", "canceled", "past_due", "trialing", "unpaid"],
      default: "active",
    },
    stripeSubscriptionId: { type: String, default: null },
    stripePriceId: { type: String, default: null },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
  },
  { _id: false },
);

const userSchema = new Schema<IUser>(
  {
    clerkId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    stripeCustomerId: { type: String },
    subscription: { type: subscriptionSchema, default: () => ({}) },
    resumeData: { type: Schema.Types.Mixed, default: null },
    jobTitle: { type: String, default: "" },
    bio: { type: String, default: "" },
    teamId: { type: String, default: null },
    teamRole: {
      type: String,
      enum: ["owner", "admin", "member"],
      default: null,
    },
  },
  { timestamps: true },
);

userSchema.index({ stripeCustomerId: 1 }, { unique: true, sparse: true });
userSchema.index({ teamId: 1 });

const User =
  (mongoose.models.User as mongoose.Model<IUser>) || mongoose.model<IUser>("User", userSchema);

export default User;
