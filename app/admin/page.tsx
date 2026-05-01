import { isAdmin } from "@/lib/auth";
import { Header } from "@/components/Header";
import { LoginForm } from "@/components/admin/LoginForm";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authed = await isAdmin();
  return (
    <>
      <Header active="/admin" />
      {authed ? <AdminDashboard /> : <LoginForm />}
    </>
  );
}
