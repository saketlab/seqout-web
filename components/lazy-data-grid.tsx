"use client";

import type { AgGridReactProps } from "ag-grid-react";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactElement } from "react";

// Preserve row typing across next/dynamic's non-generic component boundary.
const DataGrid = dynamic(() => import("./data-grid-runtime"), {
  ssr: false,
}) as <TData>(props: AgGridReactProps<TData>) => ReactElement;

/** Keep the grid bundle and CSS off the initial path for below-fold tables. */
export function AgGridReact<TData>(props: AgGridReactProps<TData>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} style={{ height: "100%", width: "100%" }}>
      {visible && <DataGrid {...props} />}
    </div>
  );
}
