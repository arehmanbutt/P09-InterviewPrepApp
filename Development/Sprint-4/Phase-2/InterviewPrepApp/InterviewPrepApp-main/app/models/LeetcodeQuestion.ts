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

export interface ISolutions {
  python?: string;
  cpp?: string;
  javascript?: string;
}

export interface IHiddenTest {
  input: string;
  output: string; // empty string until Piston validation is run later
}

export interface IMetaData {
  name: string;
  params: { name: string; type: string }[];
  return: { type: string };
}

export interface IDriverCode {
  python?: string;
  javascript?: string;
  cpp?: string;
}

export interface IProblem extends Document {
  id: string;
  title: string;
  titleSlug?: string | null;
  questionId?: string | null;
  tags: string[];
  difficulty_bucket: string;
  time_limit?: string | null;
  memory_limit?: string | null;
  stmt_body: string;
  examples: IExample[];
  code_templates?: ICodeTemplates;
  io_schema?: IIOSchema;
  has_t: boolean;
  is_interactive: boolean;
  example_type: "batch" | "individual";
  solutions: ISolutions;
  hidden_tests: IHiddenTest[];
  meta_data?: IMetaData | null;
  driver_code?: IDriverCode;
  problem_format?: "leetcode" | "competitive";
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

const SolutionsSchema: Schema = new Schema(
  {
    python: { type: String, default: "" },
    cpp: { type: String, default: "" },
    javascript: { type: String, default: "" },
  },
  { _id: false },
);

const HiddenTestSchema: Schema = new Schema(
  {
    input: { type: String, required: true },
    output: { type: String, default: "" },
  },
  { _id: false },
);

const ProblemSchema: Schema = new Schema(
  {
    id: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    titleSlug: { type: String, default: null },
    questionId: { type: String, default: null },
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
    solutions: { type: SolutionsSchema, default: () => ({}) },
    hidden_tests: { type: [HiddenTestSchema], default: [] },
    meta_data: { type: Schema.Types.Mixed, default: null },
    driver_code: { type: Schema.Types.Mixed, default: null },
    problem_format: { type: String, enum: ["leetcode", "competitive"], default: "competitive" },
  },
  {
    collection: "problems",
    timestamps: false,
  },
);

export const Problem: Model<IProblem> = mongoose.models.Problem
  ? (mongoose.models.Problem as Model<IProblem>)
  : mongoose.model<IProblem>("Problem", ProblemSchema);
