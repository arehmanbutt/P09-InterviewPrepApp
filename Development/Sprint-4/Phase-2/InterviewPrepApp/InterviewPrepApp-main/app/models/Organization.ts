import mongoose, { Schema } from "mongoose";
import type { Document } from "mongoose";

export interface IBranding {
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  companyName: string | null;
}

export interface IOrganization extends Document {
  clerkOrgId: string;
  plan: "free" | "business";
  seatLimit: number;
  branding: IBranding;
  usageStats: {
    interviewsThisMonth: number;
    lastResetAt: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const brandingSchema = new Schema<IBranding>(
  {
    logoUrl: { type: String, default: null },
    primaryColor: { type: String, default: null },
    secondaryColor: { type: String, default: null },
    companyName: { type: String, default: null },
  },
  { _id: false },
);

const organizationSchema = new Schema<IOrganization>(
  {
    clerkOrgId: { type: String, required: true, unique: true },
    plan: {
      type: String,
      enum: ["free", "business"],
      default: "free",
    },
    seatLimit: { type: Number, default: 5 },
    branding: { type: brandingSchema, default: () => ({}) },
    usageStats: {
      type: new Schema(
        {
          interviewsThisMonth: { type: Number, default: 0 },
          lastResetAt: { type: Date, default: Date.now },
        },
        { _id: false },
      ),
      default: () => ({}),
    },
  },
  { timestamps: true },
);

const Organization =
  (mongoose.models.Organization as mongoose.Model<IOrganization>) ||
  mongoose.model<IOrganization>("Organization", organizationSchema);

export default Organization;
