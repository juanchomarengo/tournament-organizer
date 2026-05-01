import { Header } from "@/components/Header";
import { CronogramaView } from "@/components/CronogramaView";

export const dynamic = "force-dynamic";

export default function CronogramaPage() {
  return (
    <>
      <Header active="/cronograma" />
      <CronogramaView />
    </>
  );
}
