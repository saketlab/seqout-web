import IndexRefreshed from "@/components/index-refreshed";
import { Flex, Kbd, Link, Separator, Text } from "@radix-ui/themes";

export default function Footer() {
  return (
    <footer>
      <Separator size="4" />
      <Flex
        direction={{ initial: "column", sm: "row" }}
        justify="between"
        align="center"
        gap="3"
        py="5"
        px={{ initial: "4", sm: "6" }}
        wrap="wrap"
      >
        {/* Brand wordmark in Geist Sans. */}
        <Flex align="center" gap="2">
          <Text
            size="3"
            weight="bold"
            style={{
              letterSpacing: "-0.025em",
              color: "var(--gray-12)",
            }}
          >
            seqout
          </Text>
          <Text size="1" style={{ color: "var(--gray-11)" }}>
            ·
          </Text>
          <Link
            href="https://saketlab.org"
            target="_blank"
            rel="noreferrer noopener"
            size="1"
            color="gray"
          >
            Saket Lab
          </Link>
        </Flex>

        {/* Command palette keyboard shortcut. */}
        <Flex align="center" gap="1">
          <Text size="1" style={{ color: "var(--gray-11)" }}>
            Press
          </Text>
          <Kbd size="1">⌘K</Kbd>
          <Text size="1" style={{ color: "var(--gray-11)" }}>
            to search
          </Text>
        </Flex>

        <IndexRefreshed />
      </Flex>
    </footer>
  );
}
