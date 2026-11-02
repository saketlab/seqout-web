import { CodeBlock } from "@/components/api-docs-client";
import { Flex, Link, Text } from "@radix-ui/themes";

/** The same download done with the seqout CLI (pip install seqout). */
export function SeqoutCliCommand({ commands }: { commands: string[] }) {
  if (commands.length === 0) return null;
  return (
    <Flex direction="column" gap="2" mt="3">
      <Text size="2" weight="medium">
        Or use the{" "}
        <Link href="https://pypi.org/project/seqout/" target="_blank">
          seqout CLI
        </Link>
      </Text>
      <CodeBlock
        code={["pip install seqout  # Python 3.13+", ...commands].join("\n")}
      />
    </Flex>
  );
}
