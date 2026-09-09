const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:\/\//i;

export function fileUrl(path: string): string {
  return HAS_SCHEME.test(path) ? path : `https://${path}`;
}

/** Display/save names aligned with semicolon-separated fastq_ftp URLs.
 * Prefer fastq_filenames: NCBI object keys can append a version suffix absent from the filename. Fall back to the URL basename when the field is missing. */
export function fastqFileNames(
  fastqFtp: string | null,
  fastqFilenames: string | null,
): string[] {
  const urls = fastqFtp ? fastqFtp.split(";").filter(Boolean) : [];
  const names = fastqFilenames ? fastqFilenames.split(";").filter(Boolean) : [];
  return urls.map((url, i) => names[i] || url.split("/").pop() || url);
}
