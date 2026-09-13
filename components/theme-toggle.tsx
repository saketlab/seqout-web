"use client";
import { MoonIcon, SunIcon } from "@radix-ui/react-icons";
import { SegmentedControl } from "@radix-ui/themes";
import { useTheme } from "next-themes";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // next-themes sets the html class before paint, so `theme` is already correct on first client render.
  return (
    <SegmentedControl.Root
      value={theme ?? "dark"}
      onValueChange={setTheme}
      suppressHydrationWarning
    >
      <SegmentedControl.Item aria-label="light mode" value="light">
        <SunIcon style={{ marginTop: "5px" }} />
      </SegmentedControl.Item>
      <SegmentedControl.Item
        aria-label="dark mode"
        style={{ marginTop: "5px" }}
        value="dark"
      >
        <MoonIcon />
      </SegmentedControl.Item>
    </SegmentedControl.Root>
  );
}
