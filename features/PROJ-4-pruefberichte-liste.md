# PROJ-4: Prüfberichte-Liste

## Status: Planned
**Created:** 2026-09-17
**Last Updated:** 2026-09-17

## Dependencies
- Requires: PROJ-1 (Dataverse-Sync-Service) — liefert die Prüfberichts-Daten; braucht dafür eine kleine Ergänzung: neues `bemerkungen`-Feld an `dv_pruefberichte`, gemappt von `bmvcc_remark` (aktuell nicht mitsynchronisiert)
- Requires: PROJ-3 (Geräte-Übersicht) — die Prüfberichte erscheinen als neuer Abschnitt auf der dort gebauten Geräte-Detailseite (`/uebersicht/geraete/[id]`)

## User Stories
- Als Kunde möchte ich auf der Detailseite eines Geräts alle bisherigen Prüfberichte sehen, damit ich die Prüfhistorie nachvollziehen kann.
- Als Kunde möchte ich für jeden Prüfbericht Datum, Ergebnis, Bemerkungen und Prüfer sehen, damit ich weiss, was bei der letzten Prüfung festgestellt wurde.
- Als Kunde eines Geräts ohne bisherige Prüfberichte möchte ich eine klare Meldung sehen, statt eines leeren/verwirrenden Abschnitts.
- Als OBSI Hofer GmbH möchte ich, dass Kunden ausschliesslich Prüfberichte ihrer eigenen Geräte sehen können, damit keine fremden Daten offengelegt werden.

## Out of Scope
- PDF-Download der Prüfberichte — zurückgestellt, bis der PDF-Speicherort in Dataverse geklärt ist (offene Frage aus PROJ-1: `IsDocumentManagementEnabled = 0`, kein Datei-/Bild-Feld am Entity, vermutlich Dataverse Notes/Attachments, aber unverifiziert); wird nachgezogen, sobald geklärt (per `/refine PROJ-4` oder als eigenes Feature)
- Globale/firmenweite Prüfberichte-Liste über alle Geräte hinweg — bewusst nur pro Gerät (siehe Decision Log); kann später ergänzt werden
- Eigene Detailseite pro Prüfbericht — die vier Felder passen kompakt als Tabelle direkt auf die Geräte-Detailseite
- Filtern/Suchen innerhalb der Prüfberichte-Liste eines Geräts — bei durchschnittlich 2–3 Berichten pro Gerät nicht nötig für MVP
- Bearbeiten, Erstellen oder Löschen von Prüfberichten — Portal ist read-only (siehe PRD)
- Ausblenden archivierter Prüfberichte — werden ganz normal mit den aktiven Berichten angezeigt (siehe Decision Log)

## Acceptance Criteria

**Format:** Angenommen [Vorbedingung] / Wenn [Aktion] / Dann [Ergebnis]

- [ ] Angenommen ein Kunde ist auf der Detailseite eines eigenen Geräts, wenn die Seite lädt, dann werden alle nicht gelöschten Prüfberichte dieses Geräts mit Datum, Ergebnis, Bemerkungen und Prüfer angezeigt
- [ ] Angenommen ein Gerät hat noch keine Prüfberichte, wenn die Detailseite lädt, dann wird im Prüfberichte-Abschnitt eine Leermeldung angezeigt ("Für dieses Gerät sind noch keine Prüfberichte hinterlegt.")
- [ ] Angenommen die Prüfberichte-Liste wird angezeigt, dann ist sie nach Prüfdatum absteigend sortiert (neuester Bericht zuerst)
- [ ] Angenommen ein Prüfbericht ist als "archiviert" markiert, wenn die Liste angezeigt wird, dann erscheint er ganz normal zusammen mit den aktiven Berichten
- [ ] Angenommen ein Prüfbericht wurde per PROJ-1-Sync als gelöscht markiert (Soft-Delete), wenn die Liste angezeigt wird, dann erscheint dieser Bericht nicht
- [ ] Angenommen die Prüfberichte können nicht geladen werden (z.B. Datenbank kurzzeitig nicht erreichbar), wenn der Fehler auftritt, dann wird im Prüfberichte-Abschnitt eine Fehlermeldung mit "Erneut versuchen" angezeigt, ohne den Rest der Geräte-Detailseite unbrauchbar zu machen
- [ ] Angenommen ein Kunde versucht, über die ID eines fremden Geräts auf dessen Prüfberichte zuzugreifen, dann wird ihm kein Zugriff gewährt (identisch zum bestehenden Zugriffsschutz der Geräte-Detailseite aus PROJ-3)

## Edge Cases
- Ein Prüfbericht referenziert laut Dataverse ein Gerät, das im Sync (noch) nicht existiert (lose Fremdschlüssel, siehe PROJ-1) → kann in diesem Feature nicht auftreten, da die Liste immer über die `geraet_id` der bereits geladenen, existierenden Geräte-Detailseite abgefragt wird
- Sehr viele Prüfberichte an einem Gerät (untypisch, aber möglich) → keine Paginierung im MVP, da der historische Durchschnitt bei ca. 2–3 Berichten pro Gerät liegt; wird bei Bedarf später ergänzt
- Bemerkungsfeld ist leer/nicht gesetzt → Zelle zeigt "—" statt leerem Feld (konsistent mit PROJ-3)
- Zwei Prüfberichte am selben Datum → Sortierung bleibt stabil, keine zusätzliche Sekundärsortierung nötig für MVP

## Technical Requirements (optional)
- Zugriffsbeschränkung: Prüfberichte-Abfrage nutzt dieselbe bereits durch PROJ-3 etablierte Firma-Prüfung (Gerät → Standort → Firma), keine zusätzliche clientseitige Filterung
- Abhängigkeit: `dv_pruefberichte` benötigt das neue `bemerkungen`-Feld (gemappt von `bmvcc_remark`), bevor der Backend-Teil dieses Features gebaut werden kann

## Open Questions
- [x] Exakter Dataverse-Feldname für das Bemerkungsfeld an `bmvcc_Pruefbericht` → `bmvcc_remark` (vom Nutzer bestätigt, 2026-09-17)
- [ ] PDF-Speicherort weiterhin ungeklärt (aus PROJ-1 übernommen) — betrifft nur eine spätere PDF-Download-Erweiterung dieses oder eines neuen Features, nicht diese Version

## Decision Log

### Product Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| PDF-Download vorerst komplett aus dem Scope genommen | PDF-Speicherort in Dataverse ist noch nicht verifiziert (offene Frage aus PROJ-1); Prüfberichte-Metadaten (Datum/Ergebnis/Bemerkungen/Prüfer) liefern bereits eigenständigen Kundennutzen ohne PDF | 2026-09-17 |
| Prüfberichte werden pro Gerät angezeigt, nicht als globale firmenweite Liste | Passt zum natürlichen Kunden-Workflow ("ich schaue mir dieses eine Gerät an") und zum bereits in PROJ-3 vorgesehenen Anknüpfungspunkt | 2026-09-17 |
| Archivierte Prüfberichte werden normal angezeigt, nicht ausgeblendet | "Archiviert" bedeutet abgeschlossen/historisch, nicht ungültig; für sicherheitsrelevante Geräte ist die vollständige Prüfhistorie relevant | 2026-09-17 |
| Direkt als neuer Abschnitt auf der bestehenden Geräte-Detailseite, keine eigene Unterseite | Kompakte Datenmenge (Ø 2–3 Berichte/Gerät), kein zusätzlicher Klick nötig | 2026-09-17 |
| Keine Paginierung/Filterung innerhalb der Liste im MVP | Historischer Durchschnitt von ca. 2–3 Prüfberichten pro Gerät macht das für die aktuelle Datenlage unnötig | 2026-09-17 |
| Neues Bemerkungsfeld (`bmvcc_remark` → `bemerkungen`) erfordert eine kleine PROJ-1-Ergänzung (Schema + Sync-Mapping) | Feld existiert in Dataverse, wurde aber beim ursprünglichen PROJ-1-Schema nicht mitgenommen | 2026-09-17 |

### Technical Decisions
<!-- Added by /architecture -->
| Decision | Rationale | Date |
|----------|-----------|------|
| Prüfberichte werden als Teil derselben Server-Component-Anfrage auf der Geräte-Detailseite geladen, kein separater API-Endpoint | Konsistent mit dem in PROJ-3 etablierten Muster (reine Leseoperation); keine zusätzliche Client-Server-Rundreise nötig | 2026-09-17 |
| Prüfberichte-Abfrage verlangt keinen eigenen `firmaId`-Parameter, sondern verlässt sich auf einen bereits geprüften `geraetId` | Die Autorisierung ("gehört das Gerät zur Firma?") ist bereits durch den vorgelagerten `getGeraetById`-Aufruf der PROJ-3-Detailseite sichergestellt; Prüfberichte werden erst geladen, nachdem dieser ein gültiges Gerät zurückgegeben hat. Diese Reihenfolge muss beim Bauen zwingend beibehalten werden (nicht parallel/vorher laden) | 2026-09-17 |
| Sortierung (neuestes Datum zuerst) und Ausschluss Soft-gelöschter Berichte erfolgen direkt in der Datenbankabfrage, nicht im Speicher | Gleiche Begründung wie bei PROJ-3: skaliert besser und bleibt konsistent mit dem bestehenden Muster | 2026-09-17 |
| Neues `bemerkungen`-Feld wird als rein additive Spalte an die bestehende `dv_pruefberichte`-Tabelle angehängt, keine neue Tabelle | Reine Spalten-Ergänzung ohne strukturelle Änderung an PROJ-1; einfachste Umsetzung, keine bestehenden PROJ-1-Verhaltensweisen betroffen | 2026-09-17 |
| Die PROJ-1-Ergänzung (Migration + Sync-Mapping für `bemerkungen`/`bmvcc_remark`) wird zu Beginn von `/backend PROJ-4` miterledigt, kein separater `/refine PROJ-1`-Durchgang | Rein additiv, betrifft ausschliesslich dieses Feature; ein eigener Durchgang wäre unnötiger Overhead für ein Ein-Personen-Team | 2026-09-17 |

---
<!-- Sections below are added by subsequent skills -->

## Tech Design (Solution Architect)

### Komponenten-Struktur

```
/uebersicht/geraete/[id] (bestehende PROJ-3-Detailseite, erweitert)
├── AppHeader (bestehend)
├── Zurück-Link (bestehend)
├── Geräte-Detail-Karte (bestehend, unverändert)
└── NEU: Prüfberichte-Karte
    ├── Tabelle: Datum, Ergebnis, Bemerkungen, Prüfer — neuester Bericht zuerst
    ├── Leer-Zustand ("Für dieses Gerät sind noch keine Prüfberichte hinterlegt.")
    └── Eigener Fehler-Zustand mit "Erneut versuchen" (unabhängig vom Rest der Seite — ein Ladefehler bei den Prüfberichten darf die Gerätedetails nicht mit lahmlegen)
```

### Datenmodell (in Textform)

- Die bestehende PROJ-1-Tabelle `dv_pruefberichte` wird um ein Feld `bemerkungen` (Text) ergänzt, synchronisiert aus dem Dataverse-Feld `bmvcc_remark` — eine kleine, rein additive Erweiterung an PROJ-1
- Die Geräte-Detailseite lädt zusätzlich zu den bestehenden Gerätedaten alle Prüfberichte, deren `geraet_id` mit dem bereits (über PROJ-3) autorisierten Gerät übereinstimmt und die nicht per Soft-Delete als gelöscht markiert sind
- Archivierte Prüfberichte werden ganz normal mitgeladen (kein zusätzlicher Filter, siehe Product Decision)
- Sortierung nach Prüfdatum absteigend erfolgt direkt in der Datenbankabfrage
- Keine Paginierung (siehe Edge Cases im Spec — historischer Durchschnitt ~2–3 Berichte/Gerät)

### Technische Entscheidungen (Begründung)
Siehe Decision Log → Technical Decisions oben.

### Abhängigkeiten (Packages)
Keine neuen — nutzt weiterhin die bereits installierten shadcn-Komponenten (Card, Table) und die vorhandene Supabase-Anbindung (`src/lib/supabase-admin.ts`).

### Voraussetzung für `/backend`
Bevor der Backend-Teil von PROJ-4 gebaut werden kann, braucht `dv_pruefberichte` das neue `bemerkungen`-Feld (Migration + Ergänzung des Sync-Mappings um `bmvcc_remark`). Wird zu Beginn von `/backend PROJ-4` als erster Schritt miterledigt (siehe Technical Decisions).

## QA Test Results
_To be added by /qa_

## Deployment
_To be added by /deploy_
