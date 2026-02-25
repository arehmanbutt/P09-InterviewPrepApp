"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";

interface EditInterviewModalProps {
  interview: { _id: string; title: string; company: string; description: string };
  onClose: () => void;
  onSaved: (updated: { _id: string; title: string; company: string; description: string }) => void;
}

export default function EditInterviewModal({
  interview,
  onClose,
  onSaved,
}: EditInterviewModalProps) {
  const [title, setTitle] = useState(interview.title);
  const [company, setCompany] = useState(interview.company);
  const [description, setDescription] = useState(interview.description);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      const res = await fetch(`/api/interviews/${interview._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, company, description }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save changes");
      }

      onSaved({ _id: interview._id, title, company, description });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-modal-title"
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0c0c0c] p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 id="edit-modal-title" className="text-xl font-bold text-white">
            Edit Interview
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-title" className="block text-sm font-medium text-gray-300 mb-1">
              Job Title
            </label>
            <input
              id="edit-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-[#3ecf8e] focus:outline-none focus:ring-1 focus:ring-[#3ecf8e]"
            />
          </div>

          <div>
            <label htmlFor="edit-company" className="block text-sm font-medium text-gray-300 mb-1">
              Company
            </label>
            <input
              id="edit-company"
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-[#3ecf8e] focus:outline-none focus:ring-1 focus:ring-[#3ecf8e]"
            />
          </div>

          <div>
            <label
              htmlFor="edit-description"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Job Description
            </label>
            <textarea
              id="edit-description"
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-gray-500 focus:border-[#3ecf8e] focus:outline-none focus:ring-1 focus:ring-[#3ecf8e] resize-none"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-400 transition hover:bg-white/10 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-[#3ecf8e] px-5 py-2 text-sm font-medium text-black transition hover:bg-[#33b87a] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
