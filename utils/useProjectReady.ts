"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export const PROJECT_READY_EVENT = "seqout:project-ready";

/** keyed to the path so it resets on client navigation */
export function useProjectReady(): boolean {
  const pathname = usePathname();
  const [readyPathname, setReadyPathname] = useState<string | null>(null);

  useEffect(() => {
    const handleReady = () => setReadyPathname(pathname);
    window.addEventListener(PROJECT_READY_EVENT, handleReady);
    return () => window.removeEventListener(PROJECT_READY_EVENT, handleReady);
  }, [pathname]);

  return readyPathname === pathname;
}
