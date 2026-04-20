"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";

interface JoinInfo {
  status: "canJoin" | "resume" | "completed";
  sessionId?: string;
  interviewId?: string;
  title?: string;
  company?: string;
  description?: string;
  totalQuestions?: number;
  error?: string;
}

export default function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [info, setInfo] = useState<JoinInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/interviews/join/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          const errorMsg = (data.error as string | undefined) ?? "Failed to load interview";
          setError(errorMsg);
          toast.error(errorMsg);
          return;
        }
        setInfo(data);
      })
      .catch(() => {
        setError("Failed to load interview");
        toast.error("Failed to load interview");
      })
      .finally(() => setLoading(false));
  }, [token]);

  const handleJoin = async () => {
    setJoining(true);
    setError("");
    try {
      const res = await fetch(`/api/interviews/join/${token}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = (data.error as string | undefined) ?? "Failed to join interview";
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }
      toast.success("Joining interview...");
      router.push(`/join/${token}/session/${data.sessionId}`);
    } catch {
      setError("Failed to join interview");
      toast.error("Failed to join interview");
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="max-w-md mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-8 text-center border-destructive/30 bg-destructive/5">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">Unable to Join</h1>
            <p className="text-muted-foreground">{error}</p>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (!info) return null;

  if (info.status === "completed") {
    return (
      <div className="max-w-md mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-accent mx-auto mb-4" />
            <h1 className="text-xl font-bold text-foreground mb-2">Already Completed</h1>
            <p className="text-muted-foreground mb-6">You have already completed this interview.</p>
            <Button onClick={() => router.push(`/join/${token}/feedback/${info.sessionId}`)}>
              View Feedback
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (info.status === "resume") {
    return (
      <div className="max-w-md mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="p-8 text-center">
            <h1 className="text-xl font-bold text-foreground mb-2">Interview In Progress</h1>
            <p className="text-muted-foreground mb-6">
              You have an interview session in progress. Resume where you left off.
            </p>
            <Button
              variant="secondary"
              className="text-yellow-500"
              onClick={() => router.push(`/join/${token}/session/${info.sessionId}`)}
            >
              Resume Interview
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  // canJoin
  return (
    <div className="max-w-md mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">{info.title}</h1>
          <p className="text-muted-foreground mb-5">{info.company}</p>

          {info.description && (
            <p className="text-sm text-foreground/80 mb-5 line-clamp-4 leading-relaxed">
              {info.description}
            </p>
          )}

          <div className="rounded-lg bg-muted px-4 py-3 mb-6">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{info.totalQuestions}</span> questions
              prepared
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 mb-4">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}

          <Button size="lg" className="w-full" onClick={handleJoin} disabled={joining}>
            {joining && <Loader2 className="h-4 w-4 animate-spin" />}
            {joining ? "Joining..." : "Start Interview"}
            {!joining && <ArrowRight className="h-4 w-4" />}
          </Button>
        </Card>
      </motion.div>
    </div>
  );
}
