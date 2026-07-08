"use client";

import Link from "next/link";
import { MapPin, MoreVertical } from "lucide-react";
import type { RecentOuting } from "@/hooks/useOutings";
import { formatRelativeTime } from "@/lib/time";

type RecentOutingCardProps = {
  outing: RecentOuting;
  onOpenMenu: (outing: RecentOuting) => void;
};

export default function RecentOutingCard({ outing, onOpenMenu }: RecentOutingCardProps) {
  return (
    <div className="relative rounded-lg border border-border bg-card shadow-sm">
      <Link
        href={`/outing/${outing.date}`}
        className="flex items-center gap-3 p-4 pr-10 transition-transform active:scale-[0.98]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
          <MapPin className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-foreground">{outing.title}</span>
          <span className="block truncate text-xs text-muted-foreground">
            마지막 저장: {formatRelativeTime(outing.updatedAt, Date.now())} · 장소 {outing.placeCount}곳
          </span>
        </span>
      </Link>

      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          onOpenMenu(outing);
        }}
        aria-label={`${outing.title} 더보기`}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted active:scale-95"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
    </div>
  );
}
