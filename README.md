# Spangen-Protokoll

Ein Trageprotokoll für die lose Zahnspange, gebaut für Kinder. Man trägt ein, von wann bis wann die Spange drin war, und sieht pro Tag, wie viel vom Tagesziel (16 Stunden) geschafft ist. Für jeden geschafften Tag wächst ein eigenes Tier, das selbst eine Zahnspange trägt.

Ausgelegt für das iPhone SE (375 × 667 Punkte), läuft in jedem aktuellen Browser. Kein Server, kein Konto, keine Werbung, keine externen Anfragen.

## Bedienung

- **Heute**: Ring mit dem Tagesfortschritt in Prozent, darin das Tier. Darunter der Knopf zum Eintragen, die häufigsten Zeiten als Schnellwahl, das Ergebnis von gestern, die Einträge des Tages und die Woche mit Prozent pro Tag und Erfüllungsquote.
- **Eintragen**: Tag wählen (Heute, Gestern, anderer Tag), Von und Bis setzen, speichern. Morgens schlägt die App vor, die letzte Nacht einzutragen.
- **Nachtragen**: Im Kalender einen Tag antippen. Im Kalender lässt sich ein Jahr zurückblättern.
- **Ändern und Löschen**: Einen Eintrag antippen. Nach dem Löschen gibt es sechs Sekunden lang „Rückgängig“.

## Wie gezählt wird

- **Über Mitternacht**: Ein Eintrag wie 20:30–7:00 bleibt ein Eintrag, zählt aber bis 24:00 zum Starttag (3,5 h) und ab 0:00 zum Folgetag (7 h).
- **Tagesziel**: 16 Stunden, in den Einstellungen änderbar. Ein neues Ziel gilt ab dem Tag der Änderung, frühere Tage behalten ihr altes Ziel.
- **Überschneidungen** werden abgelehnt, auch über Mitternacht hinweg. So kann eine Nacht nicht doppelt zählen.
- **Prozent**: ganzzahlig und abgerundet, damit 100 % erst erscheint, wenn das Ziel wirklich erreicht ist. Ein Tag kann über 100 % kommen (17 h von 16 h sind 106 %).
- **Woche**: Montag bis Sonntag (ISO-Kalenderwoche). Die Erfüllungsquote ist stufenlos: der Durchschnitt der Tagesprozente, jeder Tag höchstens 100 % (`wochenQuote()` in `js/auswertung.js`). Überstunden an einem Tag gleichen einen anderen Tag also nicht aus. Es zählen Tage ab dem ersten Eintrag bis gestern, der heutige Tag erst, sobald sein Ziel erreicht ist. So sinkt die Quote nicht jeden Morgen ab.
- **Vortag**: Am Folgetag zeigt die Startseite, ob das Ziel von gestern geschafft ist. Weil die Nacht bis 24:00 zum Vortag zählt, steht das Ergebnis fest, sobald die Nacht eingetragen ist.
- **Sterne**: Jede abgeschlossene Woche bringt 0 bis 3 Sterne (ab 70 %, 85 % und 100 %). Für Sterne gibt es Sachen für das Tier (alle 3 Sterne eine neue).
- **Tier**: Es schlüpft nach 3 geschafften Tagen und hat 13 Stufen bis „Unvergleichlich“ nach 365 geschafften Tagen (`STUFEN` in `js/tier.js`).
- **Serie**: geschaffte Tage in Folge. Der heutige Tag bricht die Serie nicht, solange er läuft.

Tier, Sterne, Sachen, Serien und fast alle Abzeichen werden aus den Einträgen berechnet und nicht separat gespeichert. Eine eingespielte Sicherung stellt deshalb den ganzen Fortschritt wieder her.

## Datensicherheit

Das Protokoll liegt nur auf dem Gerät, und zwar doppelt:

1. im `localStorage` unter dem Schlüssel `kfo-protokoll-v1`
2. in der IndexedDB `kfo-protokoll`, Store `stand` (aktuelle Kopie) und Store `verlauf` (Stand am Ende jedes Tages, die letzten 30 Tage)

Jede Änderung zählt `rev` hoch. Beim Start vergleicht die App beide Kopien und nimmt die neuere. Fehlt der localStorage-Eintrag oder ist er unlesbar, kommt der Stand aus der IndexedDB zurück; das Unlesbare bleibt als `kfo-protokoll-defekt-<Zeitpunkt>` liegen. Außerdem bittet die App den Browser per `navigator.storage.persist()`, nichts von sich aus zu löschen.

Wichtig fürs iPhone:

- **Nur vom Home-Bildschirm nutzen.** Safari löscht Daten von Webseiten nach 7 Tagen ohne Besuch. Für Apps auf dem Home-Bildschirm zählen nur die Tage, an denen sie benutzt werden.
- **Safari und Home-Bildschirm haben getrennte Speicher.** Wer erst in Safari einträgt und die App dann auf den Home-Bildschirm legt, startet dort leer. Vorher eine Sicherung machen und in der App einspielen. Die App zeigt in Safari einen Hinweis dazu.

### Sicherung (CSV)

Einstellungen → „Sicherung erstellen“. Auf dem Handy öffnet sich das Teilen-Menü (in „Dateien“ sichern, per Nachricht oder Mail verschicken), am Computer wird die Datei heruntergeladen. Ist die letzte Sicherung älter als 7 Tage, erinnert die Startseite daran.

Format: eine Zeile pro Eintrag, Semikolon, Dezimalkomma, UTF-8 mit BOM, damit Excel und Numbers die Datei direkt öffnen.

```
Datum;Wochentag;Von;Bis;Dauer (Std.)
2026-10-07;Mi;20:30;07:00;10,50
```

„Sicherung einspielen“ fügt nur fehlende Einträge hinzu und löscht nie etwas. Doppelte Einträge und Zeiten, die sich mit vorhandenen überschneiden, werden ausgelassen. Der Import versteht auch Dateien, die in Excel bearbeitet und mit Komma oder deutschem Datum (`7.10.2026`) gespeichert wurden.

## Lokal starten

```bash
python3 -m http.server 8743
```

Dann http://localhost:8743 öffnen. Es gibt keinen Build-Schritt, nur HTML, CSS und JavaScript-Module.

Tests (Node 20 oder neuer, keine Abhängigkeiten):

```bash
npm test
```

## Aufbau

| Datei | Inhalt |
|---|---|
| `js/app.js` | Bildschirme, Formular, Feiern, Sicherung |
| `js/speicher.js` | localStorage und IndexedDB, Abgleich, Einträge ändern, Import |
| `js/auswertung.js` | Teilung an Mitternacht, Tagessummen, Prüfung, Serien, Wochen, Sterne |
| `js/zeit.js` | Datum und Uhrzeit ohne Zeitzonenfallen |
| `js/csv.js` | CSV schreiben und lesen |
| `js/tier.js` | Tiere als SVG, Stufen, Sachen |
| `js/abzeichen.js` | Abzeichen und ihre Bedingungen |
| `js/effekte.js` | Töne und Konfetti (aus dem Bundesländer-Quiz) |
| `sw.js` | Offline-Cache. Nach Änderungen `VERSION` hochzählen |
| `tools/icon.mjs` | erzeugt die App-Icons (`node tools/icon.mjs`, braucht Google Chrome) |
| `tools/vorschau.html` | alle Tiere in allen Stufen und mit allen Sachen |

Neue Felder im Speicherformat ergänzt `migriere()` in `js/speicher.js`. Vorhandene Werte werden dabei nie überschrieben.

Schriften: [Grandstander](https://fonts.google.com/specimen/Grandstander) und [Nunito](https://fonts.google.com/specimen/Nunito), beide unter der SIL Open Font License.
