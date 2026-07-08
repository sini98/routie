import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn/ui 컨벤션: Tailwind 클래스를 조건부로 병합합니다. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
