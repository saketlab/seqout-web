import { copyToClipboard } from "@/utils/clipboard";

/** Copy the current page URL with a section hash and optional tab suffix, updating the address bar. Returns whether copying succeeded. See {@link buildSectionHash}. */
export async function copySectionLink(hash: string): Promise<boolean> {
  const url = new URL(window.location.href);
  url.hash = hash;
  const sectionUrl = url.toString();

  let didCopy = false;
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(sectionUrl);
      didCopy = true;
    } catch {
      didCopy = false;
    }
  }

  if (!didCopy) {
    didCopy = copyToClipboard(sectionUrl);
  }

  window.history.replaceState(
    null,
    "",
    `${window.location.pathname}${window.location.search}#${hash}`,
  );
  return didCopy;
}
