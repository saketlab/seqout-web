/** Copy text with a synchronous textarea and execCommand.
 * Radix DropdownMenu onSelect can run after the trusted event, losing the user-gesture context required by the async Clipboard API. */
export function copyToClipboard(text: string): boolean {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  const ok = document.execCommand("copy");
  document.body.removeChild(ta);
  return ok;
}
