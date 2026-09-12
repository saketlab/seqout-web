import {
  BarChartIcon,
  CodeIcon,
  DownloadIcon,
  InfoCircledIcon,
  KeyboardIcon,
  MagicWandIcon,
  SewingPinIcon,
} from "@radix-ui/react-icons";
import type { ReactNode } from "react";
import { createElement } from "react";

/** Shared global navigation items, ordered left-to-right on desktop. */
export type NavItem = {
  label: string;
  href: string;
  icon: ReactNode;
  external?: boolean;
};

export const NAV_ITEMS: readonly NavItem[] = [
  {
    label: "About",
    href: "/faq",
    icon: createElement(InfoCircledIcon),
  },
  {
    label: "API",
    href: "/api-docs",
    icon: createElement(CodeIcon),
  },
  {
    label: "CLI & Packages",
    href: "/cli",
    external: true,
    icon: createElement(KeyboardIcon),
  },
  {
    label: "Stats",
    href: "/stats",
    icon: createElement(BarChartIcon),
  },
  {
    label: "Data",
    href: "/data",
    icon: createElement(DownloadIcon),
  },
  {
    label: "Map",
    href: "/map",
    icon: createElement(SewingPinIcon),
  },
  {
    label: "Use with LLMs",
    href: "/mcp",
    icon: createElement(MagicWandIcon),
  },
] as const;
