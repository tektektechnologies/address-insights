import type { Metadata } from "next";
import { Suspense } from "react";

import { InsightsDashboard } from "@/src/components/InsightsDashboard";

export const metadata: Metadata = {
  title: "Insights | Address Insights",
  description:
    "Neighborhood amenity insights with heuristic walking, driving, and urban scores for a selected address.",
};

function InsightsFallback() {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-[var(--canvas)] px-5 py-16 text-[var(--ink-muted)]">
      <p role="status">Loading insights…</p>
    </div>
  );
}

export default function InsightsPage() {
  return (
    <Suspense fallback={<InsightsFallback />}>
      <InsightsDashboard />
    </Suspense>
  );
}
