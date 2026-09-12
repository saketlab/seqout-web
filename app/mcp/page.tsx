import ClaudeSetupCarousel from "@/components/claude-setup-carousel";
import SearchBar from "@/components/search-bar";
import SectionAnchor from "@/components/section-anchor";
import { SERVER_API_BASE } from "@/utils/constants";
import { escapeHtmlJson } from "@/utils/json";
import { Box, Card, Code, Flex, Heading, Link, Text } from "@radix-ui/themes";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MCP Server for GEO, SRA, ENA, DRA, GEA, GSA & ArrayExpress",
  description:
    "Connect Claude Desktop or any MCP client to seqout's remote Model Context Protocol server. Search GEO, SRA, ENA, DRA, GEA, GSA & ArrayExpress datasets from your LLM.",
  alternates: {
    canonical: "https://seqout.org/mcp",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "seqout MCP Server",
  url: "https://seqout.org/mcp",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Any (MCP-compatible client)",
  description:
    "Remote MCP server exposing seqout's GEO, SRA, ENA, DRA, GEA, GSA, and ArrayExpress search and metadata tools to LLM agents via FastMCP.",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  creator: {
    "@type": "Organization",
    name: "Saket Lab, IIT Bombay",
    url: "https://seqout.org",
  },
};

const MCP_URL = "https://seqout.org/api/mcp";

const CLAUDE_SETUP_STEPS = [
  {
    image: "/claude-setup/step_1.png",
    description: "Open Settings from the profile menu.",
  },
  {
    image: "/claude-setup/step_2.png",
    description: "Select Connectors in the settings sidebar.",
  },
  {
    image: "/claude-setup/step_3.png",
    description: "Choose Add custom connector.",
  },
  {
    image: "/claude-setup/steo_4.png",
    description: "Name the connector Seqout and paste the MCP server URL.",
  },
  {
    image: "/claude-setup/step_5.png",
    description: "Approve the tools you want Claude to use.",
  },
] as const;

export const revalidate = 86400;

type McpTool = { name: string; description?: string };

async function fetchTools(): Promise<McpTool[]> {
  try {
    const res = await fetch(`${SERVER_API_BASE}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/list",
        params: {},
      }),
      next: { revalidate },
    });
    if (!res.ok) return [];
    const { result } = (await res.json()) as { result?: { tools?: McpTool[] } };
    return (result?.tools ?? []).sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

// Client setup commands and their corresponding config files.
const CLIENTS: {
  id: string;
  name: string;
  docs: string;
  cli?: string;
  file: string;
  config: string;
}[] = [
  {
    id: "claude-code",
    name: "Claude Code",
    docs: "https://docs.claude.com/en/docs/claude-code/mcp",
    cli: `claude mcp add --transport http seqout ${MCP_URL}`,
    file: "~/.claude.json",
    config: `"mcpServers": {
  "seqout": {
    "type": "http",
    "url": "${MCP_URL}"
  }
}`,
  },
  {
    id: "codex",
    name: "Codex",
    docs: "https://developers.openai.com/codex/mcp",
    cli: `codex mcp add seqout --url ${MCP_URL}`,
    file: "~/.codex/config.toml",
    config: `[mcp_servers.seqout]
url = "${MCP_URL}"`,
  },
  {
    id: "hermes",
    name: "Hermes",
    docs: "https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp",
    cli: `hermes mcp add seqout --url "${MCP_URL}"`,
    file: "~/.hermes/config.yaml",
    config: `mcp_servers:
  seqout:
    url: "${MCP_URL}"`,
  },
  {
    id: "goose",
    name: "Goose",
    docs: "https://block.github.io/goose/docs/getting-started/using-extensions",
    cli: "goose configure   # Add Extension → Remote Extension (Streamable HTTP)",
    file: "~/.config/goose/config.yaml",
    config: `extensions:
  seqout:
    enabled: true
    type: streamable_http
    name: seqout
    uri: ${MCP_URL}
    timeout: 300`,
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    docs: "https://docs.openclaw.ai/cli/mcp",
    cli: `openclaw mcp add seqout --url ${MCP_URL} --transport streamable-http`,
    file: "~/.openclaw/openclaw.json",
    config: `{
  "mcp": {
    "servers": {
      "seqout": {
        "url": "${MCP_URL}",
        "transport": "streamable-http"
      }
    }
  }
}`,
  },
];

function ConfigBlock({ children }: { children: string }) {
  return (
    <Box style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
      <Card
        variant="classic"
        style={{
          whiteSpace: "pre",
          fontFamily: "var(--font-geist-mono)",
          fontSize: "0.9rem",
        }}
      >
        {children}
      </Card>
    </Box>
  );
}

export default async function MCP() {
  const tools = await fetchTools();
  return (
    <>
      <script type="application/ld+json">{escapeHtmlJson(jsonLd)}</script>
      <SearchBar />
      <Flex
        gap="4"
        py={{ initial: "4", md: "4" }}
        px={{ initial: "4", md: "0" }}
        ml={{ initial: "0", md: "13rem" }}
        mr={{ initial: "0", md: "16rem" }}
        direction={"column"}
      >
        <Flex align="center" gap="2" id="using-seqout-with-llms" mb="3">
          <Heading as="h1" size={{ initial: "6", md: "8" }} weight="bold">
            Using seqout with LLMs
          </Heading>
          <SectionAnchor id="using-seqout-with-llms" />
        </Flex>

        <Text size={{ initial: "2", md: "3" }}>
          Seqout offers a remote{" "}
          <Link
            href="https://modelcontextprotocol.io"
            target="_blank"
            rel="noopener noreferrer"
          >
            Model Context Protocol (MCP)
          </Link>{" "}
          server that enables LLM chat clients to use seqout&apos;s features.
          This provides easy and intuitive access to exploring datasets from
          GEO, SRA, ENA, DRA, GEA, GSA & ArrayExpress.
        </Text>

        <Card>
          <Flex direction={"column"} gap={"2"} id="quick-setup">
            <Flex align="center" gap="2">
              <Heading as="h2" size={{ initial: "4", md: "6" }} weight="medium">
                Quick setup
              </Heading>
              <SectionAnchor id="quick-setup" />
            </Flex>
            <Flex direction={"column"} gap={"2"}>
              <Text>
                You can setup MCP in your AI agent of choice with this URL :{" "}
                <Code variant="soft" size={{ initial: "1", md: "2" }}>
                  https://seqout.org/api/mcp
                </Code>
              </Text>
              <Text>
                This can be done either by asking the agent to do it on your
                behalf or by editing the appropriate configuration file required
                by the agent.
              </Text>
            </Flex>
          </Flex>
        </Card>

        <Flex align="center" gap="2" id="claude-desktop">
          <Heading as="h2" size={{ initial: "4", md: "6" }} weight="medium">
            Claude
          </Heading>
          <SectionAnchor id="claude-desktop" />
        </Flex>

        <Flex direction="column" gap="4">
          <Text size={{ initial: "2", md: "3" }}>
            Add seqout as a custom connector from Claude Desktop. Open{" "}
            <Text weight="medium">Settings → Connectors</Text>, then choose
            <Text weight="medium"> Add custom connector</Text>.
          </Text>

          <Text size={{ initial: "2", md: "3" }}>
            Enter <Text weight="medium">Seqout</Text> as the name and use this
            server URL:
          </Text>

          <ConfigBlock>{MCP_URL}</ConfigBlock>

          <Text size={{ initial: "2", md: "3" }}>
            Follow the walkthrough below to finish connecting and choose which
            seqout tools Claude can use.
          </Text>

          <ClaudeSetupCarousel steps={CLAUDE_SETUP_STEPS} />

          <Text size={{ initial: "2", md: "3" }}>
            Once configured, you&apos;ll be able to search and explore GEO, SRA,
            ENA, DRA, GEA, GSA & ArrayExpress datasets directly from Claude
            Desktop conversations.
          </Text>
        </Flex>

        {CLIENTS.map((client) => (
          <Flex key={client.id} direction="column" gap="4" id={client.id}>
            <Flex align="center" gap="2">
              <Heading as="h2" size={{ initial: "4", md: "6" }} weight="medium">
                {client.name}
              </Heading>
              <SectionAnchor id={client.id} />
            </Flex>

            {client.cli && (
              <>
                <Text size={{ initial: "2", md: "3" }}>
                  Run this command in your terminal:
                </Text>
                <ConfigBlock>{client.cli}</ConfigBlock>
                <Text size={{ initial: "2", md: "3" }}>
                  Or add it to <Code>{client.file}</Code> by hand:
                </Text>
              </>
            )}

            <ConfigBlock>{client.config}</ConfigBlock>

            <Text size={{ initial: "2", md: "3" }}>
              Restart {client.name} to load the server. See the{" "}
              <Link
                href={client.docs}
                target="_blank"
                rel="noopener noreferrer"
              >
                {client.name} MCP documentation
              </Link>{" "}
              for authentication and tool-filtering options.
            </Text>
          </Flex>
        ))}
        <Flex direction="column" gap="4" id="video-demo">
          <Flex align="center" gap="2">
            <Heading as="h2" size={{ initial: "4", md: "6" }} weight="medium">
              Video demo with Claude Code
            </Heading>
            <SectionAnchor id="video-demo" />
          </Flex>
          <iframe
            src="https://www.youtube-nocookie.com/embed/C6wfbgTE1P0?controls=1&iv_load_policy=3&playsinline=1&rel=0"
            title="Video demo with Claude Code"
            width="100%"
            style={{ display: "block", aspectRatio: "16 / 9", border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </Flex>
        {tools.length > 0 && (
          <Flex direction="column" gap="4" id="tools">
            <Flex align="center" gap="2">
              <Heading as="h2" size={{ initial: "4", md: "6" }} weight="medium">
                What the server exposes
              </Heading>
              <SectionAnchor id="tools" />
            </Flex>
            <Text size={{ initial: "2", md: "3" }}>
              {tools.length} tools, covering search, project and sample
              metadata, cross-archive resolution, download manifests, ontology
              enrichment, and statistics. Your client lists them once connected.
            </Text>
            <Box style={{ overflowX: "auto" }}>
              <Flex direction="column" gap="2" asChild>
                <ul style={{ margin: 0, paddingLeft: "1.25rem" }}>
                  {tools.map((tool) => (
                    <li key={tool.name}>
                      <Text size={{ initial: "2", md: "3" }}>
                        <Code>{tool.name}</Code>
                        {tool.description
                          ? ` — ${tool.description.split("\n")[0].trim()}`
                          : ""}
                      </Text>
                    </li>
                  ))}
                </ul>
              </Flex>
            </Box>
          </Flex>
        )}

        <Text size={{ initial: "2", md: "3" }}>
          For direct programmatic access without MCP, see the{" "}
          <Link href="/api-docs">API Reference</Link>.
        </Text>
      </Flex>
    </>
  );
}
