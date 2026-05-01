import { Header } from "@/components/Header";
import { HomeView } from "@/components/HomeView";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <Header active="/" />
      <HomeView />
    </>
  );
}
