"use client";

import { Download } from "lucide-react";
import { toast } from "sonner";
import { useSubscription } from "app/hooks/useSubscription";
import { Button } from "@/app/components/ui/button";

interface DownloadReportButtonProps {
  reportUrl: string;
}

export default function DownloadReportButton({ reportUrl }: DownloadReportButtonProps) {
  const { isFree } = useSubscription();

  const handleClick = (e: React.MouseEvent) => {
    if (isFree) {
      e.preventDefault();
      toast.error("PDF download is available to Pro users only. Upgrade to access reports.");
    }
  };

  return (
    <Button asChild size="sm">
      <a href={reportUrl} target="_blank" onClick={handleClick}>
        <Download className="h-4 w-4" />
        Download PDF
      </a>
    </Button>
  );
}
