"use client";

import { hasFlag } from "country-flag-icons";
import Image from "next/image";
import { normalizeToAlpha2 } from "@/utils/country";
import type { CSSProperties } from "react";

export default function CountryFlagIcon({
  code,
  label,
  style,
}: {
  code: string | null | undefined;
  label?: string;
  style?: CSSProperties;
}) {
  const alpha2 = normalizeToAlpha2(code);
  if (!alpha2 || !hasFlag(alpha2)) return null;

  return (
    <Image
      src={`/flags/${alpha2}`}
      alt={label ?? alpha2}
      width={24}
      height={16}
      unoptimized
      style={{
        width: "1rem",
        height: "auto",
        borderRadius: "2px",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}
