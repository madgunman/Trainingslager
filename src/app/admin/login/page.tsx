import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminLoginForm } from "@/components/AdminLoginForm";
import { SiteHeader } from "@/components/SiteHeader";
import { getDb } from "@/lib/db";
import { getSettings } from "@/lib/seed";
import { getSession } from "@/lib/session";

export default async function AdminLoginPage() {
  const session = await getSession();
  if (session.isAdmin) redirect("/admin");

  const db = getDb();
  const config = getSettings(db);

  return (
    <>
      <SiteHeader title={config.weekendTitle} subtitle="Trainer-Login" />
      <main className="page-shell">
        <section className="section" style={{ maxWidth: 420 }}>
          <div className="section-head">
            <h2>Admin</h2>
            <p>Zugang für Trainerinnen und Trainer.</p>
          </div>
          <div className="admin-panel">
            <AdminLoginForm />
          </div>
          <p className="muted" style={{ marginTop: "1rem" }}>
            <Link href="/" style={{ textDecoration: "underline" }}>
              Zurück zum Spieler-Login
            </Link>
          </p>
        </section>
      </main>
    </>
  );
}
