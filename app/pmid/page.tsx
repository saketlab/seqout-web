"use client";

import SearchBar from "@/components/search-bar";
import { ARCHIVE_LIST_TEXT } from "@/utils/constants";
import { isPmid, pmidHref } from "@/utils/project";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Button, Flex, Heading, Text, TextField } from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import * as React from "react";

export default function PublicationsIndexPage() {
  const router = useRouter();
  const [pmid, setPmid] = React.useState("");

  // Validate numeric PMIDs before navigation.
  const [invalid, setInvalid] = React.useState(false);

  const go = () => {
    const next = pmid.trim();
    if (isPmid(next)) {
      setInvalid(false);
      router.push(pmidHref(next));
      return;
    }
    setInvalid(true);
  };

  return (
    <>
      <SearchBar />

      <Flex
        direction="column"
        align="center"
        justify="center"
        gap="4"
        px="4"
        style={{ minHeight: "60vh" }}
      >
        <Heading size="6" align="center">
          Find projects by PMID
        </Heading>
        <Text
          size="2"
          align="center"
          style={{ color: "var(--gray-11)", maxWidth: "32rem" }}
        >
          Enter a PubMed ID to see every dataset linked to that paper across{" "}
          {ARCHIVE_LIST_TEXT}.
        </Text>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            go();
          }}
          style={{ width: "100%", maxWidth: "28rem" }}
        >
          <Flex gap="2">
            <TextField.Root
              size="3"
              value={pmid}
              onChange={(e) => {
                setPmid(e.target.value);
                if (invalid) setInvalid(false);
              }}
              placeholder="PMID (e.g. 29116155)"
              inputMode="numeric"
              autoFocus
              aria-label="PMID"
              aria-invalid={invalid || undefined}
              aria-describedby={invalid ? "pmid-error" : undefined}
              style={{ flex: 1 }}
            />
            <Button size="3" type="submit">
              <MagnifyingGlassIcon />
              Search
            </Button>
          </Flex>
          {invalid && (
            <Text id="pmid-error" size="2" color="red" mt="2" as="p" role="alert">
              A PMID is digits only — e.g. 29116155. To search by title or
              keywords, use the search bar above.
            </Text>
          )}
        </form>
      </Flex>
    </>
  );
}
