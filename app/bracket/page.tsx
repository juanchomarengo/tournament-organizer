import { Header } from "@/components/Header";
import { BracketView } from "@/components/BracketView";

export const dynamic = "force-dynamic";

export default async function BracketPage({
  searchParams,
}: {
  searchParams: Promise<{ present?: string }>;
}) {
  const { present } = await searchParams;
  const isPresentation = present === "1";
  return (
    <>
      {!isPresentation && <Header active="/bracket" />}
      <BracketView />
    </>
  );
}
