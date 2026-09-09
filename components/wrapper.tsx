"use client";
import { SearchQueryProvider } from "@/context/search_query";
import { Theme } from "@radix-ui/themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { ReactNode, useState } from "react";
import CommandPalette from "./command-palette";
import DynamicFavicon from "./dynamic-favicon";
import KeyboardNavigator from "./keyboard-navigator";
import PwaRegistrar from "./pwa-registrar";
import { ToastProvider } from "./toast-provider";

export default function Wrapper({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache data as fresh for a minute and disable refetch on window focus.
            // Individual queries can override these defaults.
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute={"class"} defaultTheme="dark">
        <DynamicFavicon />
        <PwaRegistrar />
        <SearchQueryProvider>
          {/* seqout-root-theme identifies the page Theme. Radix portals also create .radix-themes elements, so page-layout CSS requires the root marker. */}
          <Theme accentColor="indigo" className="seqout-root-theme">
            <ToastProvider>
              {children}
              <CommandPalette />
              <KeyboardNavigator />
            </ToastProvider>
          </Theme>
        </SearchQueryProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
