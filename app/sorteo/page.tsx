import { SorteoShow } from "@/components/SorteoShow";
import { Header } from "@/components/Header";

export const dynamic = "force-dynamic";

export default async function SorteoPage({
  searchParams,
}: {
  searchParams: Promise<{ present?: string }>;
}) {
  const { present } = await searchParams;
  const isPresentation = present === "1";
  return (
    <>
      {!isPresentation && <Header active="/sorteo" />}
      <SorteoShow presentation={isPresentation} />
    </>
  );
}
