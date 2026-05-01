import Link from "next/link";
import { SiriusIcon } from "./SiriusLogo";
import { isAdmin } from "@/lib/auth";
import { MobileMenu } from "./MobileMenu";

const PUBLIC_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/sorteo", label: "Sorteo" },
  { href: "/bracket", label: "Bracket" },
  { href: "/cronograma", label: "Cronograma" },
];

export async function Header({ active }: { active?: string }) {
  const authed = await isAdmin();
  const links = authed ? [...PUBLIC_LINKS, { href: "/admin", label: "Admin" }] : PUBLIC_LINKS;

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-navy-900/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <SiriusIcon className="size-7" />
          <span className="text-display text-[13px] tracking-[0.2em] uppercase">
            Sirius Padel
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                active === l.href
                  ? "bg-cyan-bright/15 text-cyan-bright"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <MobileMenu links={links} active={active} />
      </div>
    </header>
  );
}
