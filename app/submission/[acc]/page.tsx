import SubmissionStudiesBody from "@/components/submission-studies-body";

export default async function SubmissionStudiesPage({
  params,
}: {
  params: Promise<{ acc: string }>;
}) {
  const { acc } = await params;
  return <SubmissionStudiesBody key={acc} accession={acc} />;
}
