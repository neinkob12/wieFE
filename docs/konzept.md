# „Wie funktioniert eigentlich…?“ – Konzept (Stand 19.10.2026)

Vollautomatisierte TikTok-Erklärvideos: 4 Videos am Tag, je 62–75 s, Low-Poly-3D, Adam erzählt, immer Untertitel.

## Entscheidungen aus den 25 Fragen

| # | Thema | Entscheidung |
|---|---|---|
| 1 | Sprache | Deutsch, Pipeline so gebaut, dass später Englisch dazukommt (nur Skript + Stimme tauschen) |
| 2 | Länge | 62–75 s (sicher über 1 min für Creator Rewards) |
| 3 | Kanal | Neuer eigener Kanal |
| 4 | Name | „Wie funktioniert eigentlich…?“ |
| 5 | Grundlook | 3D, nach dem ersten Prototyp: **Nachtschicht**, detailreicher und realistischer, schnellere Animationen (Update 19.10.) |
| 6 | Farben | **Kein Orange, kein Rosa.** Palette aus dem Orchideen-Moodboard: Türkis `#6CB2B3` als Akzent, Bordeaux `#4A292F`, Salbei `#C9D1CA`, Nacht-Petrol (Update 19./20.10.) |
| 7 | Innenleben | Werkzeugkasten: Schnitt, Röntgen, Explosion je nach Szene |
| 8 | Figuren | Einfache gesichtslose Figuren |
| 9 | Untertitel | Wort für Wort, aktives Wort in Akzentfarbe, 2–4 Wörter |
| 10 | Labels | Wichtige Teile werden farblich hervorgehoben. Labels nur, wenn sie fürs Verstehen relevant sind |
| 11 | Schrift | Claude entscheidet: Space Grotesk 700 (Untertitel und Zahlen) |
| 12 | Hook | Verblüffende Zahl in den ersten 2 Sekunden |
| 13 | Ton | Ruhig, aber nicht trocken: du-Ansprache, Alltagsvergleiche, kurze Sätze, 1–2 Aha-Momente |
| 14 | Tempo | Adam ~1.08x (ElevenLabs-Parameter `speed`, Wort-Timings bleiben exakt) |
| 15 | Ablauf | Feste 6-Akt-Vorlage: Hook → Außen → Rein → Schritte → Aha → Loop |
| 16 | Fakten | Claude recherchiert + schreibt mit Quellenliste (`facts` im Skript), ihr gebt frei |
| 17 | Musik | Nicht eingebrannt, Sound beim Upload in TikTok (wie comparison) |
| 18 | SFX | Gängige Sounds aus der Bibliothek (comparison + CC0), Spezielles per ElevenLabs Sound Effects |
| 19 | ElevenLabs | Creator-Plan (100k Zeichen/Monat) → reicht knapp nicht, siehe unten |
| 20 | Ende | Nahtloser Loop: letzter Satz führt in den ersten |
| 21 | Rendern | In der Claude-Cloud (CPU, ca. 10–15 min pro Video) |
| 22 | Kontrolle | Anfangs jedes Video einzeln, später Wochen-Batch |
| 23 | Themen | Alltagsgeräte, Infrastruktur & „Wo geht es hin?“, Fahrzeuge & Sicherheit |
| 24 | Prototyp | Windrad |
| 25 | Ziel heute | Design-System + komplettes Windrad-Video |

## Musik und Monetarisierung

TikTok zahlt über Creator Rewards nur für Originalinhalte über 1 Minute. Wir brennen deshalb keine fremde Musik ein. Der Sound kommt beim Upload aus der TikTok-Bibliothek dazu, so wie bei comparison (Sound favorisieren, Lautstärke ca. 10–15 %). Wichtig: Über die offizielle API lassen sich keine TikTok-Sounds anhängen. Später bleibt dafür nur der Entwurfs-Modus (in der App fertig posten). Alternative, falls das nervt: eigene Tracks mit ElevenLabs Music generieren. Auf bezahlten Plänen gilt dafür eine kommerzielle Lizenz, die Tracks werden dann eingebrannt.

## ElevenLabs-Budget

4 Videos × 30 Tage ≈ 120 Videos × ca. 1.100 Zeichen ≈ **130k Zeichen/Monat**. Der Creator-Plan hat 100k. Optionen: Pro-Plan, Zusatz-Credits oder 3 Videos am Tag. Die Pipeline vertont jeden Satz einzeln und cacht ihn. Bei Korrekturen kostet nur der geänderte Satz neue Zeichen.

## Arbeitsteilung Stimme / Render

Die Cloud-Umgebung kommt nicht an `api.elevenlabs.io`. Deshalb vertont euer Partner lokal am Mac mit Adam (ein Befehl, Anleitung in `docs/vertonung.md`) und pusht die Audiodateien samt Timeline. Claude rendert danach in der Cloud. Der ElevenLabs-Key bleibt auf dem Rechner des Partners.

Bis dahin rendert die Pipeline mit einer Platzhalterstimme (Piper „Thorsten“, offline), im Video oben links als ENTWURF markiert. Die Platzhalter-Dateien werden nicht eingecheckt.

Optional für die Stil-Recherche: `www.youtube.com`, `i.ytimg.com`, `*.googlevideo.com` in der Cloud-Umgebung erlauben.

## Offene Punkte

- Windrad-Skript freigeben (Fakten mit Quellen in `content/topics/windrad.json`)
- Nach Freigabe: Adam-Vertonung durch den Partner (`docs/vertonung.md`), dann Themen 2–5 als Serie
