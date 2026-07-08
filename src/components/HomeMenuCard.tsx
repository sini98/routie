import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

type HomeMenuCardProps = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

export default function HomeMenuCard({ href, icon: Icon, title, description }: HomeMenuCardProps) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-lg border border-border bg-card p-5 shadow-sm transition-transform active:scale-[0.98]"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
        <Icon className="h-6 w-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-semibold text-foreground">{title}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}
