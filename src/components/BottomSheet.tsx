"use client";

import { ReactNode } from "react";
import { Sheet } from "@/components/ui/sheet";

type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
};

export default function BottomSheet({ open, onOpenChange, title, children }: BottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title}>
      {children}
    </Sheet>
  );
}
