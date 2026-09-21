# Management Summary: Kundenportal Login-Umbau

2026-09-21 · Rob

## Ausgangslage

Das Kundenportal der OBSI Hofer GmbH ist ein Self-Service-Portal für Kunden mit Inspektionen sicherheitsrelevanter Geräte: Kunden melden sich an und sehen ausschliesslich ihre eigenen Geräte und Prüfberichte (read-only) — als Ersatz für die bisherige manuelle Aufbereitung in Excel und den Versand per E-Mail.

Für die Anmeldung war zusätzlich zum bestehenden E-Mail-Login eine Passkey-Option gewünscht (Fingerabdruck, Gesichtserkennung, Sicherheitsschlüssel). Die bisherige Anmeldelösung (Microsoft Entra External ID) erwies sich dafür als ungeeignet: vier grundlegende technische Hürden (inkompatibles Kontomodell, fehlende eigene Domain, keine fertige Registrierungsoberfläche, nur hochprivilegierte Schnittstellen verfügbar) hätten unverhältnismässigen Aufwand und Sicherheitsrisiken bedeutet.

Da das Portal zu diesem Zeitpunkt noch keine echten Kunden nutzte (nur Testkonten), liess sich die Anmeldelösung risikofrei austauschen.

## Umsetzung

Die Anmeldung wurde von Microsoft Entra External ID auf Supabase Auth umgestellt — ohne Unterbruch für die bestehende Anmeldung per E-Mail und Code. Darauf aufbauend wurde die Passkey-Anmeldung als zusätzliche, optionale Funktion gebaut: Kunden können unter "Sicherheit" im Portal einen Passkey einrichten und sich danach ohne E-Mail-Eingabe anmelden.

Beide Funktionen wurden mit 98 automatisierten Tests abgesichert (74 Unit-Tests, 24 End-to-End-Tests) und zusätzlich live mit einem echten Gerät (Windows Hello) verifiziert.

## Status, Kosten und Nutzen

Beide Funktionen laufen seit dem 21.09.2026 produktiv unter [obsi-hoferkundenportal.vercel.app](https://obsi-hoferkundenportal.vercel.app).

| Kriterium | Ergebnis |
| --- | --- |
| Zusätzliche Kosten | Keine — im bestehenden kostenlosen Supabase-Kontingent enthalten (bis 50'000 aktive Nutzer/Monat, aktuell weit unterschritten) |
| Kundennutzen | Schnellerer, passwortloser Login per Fingerabdruck/Gesichtserkennung — zusätzlich zum gewohnten E-Mail-Login, keine Umgewöhnung nötig |
| Technische Vereinfachung | Ein Anmeldesystem statt zwei getrennte (Login-Datenbank und Kunden-Datenbank liegen jetzt in derselben Supabase-Instanz) |

## Offene Punkte / nächste Schritte

- Der bisherige Microsoft-Entra-External-ID-Tenant wird nicht mehr gebraucht, ist aber noch aktiv — Entscheidung zum Rückbau steht aus (keine Kosten, keine Dringlichkeit)
- Ein zusätzlicher, temporärer Monitoring-Schalter (Erfolgs-Mail bei jedem nächtlichen Datenabgleich mit Dataverse) ist aktiv — wird nach der Beobachtungsphase wieder entfernt
- Vor einem grösseren Rollout sollte die technische Absenderadresse für System-Mails auf eine offizielle OBSI-Hofer-Domain umgestellt werden (aktuell eine Testadresse)
