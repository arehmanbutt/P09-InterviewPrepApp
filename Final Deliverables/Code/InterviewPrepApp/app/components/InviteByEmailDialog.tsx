"use client";

import { useState } from "react";
import { Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAILS = 50;

function parseEmails(raw: string): string[] {
  const parts = raw
    .split(/[\n,]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => EMAIL_REGEX.test(e));
  return [...new Set(parts)];
}

interface InviteByEmailDialogProps {
  interviewId: string;
  interviewTitle: string;
}

export function InviteByEmailDialog({ interviewId, interviewTitle }: InviteByEmailDialogProps) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);

  const emails = parseEmails(value);
  const isOverLimit = emails.length > MAX_EMAILS;
  const hasValidEmails = emails.length > 0 && !isOverLimit;

  const handleSubmit = async () => {
    if (!hasValidEmails) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/interviews/${interviewId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails }),
      });

      const data = (await res.json()) as { sent?: number; failed?: string[]; error?: string };

      if (!res.ok) {
        toast.error(data.error ?? "Failed to send invitations");
        return;
      }

      const { sent = 0, failed = [] } = data;

      if (sent > 0 && failed.length === 0) {
        toast.success(`${sent} invitation${sent !== 1 ? "s" : ""} sent successfully`);
        setValue("");
        setOpen(false);
      } else if (sent > 0 && failed.length > 0) {
        toast.warning(`${sent} sent, ${failed.length} failed: ${failed.join(", ")}`);
        // Keep dialog open so user can retry failed ones
        setValue(failed.join("\n"));
      } else {
        toast.error(`All invitations failed. Please try again.`);
      }
    } catch {
      toast.error("Network error — please check your connection and try again");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!loading) {
      setOpen(next);
      if (!next) setValue("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="secondary" size="sm" className="gap-1.5">
          <Mail className="h-3.5 w-3.5" />
          Invite by Email
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Candidates by Email</DialogTitle>
          <DialogDescription>
            Send an interview invitation for{" "}
            <span className="font-medium text-foreground">{interviewTitle}</span>. Enter one or more
            email addresses separated by commas or new lines.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={"john@example.com, jane@example.com"}
            rows={6}
            disabled={loading}
            className={[
              "w-full resize-none rounded-lg border bg-background px-3 py-2.5",
              "text-sm text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isOverLimit ? "border-destructive focus:ring-destructive" : "border-border",
            ].join(" ")}
          />

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {emails.length > 0 ? (
                <>
                  <span
                    className={
                      isOverLimit ? "text-destructive font-medium" : "text-foreground font-medium"
                    }
                  >
                    {emails.length}
                  </span>{" "}
                  valid address{emails.length !== 1 ? "es" : ""} detected
                  {isOverLimit && (
                    <span className="text-destructive"> — maximum is {MAX_EMAILS}</span>
                  )}
                </>
              ) : (
                "No valid addresses yet"
              )}
            </span>
            <span>max {MAX_EMAILS}</span>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!hasValidEmails || loading}
            className="gap-1.5"
          >
            {loading ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                Send {emails.length > 0 ? `${emails.length} ` : ""}Invitation
                {emails.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
