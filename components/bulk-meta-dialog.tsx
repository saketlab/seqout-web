"use client";

import { SERVER_URL } from "@/utils/constants";
import { DownloadIcon, ViewGridIcon } from "@radix-ui/react-icons";
import {
  Button,
  Dialog,
  Flex,
  Spinner,
  Text,
  TextArea,
} from "@radix-ui/themes";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export default function BulkMetaDialog() {
  // dialog control
  const [open, setOpen] = useState(false);

  // textarea input
  const [input, setInput] = useState("");

  // frozen snapshot used to trigger query
  const [submitted, setSubmitted] = useState<string[] | null>(null);

  // fetch ZIP as Blob
  const fetchBulkMetadata = async (accessions: string[]) => {
    const res = await fetch(`${SERVER_URL}/bulk/metadata`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessions }),
    });

    if (!res.ok) {
      throw new Error("Download failed");
    }

    return res.blob();
  };

  // whether the last error message is still relevant to the current input
  const [errorDismissed, setErrorDismissed] = useState(false);

  // react-query (disabled until submit)
  const {
    data: zipBlob,
    isFetching,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["bulk-metadata", submitted],
    queryFn: () => fetchBulkMetadata(submitted!),
    enabled: submitted !== null,
  });

  // download side-effect
  useEffect(() => {
    if (!zipBlob) return;

    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk_metadata.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    // reset state so user can download again
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSubmitted(null);
    setOpen(false);
  }, [zipBlob]);

  // button click handler
  const handleDownload = () => {
    if (isFetching) return;

    const accs = input
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    if (accs.length === 0) return;

    setErrorDismissed(false);

    // same accessions as last attempt: query key won't change, so refetch explicitly; setSubmitted wouldn't retrigger the fetch
    if (submitted && submitted.length === accs.length && submitted.every((s, i) => s === accs[i])) {
      void refetch();
      return;
    }

    setSubmitted(accs);
  };

  const accLines = input
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);

  const hasInvalidAccessions =
    accLines.length > 0 &&
    accLines.some(
      (a) => !/^((GSE|SRP|ERP|DRP|PRJNA)\d+|E-[A-Z]+-\d+)/i.test(a),
    );

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button variant="soft">
          <ViewGridIcon /> Get bulk metadata
        </Button>
      </Dialog.Trigger>

      <Dialog.Content size="4">
        <Dialog.Title>Get bulk metadata</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          <span id="bulk-meta-description">
            Paste GEO, SRA, ENA, DRA, GEA or ArrayExpress accessions (one
            accession per line)
          </span>
        </Dialog.Description>

        <Flex direction="column" gap="3">
          <TextArea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setErrorDismissed(true);
            }}
            placeholder={`GSE12345\nSRP67890\nGSE111111\nSRP222222`}
            rows={6}
            aria-label="Accessions, one per line"
            aria-describedby="bulk-meta-description"
            style={{
              minHeight: 120,
              maxHeight: 300,
              resize: "vertical",
              fontFamily: "monospace",
            }}
          />
        </Flex>
        <Flex mt="4" justify={"between"} align={"center"}>
          {hasInvalidAccessions ? (
            <Text size={"2"} color="red" role="alert">
              Invalid study or series accessions!
            </Text>
          ) : isError && !errorDismissed ? (
            <Text size={"2"} color="red" role="alert">
              Failed to prepare metadata ZIP. Try again.
            </Text>
          ) : (
            <div />
          )}

          <Flex gap="3" justify="end" align={"center"}>
            <Dialog.Close>
              <Button variant="soft" color="gray" disabled={isFetching}>
                Cancel
              </Button>
            </Dialog.Close>

            <Button
              onClick={handleDownload}
              disabled={isFetching || input.length == 0 || hasInvalidAccessions}
            >
              {isFetching ? <Spinner /> : <DownloadIcon />}
              {isFetching ? "Preparing ZIP..." : "Download"}
            </Button>
          </Flex>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
