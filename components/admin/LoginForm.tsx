"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/client";
import { Button, Card, Input } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const ok = await login(password);
    if (ok) {
      router.refresh();
    } else {
      setError("Contraseña incorrecta");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center px-6 py-24">
      <Card className="w-full">
        <h1 className="text-display text-2xl font-semibold">Acceso admin</h1>
        <p className="mt-1 text-sm text-muted">
          Entra para gestionar el torneo.
        </p>
        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-3">
          <Input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p className="text-sm text-rose-300">{error}</p>}
          <Button type="submit" disabled={loading || !password}>
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
