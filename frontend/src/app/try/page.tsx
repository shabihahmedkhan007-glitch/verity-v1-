import type { Metadata } from "next";
import { TryView } from "@/components/sections/try/TryView";

export const metadata: Metadata = { title: "Try live" };

export default function TryPage() {
  return <TryView />;
}
