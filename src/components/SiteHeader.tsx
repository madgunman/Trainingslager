import Image from "next/image";
import Link from "next/link";
import { logout } from "@/app/actions";
import { PlayerNav } from "@/components/PlayerNav";

export function SiteHeader({
  title,
  subtitle,
  playerName,
  isAdmin,
}: {
  title: string;
  subtitle?: string;
  playerName?: string;
  isAdmin?: boolean;
}) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href={isAdmin ? "/admin" : playerName ? "/plan" : "/"} className="brand-lockup">
          <Image
            src="/brand/logo.png"
            alt="Post SV Mühlhausen"
            width={56}
            height={56}
            className="brand-logo"
            priority
          />
          <div>
            <p className="brand-name">Post SV Mühlhausen</p>
            <p className="brand-tag">{title}</p>
          </div>
        </Link>
        {playerName ? <PlayerNav /> : null}
        <div className="header-meta">
          {subtitle ? <p className="header-sub">{subtitle}</p> : null}
          {playerName ? <p className="header-user">Hallo, {playerName}</p> : null}
          {isAdmin ? <p className="header-user">Trainer-Ansicht</p> : null}
          {(playerName || isAdmin) && (
            <form action={logout}>
              <button type="submit" className="btn-ghost">
                Abmelden
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
