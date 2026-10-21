"use client";

import { CodeBlock } from "@/components/api-docs-client";
import SectionAnchor from "@/components/section-anchor";
import { PROJECT_HEADER_INSETS } from "@/utils/constants";
import {
  CLIENT_DOCS,
  PYTHON_DEV_INSTALL,
  R_DEV_INSTALL,
  SNIPPETS_INTRO,
  type SnippetBlock,
} from "@/utils/client-snippets";
import { useProjectReady } from "@/utils/useProjectReady";
import { Code, Flex, Heading, Link, Tabs, Text } from "@radix-ui/themes";
import { useState } from "react";

const LANGUAGES = [
  { value: "python", label: "Python", docs: CLIENT_DOCS.python },
  { value: "r", label: "R", docs: CLIENT_DOCS.r },
] as const;

type Language = (typeof LANGUAGES)[number]["value"];

export default function ClientCodeSection({
  blocks,
}: {
  blocks: SnippetBlock[];
}) {
  const ready = useProjectReady();
  const [language, setLanguage] = useState<Language>("python");

  return (
    <div hidden={!ready}>
      <Flex {...PROJECT_HEADER_INSETS} pb="6" direction="column" gap="3">
        <Flex id="code" align="center" gap="2">
          <Heading as="h2" weight="medium" size="6">
            Use in Python or R
          </Heading>
          <SectionAnchor id="code" />
        </Flex>
        <Text size="2" style={{ color: "var(--gray-11)" }}>
          {SNIPPETS_INTRO} Development version:{" "}
          <Code size="1">{PYTHON_DEV_INSTALL}</Code> or{" "}
          <Code size="1">{R_DEV_INSTALL}</Code>.
        </Text>
        <Tabs.Root
          value={language}
          onValueChange={(value) => setLanguage(value as Language)}
        >
          <Tabs.List>
            {LANGUAGES.map((lang) => (
              <Tabs.Trigger key={lang.value} value={lang.value}>
                {lang.label}
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {LANGUAGES.map((lang) => (
            <Tabs.Content
              key={lang.value}
              value={lang.value}
              forceMount
              hidden={lang.value !== language}
            >
              <Flex direction="column" gap="4" pt="1">
                {blocks.map((block) => (
                  <Flex key={block.id} direction="column" gap="2">
                    <Text size="2" weight="medium">
                      {block.title}
                    </Text>
                    <CodeBlock
                      code={lang.value === "python" ? block.python : block.r}
                    />
                  </Flex>
                ))}
                <Text size="1" color="gray">
                  Full reference: <Link href={lang.docs}>{lang.docs}</Link>
                </Text>
              </Flex>
            </Tabs.Content>
          ))}
        </Tabs.Root>
      </Flex>
    </div>
  );
}
