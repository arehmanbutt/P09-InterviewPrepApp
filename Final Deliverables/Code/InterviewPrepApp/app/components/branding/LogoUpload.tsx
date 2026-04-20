"use client";

import { useState, useRef } from "react";
import { Upload, X } from "lucide-react";

interface LogoUploadProps {
  currentLogo: string | null;
  onUpload: (dataUrl: string) => void;
  onRemove: () => void;
}

const MAX_SIZE = 100 * 1024; // 100KB

export default function LogoUpload({ currentLogo, onUpload, onRemove }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (file: File) => {
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("Logo must be under 100KB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      onUpload(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-300">Company Logo</label>
      {currentLogo ? (
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentLogo}
              alt="Company logo"
              className="max-h-14 max-w-14 object-contain"
            />
          </div>
          <button
            onClick={onRemove}
            className="flex items-center gap-1 text-sm text-red-400 transition hover:text-red-300"
          >
            <X size={14} />
            Remove
          </button>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 bg-white/5 px-4 py-6 text-sm text-gray-400 transition hover:border-white/30 hover:bg-white/10"
        >
          <Upload size={18} />
          Upload logo (PNG, SVG, max 100KB)
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
}
