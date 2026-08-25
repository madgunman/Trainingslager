"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/plan", label: "Verfügbarkeit" },
  { href: "/agenda", label: "Programm" },
] as const;

export function PlayerNav() {
  const pathname = usePathname();

  return (
    <nav className="header-nav" aria-label="Spieler-Navigation">
      {LINKS.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className="header-nav-link"
            aria-current={active ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
