"use client";

import { NAV_ITEMS, type NavItem } from "@/utils/nav";
import {
  GitHubLogoIcon,
  HamburgerMenuIcon,
  InfoCircledIcon,
} from "@radix-ui/react-icons";
import {
  Box,
  Button,
  DropdownMenu,
  Flex,
  IconButton,
  Link,
} from "@radix-ui/themes";
import { useRouter } from "next/navigation";
// import BulkMetaDialog from "./bulk-meta-dialog";
import {
  FirstVisitPing,
  HOW_SEARCH_WORKS_KEY,
  useFirstVisit,
} from "./first-visit-ping";
import GitHubButton from "./github-button";
import ThemeToggle from "./theme-toggle";

export default function Navabar() {
  const router = useRouter();
  const [howSearchWorksSeen, markHowSearchWorksSeen] =
    useFirstVisit(HOW_SEARCH_WORKS_KEY);

  const handleMenuSelect = (item: NavItem) => {
    if (item.external) {
      window.open(item.href, "_blank", "noopener,noreferrer");
      return;
    }

    router.push(item.href);
  };

  return (
    <Flex justify="between" align="center" p="3">
      <Flex
        gap={"4"}
        align={"center"}
        display={{ initial: "none", sm: "flex" }}
      >
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.label}
            highContrast
            href={item.href}
            target={item.external ? "_blank" : undefined}
            rel={item.external ? "noreferrer noopener" : undefined}
          >
            {item.label}
          </Link>
        ))}
        {/* <Box display={{ initial: "none", md: "block" }}>
          <BulkMetaDialog />
        </Box> */}
      </Flex>
      <Box display={{ initial: "block", sm: "none" }}>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <IconButton
              variant="ghost"
              size="3"
              aria-label="Open navigation menu"
            >
              <HamburgerMenuIcon width={20} height={20} />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="start" style={{ minWidth: "8rem" }}>
            {NAV_ITEMS.map((item) => (
              <DropdownMenu.Item
                key={item.label}
                onSelect={() => handleMenuSelect(item)}
              >
                {item.icon} {item.label}
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Item
              onSelect={() => {
                markHowSearchWorksSeen();
                router.push("/howsearchworks");
              }}
            >
              <InfoCircledIcon /> How search works
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <DropdownMenu.Item
              onSelect={() =>
                window.open(
                  "https://github.com/saketlab/seqout-web",
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              <GitHubLogoIcon /> GitHub
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Box>
      <Flex
        display={{ initial: "none", sm: "flex" }}
        gap={"4"}
        align={"center"}
      >
        <Button
          variant="soft"
          color="gray"
          onClick={() => {
            markHowSearchWorksSeen();
            router.push("/howsearchworks");
          }}
          style={{ position: "relative" }}
        >
          <InfoCircledIcon /> How search works
          {!howSearchWorksSeen && <FirstVisitPing />}
        </Button>
        <GitHubButton />
        <ThemeToggle />
      </Flex>
      <Box display={{ initial: "block", sm: "none" }}>
        <ThemeToggle />
      </Box>
    </Flex>
  );
}
