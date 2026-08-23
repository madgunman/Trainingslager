# Trainingswochenende – Post SV Mühlhausen

Kleine Web-App für Zeitplan, Verfügbarkeit und Übungswünsche eines Trainingswochenendes.

## Funktionen

- **Spieler-Login** mit gemeinsamem Einladungscode + Name (Session-Cookie)
- **Zeitplan** mit Rückmeldung pro Einheit: Dabei / Absage / Unsicher
- **Übungswünsche** an die Trainer
- **Admin-Bereich** zum Pflegen von Titel, Code, Einheiten sowie Übersicht aller Rückmeldungen

## Starten

```bash
cp .env.example .env.local
npm install
npm run dev
```

Öffnen: [http://localhost:3000](http://localhost:3000)

### Standardzugänge (nur Erststart / Seed)

| Rolle   | Zugang                          |
|---------|----------------------------------|
| Spieler | Code `POSTWEEKEND` + dein Name   |
| Admin   | Passwort `postadmin` unter `/admin/login` |

Werte in `.env.local` oder später im Admin ändern. Die SQLite-Datenbank liegt unter `data/training.db`.

## Branding

Farben und Logos folgen dem Auftritt von [post-muehlhausen.de](https://www.post-muehlhausen.de/) (Primärgelb `#fcc310`, Schwarz `#111`). Vereinslogos liegen unter `public/brand/`.

## Technik

- Next.js App Router, TypeScript, Tailwind
- SQLite (`better-sqlite3`) + Drizzle
- Sessions mit `iron-session`
