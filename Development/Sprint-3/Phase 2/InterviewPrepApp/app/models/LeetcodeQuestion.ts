import mongoose, { Document, Schema, Model } from "mongoose";

export interface IExample {
  input: string;
  output: string;
}

export interface ICodeTemplates {
  javascript?: string;
  python?: string;
  cpp?: string;
}

export interface IIOSchema {
  input_type?: string;
  output_type?: string; // "string" | "float" | "yes_no"
  input_format?: string;
  output_format?: string;
}

export interface IProblem extends Document {
  id: string;
  title: string;
  tags: string[];
  difficulty_bucket: string;
  time_limit?: string | null;
  memory_limit?: string | null;
  stmt_body: string;
  examples: IExample[];
  code_templates?: ICodeTemplates;
  io_schema?: IIOSchema;
  has_t: boolean; // false if input has no leading t (test case count)
  is_interactive: boolean; // true if problem uses ?/! query-response format
  example_type: "batch" | "individual"; // batch = one object with all cases, individual = one object per case
}

const ExampleSchema: Schema = new Schema(
  {
    input: { type: String, default: "" },
    output: { type: String, default: "" },
  },
  { _id: false },
);

const CodeTemplatesSchema: Schema = new Schema(
  {
    javascript: { type: String, default: null },
    python: { type: String, default: null },
    cpp: { type: String, default: null },
  },
  { _id: false },
);

const IOSchemaSchema: Schema = new Schema(
  {
    input_type: { type: String, default: null },
    output_type: { type: String, default: "string" },
    input_format: { type: String, default: null },
    output_format: { type: String, default: null },
  },
  { _id: false },
);

const ProblemSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    tags: { type: [String], default: [] },
    difficulty_bucket: { type: String, required: true },
    time_limit: { type: String, default: null },
    memory_limit: { type: String, default: null },
    stmt_body: { type: String, required: true },
    examples: { type: [ExampleSchema], default: [] },
    code_templates: { type: CodeTemplatesSchema, default: () => ({}) },
    io_schema: { type: IOSchemaSchema, default: () => ({}) },
    has_t: { type: Boolean, default: true },
    is_interactive: { type: Boolean, default: false },
    example_type: { type: String, enum: ["batch", "individual"], default: "batch" },
  },
  {
    collection: "problems",
    timestamps: false,
  },
);

export const Problem: Model<IProblem> = mongoose.models.Problem
  ? (mongoose.models.Problem as Model<IProblem>)
  : mongoose.model<IProblem>("Problem", ProblemSchema);
