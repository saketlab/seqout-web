"use client";

import { IconButton, TextField, Tooltip } from "@radix-ui/themes";

// URL param for case-sensitive matching; the search page sends it as case_sensitive=true.
export const CASE_PARAM = "case";

/** "Aa" toggle for the right end of a search TextField. */
export default function CaseSensitiveToggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  const label = `Match case (${on ? "on" : "off"})`;
  return (
    <TextField.Slot side="right">
      <Tooltip content={label}>
        <IconButton
          type="button"
          size="1"
          variant={on ? "solid" : "ghost"}
          color={on ? undefined : "gray"}
          aria-label="Match case"
          aria-pressed={on}
          onClick={() => onChange(!on)}
          style={{ fontWeight: 600, fontSize: "0.75rem" }}
        >
          Aa
        </IconButton>
      </Tooltip>
    </TextField.Slot>
  );
}
