"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/app/components/ui/dialog";

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
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Interview</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="edit-title" className="block text-sm font-medium text-foreground mb-1">
              Job Title
            </label>
            <Input
              id="edit-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="edit-company"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Company
            </label>
            <Input
              id="edit-company"
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="edit-description"
              className="block text-sm font-medium text-foreground mb-1"
            >
              Job Description
            </label>
            <textarea
              id="edit-description"
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none transition-colors"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
