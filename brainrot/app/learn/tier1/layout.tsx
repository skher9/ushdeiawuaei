"use client";
import { XPProvider } from "@/lib/xpContext";

export default function Tier1Layout({ children }: { children: React.ReactNode }) {
  return <XPProvider>{children}</XPProvider>;
}
