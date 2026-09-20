import SearchBar from "@/components/search-bar";
import { Flex, Heading, Link, Separator, Text } from "@radix-ui/themes";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What seqout.org collects when you use the website, the REST API or the MCP server, why, and how to contact us.",
  alternates: {
    canonical: "https://seqout.org/privacy",
  },
};

function P({ children }: { children: ReactNode }) {
  return <p style={{ margin: "0 0 var(--space-3)" }}>{children}</p>;
}

const UPDATED = "2026-09-20";

const sections: { id: string; title: string; body: ReactNode }[] = [
  {
    id: "summary",
    title: "Summary",
    body: (
      <>
        seqout.org is a search engine for public metadata about sequencing
        studies. You do not need an account, and we do not ask you for personal
        information. We log every request so we can run the service and see how
        it is being used. This page lists what we log, who else handles it, and
        how long we keep it. Seqout is run by {" "}
        <Link
          href="https://saketlab.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Saket Lab
        </Link>{" "}
        at the Koita Centre for Digital Health at the Indian Institute of Technology Bombay.
      </>
    ),
  },
  {
    id: "collect",
    title: "What we log",
    body: (
      <>
        <P>
          Our web server, our application and our analytics system log each
          request to the website, the REST API (<code>/api</code>) and the MCP
          server (<code>/api/mcp</code>). They record:
        </P>
        <ul>
          <li>the time, HTTP method, path, status code and response time;</li>
          <li>
            the full URL query string, including your search text and filters.
          </li>
          <li>
            your IP address, plus a hash of it salted with a value that changes
            daily. The web server also records the forwarded-for header;
          </li>
          <li>
            your approximate country and city, which we look up from the IP
            address in a GeoIP database on our server, and coordinates rounded
            to 0.1 degrees;
          </li>
          <li>
            your user agent, as sent and parsed into browser, operating system
            and device type, and the <code>Accept-Language</code>,{" "}
            <code>Accept</code> and <code>Referer</code> headers;
          </li>
          <li>
            for search requests, the number of results and whether synonym
            expansion ran.
          </li>
        </ul>
        <P>
          We store the IP address itself.
        </P>
        <P>
          MCP: when an AI client calls our MCP server, it sends tool arguments,
          such as a search phrase or an accession, in the request body. The web
          server access log stores that body for <code>/api/mcp</code>. The
          analytics database stores the tool name and its search argument. We
          see the IP address and user agent of the connecting client or its
          intermediary. We receive only what the client sends, but if it puts
          personal information or part of a conversation into the tool
          arguments, that gets logged too. We do not log request bodies for other
          endpoints.
        </P>
        <P>
          Website pages: each time you navigate, the page sends its path
          (without the query string) and the values of these filters, when
          present, to our analytics endpoint: <code>q</code>,{" "}
          <code>query</code>, <code>organism</code>, <code>tissue</code>,{" "}
          <code>disease</code>, <code>cell_type</code>, <code>db</code>,{" "}
          <code>library_strategy</code>, <code>platform</code>,{" "}
          <code>country</code>, <code>assay</code>, <code>sortby</code> and{" "}
          <code>order</code>. We record it with the same IP address, country,
          city and user agent details as any other request.
        </P>
      </>
    ),
  },
  {
    id: "use",
    title: "Why we log it",
    body: (
      <>
        We log to keep the service running, enforce rate limits, investigate
        errors and abuse, and see which searches and countries use seqout so we
        can improve it. We do not use the logs for advertising.
      </>
    ),
  },
  {
    id: "third-parties",
    title: "Hosting and third parties",
    body: (
      <>
        <P>
          seqout runs on a server that OVHcloud operates in Canada. We store and
          process your requests and the logs above there. Cloudflare proxies
          seqout.org, so it handles your requests before they reach our server
          and passes your IP address to us in a header. Cloudflare and Google
          operate globally and may process data in other countries. Read the{" "}
          <Link
            href="https://www.cloudflare.com/privacypolicy/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Cloudflare privacy policy
          </Link>{" "}
          and the{" "}
          <Link
            href="https://us.ovhcloud.com/legal/privacy-policy/"
            target="_blank"
            rel="noopener noreferrer"
          >
            OVHcloud privacy policy
          </Link>
          .
        </P>
        <P>
          The website also uses Google Analytics to
          measure usage. Google sets cookies, receives your IP address and page
          views, and applies{" "}
          <Link
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google&apos;s privacy policy
          </Link>
          . A browser tracking blocker or Google&apos;s{" "}
          <Link
            href="https://tools.google.com/dlpage/gaoptout"
            target="_blank"
            rel="noopener noreferrer"
          >
            opt-out add-on
          </Link>{" "}
          limits it. The MCP page embeds a YouTube video from
          youtube-nocookie.com, so loading it sends requests to YouTube.
        </P>
        <P>
          The metadata seqout serves comes from public archives (GEO, SRA, ENA,
          DDBJ, ArrayExpress, GSA and PubMed). We do not send your queries to
          them.
        </P>
      </>
    ),
  },
  {
    id: "public-data",
    title: "About the data we serve",
    body: (
      <>
        seqout shows metadata from public archives and publications, including
        the names of authors, investigators and submitting centres. To correct a
        record, email us. The source archive may need to change it too.
      </>
    ),
  },
  {
    id: "retention",
    title: "Retention",
    body: (
      <>
        After 12 months we remove these identifiers from request logs: the IP
        address and its hash, the user agent, the browser and operating system
        versions, the city, the coordinates and the language header. We keep the
        request itself (time, path, status, response time, country) plus the
        search text and MCP search arguments, which show how people use seqout.
        Those can contain personal information if you typed it into a search. At
        the same point we merge per-city usage counts into country totals. We
        also store daily unique-visitor counts as probabilistic sketches built
        from IP addresses, and you cannot turn a sketch back into an address.
        The web server rotates its own access log and keeps about 52 days of it.
      </>
    ),
  },
  {
    id: "rights",
    title: "Your choices",
    body: (
      <>
        Your search history and display preferences live in your browser&apos;s
        local storage, and you can clear them in your browser settings. Searches
        you submit still reach us, and we log them as described above. You can
        ask what we hold about an IP address and ask us to delete it. We will
        respond, and delete the entries we can locate correctly. seqout is for
        researchers and is not directed at children.
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <>
        Email{" "}
        <Link href="mailto:seqout@gmail.com">seqout@gmail.com</Link> with
        questions or requests. Do not put personal information in a public issue
        on{" "}
        <Link
          href="https://github.com/saketlab/seqout/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          seqout GitHub issues
        </Link>
        . If you ask about your own data, we may ask for details, such as the
        time and IP address of your requests, so we can find the entries. We
        will update this page when these practices change, and the date at the
        top shows the last revision.
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <SearchBar />
      <Flex
        gap="4"
        py="4"
        px={{ initial: "4", md: "0" }}
        ml={{ initial: "0", md: "13rem" }}
        mr={{ initial: "0", md: "16rem" }}
        direction="column"
      >
        <Heading as="h1" size="7">
          Privacy policy
        </Heading>
        <Text size="2" color="gray">
          Last updated {UPDATED}
        </Text>
        <Separator size="4" />
        {sections.map((s) => (
          <Flex key={s.id} direction="column" gap="2" id={s.id}>
            <Heading as="h2" size="4">
              {s.title}
            </Heading>
            <Text as="div" size="3">
              {s.body}
            </Text>
          </Flex>
        ))}
      </Flex>
    </>
  );
}
