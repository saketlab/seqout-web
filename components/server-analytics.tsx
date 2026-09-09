"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

const keys = new Set([
  "q", "query", "organism", "tissue", "disease", "cell_type", "db",
  "library_strategy", "platform", "country", "assay", "sortby", "order",
]);

export default function ServerAnalytics() {
  const pathname = usePathname();
  const params = useSearchParams();
  const last = useRef("");
  const query = params.toString();

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_INTERNAL_ANALYTICS !== "1") return;
    if (pathname.startsWith("/internal/")) return;
    const identity = `${pathname}?${query}`;
    if (last.current === identity) return;
    const timer = setTimeout(() => {
      last.current = identity;
      const filters: Record<string, string> = {};
      for (const [key, value] of new URLSearchParams(query)) {
        if (keys.has(key)) filters[key] = value.slice(0, 512);
      }
      const body = JSON.stringify({ path: pathname, filters });
      if (new TextEncoder().encode(body).length > 4096) return;
      void fetch("/api/telemetry/page", {
        method: "POST", body, keepalive: true,
        headers: { "Content-Type": "text/plain" },
      }).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [pathname, query]);

  return null;
}
