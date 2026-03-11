export type Language = "python" | "cpp" | "javascript";

export interface Example {
  input: string;
  output: string;
}

export interface TestResult {
  passed: boolean;
  input: string;
  output: string;
  expected: string;
  time: string;
  memory?: number;
  error?: string | null;
}

export interface Problem {
  id: string;
  title: string;
  titleSlug?: string;
  questionId?: string;
  tags: string[];
  difficulty_bucket: string;
  time_limit?: string | null;
  memory_limit?: string | null;
  stmt_body: string;
  examples: Example[];
  code_templates?: { javascript?: string; python?: string; cpp?: string };
  io_schema?: {
    input_type?: string;
    output_type?: string;
    input_format?: string;
    output_format?: string;
  };
  has_t: boolean;
  is_interactive: boolean;
  example_type: "batch" | "individual";
  solutions?: { python?: string; cpp?: string; javascript?: string };
  hidden_tests?: { input: string; output: string }[];
  meta_data?: { name: string; params: { name: string; type: string }[]; return: { type: string } };
  driver_code?: { python?: string; javascript?: string; cpp?: string };
  problem_format?: "leetcode" | "competitive";
}

export interface ExecuteResult {
  passed: boolean;
  input: string;
  output: string;
  expected: string;
  time: string;
  memory?: number;
  error: string | null;
  hidden: boolean;
}

export interface HiddenResults {
  passed: number;
  total: number;
}
