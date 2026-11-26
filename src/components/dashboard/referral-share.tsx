"use client";

import { MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";

export function ReferralShare({ code, siteUrl, compact }: { code: string; siteUrl: string; compact?: boolean }) {
  const text = `I save for my foodstuff monthly with Luxuriate Foodstuff. Join with my referral code ${code}: ${siteUrl}`;
  return (
    <div className={compact ? "flex flex-wrap gap-2" : "flex flex-col gap-2 sm:flex-row"}>
      <CopyButton value={code} label="Copy code" />
      <Button asChild variant="secondary" size="sm">
        <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
          <MessageCircle className="text-[#25D366]" /> Share on WhatsApp
        </a>
      </Button>
      {!compact && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (navigator.share) navigator.share({ title: "Luxuriate Foodstuff", text }).catch(() => {});
            else navigator.clipboard.writeText(text);
          }}
        >
          <Share2 /> More
        </Button>
      )}
    </div>
  );
}
