import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/seed";
import { getSession } from "@/lib/session";

export default async function HomePage() {
  const session = await getSession();
  if (session.isAdmin) redirect("/admin");
  if (session.playerId) redirect("/plan");

  const db = getDb();
  const config = getSettings(db);

  return (
    <main className="page-shell">
      <section className="hero">
        <Image
          src="/brand/hero.jpg"
          alt="Center Court Halle am Kristanplatz"
          fill
          priority
          className="hero-photo"
          sizes="100vw"
        />
        <div className="hero-content">
          <div className="hero-brand">
            <Image
              src="/brand/logo.png"
              alt="Post SV Mühlhausen Wappen"
              width={72}
              height={72}
              priority
            />
            <p className="hero-brand-text">Post SV Mühlhausen</p>
          </div>
          <h1>{config.weekendTitle}</h1>
          <p>{config.weekendSubtitle}</p>
        </div>
        <div className="hero-panel">
          <h2>Spieler-Login</h2>
          <p className="muted" style={{ marginBottom: "0.85rem" }}>
            Mit dem Einladungscode vom Trainer und deinem Namen anmelden.
          </p>
          <LoginForm />
          <p className="muted" style={{ marginTop: "1rem", fontSize: "0.85rem" }}>
            Trainer?{" "}
            <Link href="/admin/login" style={{ textDecoration: "underline" }}>
              Zur Admin-Anmeldung
            </Link>
          </p>
        </div>
      </section>
      <p className="footer-note">
        Tischtennis mit jeder Faser ·{" "}
        <a href="https://www.post-muehlhausen.de/" target="_blank" rel="noreferrer">
          post-muehlhausen.de
        </a>
      </p>
    </main>
  );
}
