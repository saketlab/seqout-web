"use client";

import {
  AXEL_DEFAULT_CONNECTIONS,
  AXEL_MAX_CONNECTIONS,
} from "@/utils/downloadScript";
import { Badge, Flex, SegmentedControl, Slider, Text } from "@radix-ui/themes";
import { useState } from "react";

/** Slider for axel's -n. Reports on release, so dragging does not rebuild
 *  the script on every step. */
export function AxelSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (connections: number) => void;
}) {
  const [n, setN] = useState(value);
  return (
    <Flex align="center" gap="2" ml="auto">
      <Slider
        size="1"
        min={2}
        max={AXEL_MAX_CONNECTIONS}
        step={1}
        value={[n]}
        onValueChange={([v]) => setN(v)}
        onValueCommit={([v]) => onChange(v)}
        aria-label="axel connections per file"
        style={{ width: "7rem" }}
      />
      <Text size="2" style={{ whiteSpace: "nowrap" }}>
        {n} connections
      </Text>
    </Flex>
  );
}

export const FasterBadge = () => (
  <Badge size="1" color="green" variant="soft" className="faster-badge">
    Faster
  </Badge>
);

/** curl/axel tabs + connection slider for a download-script dialog.
 *  `value` is axel's -n, or null when axel is off. */
export function AxelControls({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (connections: number | null) => void;
}) {
  // Remembers the slider position while the curl tab is active.
  const [last, setLast] = useState(value ?? AXEL_DEFAULT_CONNECTIONS);
  return (
    <Flex align="center" justify="between" gap="3" mb="3" wrap="wrap">
      <SegmentedControl.Root
        size="1"
        value={value === null ? "curl" : "axel"}
        onValueChange={(v) => onChange(v === "axel" ? last : null)}
      >
        <SegmentedControl.Item value="curl">curl</SegmentedControl.Item>
        <SegmentedControl.Item value="axel">
          <Flex align="center" gap="2">
            axel
            <FasterBadge />
          </Flex>
        </SegmentedControl.Item>
      </SegmentedControl.Root>
      {value !== null && (
        <AxelSlider
          value={value}
          onChange={(v) => {
            setLast(v);
            onChange(v);
          }}
        />
      )}
    </Flex>
  );
}
