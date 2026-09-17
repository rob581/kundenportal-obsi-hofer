# Design System

## Brand
Eigenständige Palette für das Kundenportal, bewusst nicht an das bestehende OBSI-Hofer-Erscheinungsbild (obsi-hofer.ch) angelehnt — freie Farbwahl (Entscheidung 2026-09-17).

## Visuelle Grundhaltung
Nüchtern & vertrauenswürdig: klar, ruhig, wenig Ablenkung. Passt zu B2B-Kunden, die schnell den Status ihrer sicherheitsrelevanten Geräte/Berichte prüfen wollen — keine verspielten Elemente, zurückhaltende Akzentfarbe, viel Weissraum, klare Tabellen.

## Colors (HSL, im shadcn-CSS-Variablen-Format)

| Token | Value | Hex (Referenz) | Usage |
|-------|-------|-----------------|-------|
| `--primary` | `212 64% 40%` | `#2563A8`-artig (klares, mittleres Stahlblau) | Primäre Buttons, Links, aktive Elemente |
| `--primary-foreground` | `0 0% 98%` | — | Text/Icons auf `--primary`-Hintergrund |
| `--ring` | `212 64% 40%` | `#2563A8`-artig | Fokus-Ring (matcht Primärfarbe) |
| `--destructive` | `0 84.2% 60.2%` | unverändert (shadcn-Default) | Fehlerzustände, destruktive Aktionen **und** Status "keine Freigabe" (siehe Component Conventions) |
| `--status-success` | `142 71% 29%` | `#1A7A3C`-artig (dunkles Grün) | Status "Freigabe" |
| `--status-success-foreground` | `0 0% 98%` | — | Text auf `--status-success`-Hintergrund |
| `--status-warning` | `32 95% 44%` | `#D97706`-artig (Amber/Orange) | Status "letzte Freigabe" |
| `--status-warning-foreground` | `0 0% 98%` | — | Text auf `--status-warning`-Hintergrund |

Alle übrigen Tokens (`--background`, `--card`, `--muted`, `--border`, etc.) bleiben auf dem shadcn-Default — kein Grund, sie für die "nüchtern & vertrauenswürdig"-Richtung zu ändern.

## Typography
System-Standard (Tailwind-Default-Sans, aktuell keine Custom-Font) beibehalten — keine Ladezeit-Kosten, wirkt bereits neutral/professionell. Kein Grund für eine Spezialschrift bei einem reinen Daten-/Status-Portal (Entscheidung 2026-09-17).

## Spacing & Radius
`--radius: 0.5rem` (shadcn-Default) beibehalten — leicht abgerundet, wirkt ruhig und modern-neutral, passt ohne Änderung zur gewählten Richtung.

## Dark Mode
Vorerst nicht unterstützt — alle bisher gebauten Seiten (PROJ-1 bis PROJ-4) gehen von hellem Hintergrund aus, ein nachträglicher Dark-Mode-Test wäre zusätzlicher Aufwand ohne aktuellen Bedarf. Die `.dark`-Variablen in `globals.css` bleiben unverändert als spätere Option; die neuen `--status-*`-Tokens haben **keine** `.dark`-Variante — muss ergänzt werden, falls Dark Mode später aktiviert wird.

## Component Conventions
- **Status-Kennzeichnung** (Geräte-Status aus PROJ-3, Prüfbericht-Ergebnis aus PROJ-4) bekommt Farben statt neutralem Grau:
  - "Freigabe" → `--status-success` (Grün)
  - "keine Freigabe" → `--destructive` (Rot, wiederverwendet statt eines eigenen Tokens)
  - "letzte Freigabe" / "Letzte Freigabe" → `--status-warning` (Amber) — case-insensitive wie bei der bestehenden Status-Normalisierung (siehe PROJ-3 Tech Design)
  - Kein Status (`null`) → neutral (`--muted-foreground`), keine Farbe
- **Offen für `/frontend`:** Diese Zuordnung ist auf den bereits gebauten Seiten (PROJ-3 Geräte-Übersicht/-Detail, PROJ-4 Prüfberichte-Tabelle) noch nicht umgesetzt — das ist eine Komponenten-Änderung, kein globales CSS-Token, und braucht einen eigenen `/frontend`-Nachtrag.

## Entscheidungs-Log
| Frage | Entscheidung | Datum |
|-------|--------------|-------|
| Bestehende OBSI-Marke matchen? | Nein, freie Palette | 2026-09-17 |
| Visuelle Grundhaltung | Nüchtern & vertrauenswürdig | 2026-09-17 |
| Primärfarbe | `#1E3A5F` (dunkles Stahlblau) gewählt, dann als optisch zu nah am neutralen Standard korrigiert auf `#2563A8`-artiges klareres Stahlblau | 2026-09-17 |
| Typografie | System-Standard beibehalten | 2026-09-17 |
| Radius | shadcn-Standard (`0.5rem`) beibehalten | 2026-09-17 |
| Dark Mode | Vorerst nur hell | 2026-09-17 |
| Status-Farben | Ja, farblich kennzeichnen (Grün/Rot/Amber) — Umsetzung als `/frontend`-Nachtrag | 2026-09-17 |
