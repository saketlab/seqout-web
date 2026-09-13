"use client";

import * as FlagIcons from "country-flag-icons/react/3x2";
import { normalizeToAlpha2 } from "@/utils/country";
import type { ReactElement, SVGProps } from "react";

type FlagComponent = (props: SVGProps<SVGSVGElement>) => ReactElement;

const flags = FlagIcons as Record<string, FlagComponent>;

export default function CountryFlagIcon({
  code,
  label,
  style,
}: {
  code: string | null | undefined;
  label?: string;
  style?: SVGProps<SVGSVGElement>["style"];
}) {
  const alpha2 = normalizeToAlpha2(code);
  if (!alpha2) return null;

  const Flag = flags[alpha2];
  if (!Flag) return null;

  return (
    <Flag
      role="img"
      aria-label={label ?? alpha2}
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
