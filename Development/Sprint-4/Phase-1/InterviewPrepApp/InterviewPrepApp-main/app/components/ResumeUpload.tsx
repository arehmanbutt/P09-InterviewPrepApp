"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileText, X, Loader2, CheckCircle } from "lucide-react";
import type { ResumeData } from "app/lib/resumeParser";

interface ResumeUploadProps {
  onResumeData: (data: ResumeData | null) => void;
  disabled?: boolean;
}

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ACCEPTED_EXTENSIONS = ".pdf,.docx";

export default function ResumeUpload({ onResumeData, disabled }: ResumeUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<ResumeData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback(
    async (selectedFile: File) => {
      setError(null);
      setParsing(true);
      setParsedData(null);
      onResumeData(null);

      try {
        const formData = new FormData();
        formData.append("file", selectedFile);

        const response = await fetch("/api/parse-resume", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          let errorMessage = "Failed to parse resume";
          try {
            const data = await response.json();
            errorMessage = data.error ?? errorMessage;
          } catch {
            // Response wasn't JSON (e.g., HTML error page)
          }
          throw new Error(errorMessage);
        }

        const data = (await response.json()) as { resumeData: ResumeData };
        setParsedData(data.resumeData);
        onResumeData(data.resumeData);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to parse resume";
        setError(message);
        setFile(null);
      } finally {
        setParsing(false);
      }
    },
    [onResumeData],
  );

  const handleFileSelect = useCallback(
    (selectedFile: File | null) => {
      if (!selectedFile) return;

      if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
        setError("Please upload a PDF or DOCX file");
        return;
      }

      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }

      setFile(selectedFile);
      parseFile(selectedFile);
    },
    [parseFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled || parsing) return;

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFileSelect(droppedFile);
      }
    },
    [disabled, parsing, handleFileSelect],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled && !parsing) {
        setIsDragging(true);
      }
    },
    [disabled, parsing],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null;
    handleFileSelect(selectedFile);
  };

  const handleClear = () => {
    setFile(null);
    setParsedData(null);
    setError(null);
    onResumeData(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleClick = () => {
    if (!disabled && !parsing) {
      inputRef.current?.click();
    }
  };

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-300 mb-1">
        Resume / CV <span className="text-gray-500">(optional)</span>
      </label>
      <p className="text-xs text-gray-500 mb-3">
        Upload a resume to personalize interview questions based on the candidate&apos;s background.
      </p>

      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative rounded-xl border-2 border-dashed p-6 text-center transition cursor-pointer
          ${isDragging ? "border-[#3ecf8e] bg-[#3ecf8e]/10" : "border-white/20 bg-white/5 hover:border-white/40"}
          ${disabled || parsing ? "opacity-50 cursor-not-allowed" : ""}
          ${parsedData ? "border-[#3ecf8e]/50 bg-[#3ecf8e]/5" : ""}
          ${error ? "border-red-500/50 bg-red-500/5" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleInputChange}
          disabled={disabled || parsing}
          className="hidden"
        />

        {parsing ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={32} className="text-[#3ecf8e] animate-spin" />
            <p className="text-sm text-gray-400">Parsing resume...</p>
          </div>
        ) : parsedData ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle size={32} className="text-[#3ecf8e]" />
            <div className="flex items-center gap-2">
              <FileText size={16} className="text-[#3ecf8e]" />
              <span className="text-sm text-white">{file?.name}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="ml-2 rounded-full p-1 text-gray-400 transition hover:bg-white/10 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-xs text-[#3ecf8e]">
              Parsed: {parsedData.name}
              {parsedData.skills.length > 0 && ` • ${parsedData.skills.length} skills`}
              {parsedData.experience.length > 0 && ` • ${parsedData.experience.length} positions`}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={32} className={isDragging ? "text-[#3ecf8e]" : "text-gray-400"} />
            <p className="text-sm text-gray-400">
              <span className="text-[#3ecf8e] font-medium">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">PDF or DOCX (max 5MB)</p>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      {parsedData && (
        <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4">
          <h4 className="text-sm font-medium text-white mb-2">Extracted Information</h4>
          <div className="space-y-2 text-xs text-gray-400">
            {parsedData.skills.length > 0 && (
              <div>
                <span className="text-gray-300">Skills: </span>
                {parsedData.skills.slice(0, 8).join(", ")}
                {parsedData.skills.length > 8 && ` +${parsedData.skills.length - 8} more`}
              </div>
            )}
            {parsedData.experience.length > 0 && parsedData.experience[0] && (
              <div>
                <span className="text-gray-300">Latest Role: </span>
                {parsedData.experience[0].title} at {parsedData.experience[0].company}
              </div>
            )}
            {parsedData.projects.length > 0 && (
              <div>
                <span className="text-gray-300">Projects: </span>
                {parsedData.projects.length} listed
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
