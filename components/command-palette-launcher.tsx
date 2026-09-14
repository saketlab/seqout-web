"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

const CommandPalette = dynamic(() => import("./command-palette"), {
  ssr: false,
});

export default function CommandPaletteLauncher() {
  const [open, setOpen] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const restoreFocus = useCallback((event: Event) => {
    event.preventDefault();
    if (returnFocusRef.current?.isConnected) returnFocusRef.current.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) {
        return;
      }
      event.preventDefault();
      if (!open) {
        returnFocusRef.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
      }
      setOpen((previous) => !previous);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Mounts the dialog lazily on first open; unmounting on close resets its query and selection.
  return open ? (
    <CommandPalette
      open={open}
      onOpenChange={setOpen}
      onCloseAutoFocus={restoreFocus}
    />
  ) : null;
}
