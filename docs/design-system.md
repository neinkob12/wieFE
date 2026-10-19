# Design-System „Wie funktioniert eigentlich…?“

## Wie die Automatisierung funktioniert

Die Design-Vorlage ist Code, kein After-Effects-Projekt. Ein Video besteht aus drei Teilen:

| Teil | Datei | Wer schreibt es | Aufwand pro Thema |
|---|---|---|---|
| Skript mit Regie-Tags + Quellen | `content/topics/<id>.json` | Claude, ihr gebt frei | klein |
| 3D-Szene (Objekt, Welt, Kamera-Einstellungen) | `video/src/topics/<id>.tsx` | Claude | mittel, wird mit jedem Thema kleiner |
| Vorlage (Untertitel, Karten, Labels, Licht, Looks, Kamera-Logik, Sound) | `video/src/kit/`, `video/src/Explainer.tsx` | einmal gebaut | 0 |

Ablauf pro Video:
```
python3 scripts/build.py windrad          # vertont Satz für Satz, Wort-Timings, Cues, SFX -> Timeline
cd video && node scripts/render.mjs windrad   # 3D + Overlays + Ton -> out/windrad.mp4
```

Die Bibliothek in `kit/parts.tsx` wächst mit jedem Thema (Zahnrad, Rohr, Kabel, Energiefluss, Haus, Figur, Wolke, Mast …). Darum ist Thema 20 deutlich schneller gebaut als Thema 2. Fotorealistische 3D-Modelle oder KI-Video passen nicht: Rotor, Getriebe und Wasserwege müssen sich exakt passend zum gesprochenen Wort bewegen. Das geht nur, wenn jedes Teil einzeln ansteuerbar ist.

## Die 6-Akt-Vorlage (62–75 s)

| Akt | Zeit | Inhalt |
|---|---|---|
| hook | 0–8 s | Verblüffende Zahl als Karte, ab Frame 0 voll sichtbar |
| aussen | –25 s | Objekt in seiner Welt, Größenvergleich, Grundprinzip |
| rein | 1–2 s | „Schauen wir mal rein“ → Röntgen/Schnitt |
| schritte | –50 s | 3–5 Schritte, je ein Teil hervorgehoben, Kamera fährt mit |
| aha | –57 s | die eine Zahl, die man weitererzählt |
| loop | –65 s | Kamera zurück zur ersten Einstellung, der letzte Satz führt in den ersten |

## Regie-Tags im Skript

| Tag | Wirkung |
|---|---|
| `[shot:name\|frames]` | Kamera fährt zur Einstellung `name` (definiert im Thema), Dauer optional |
| `[hl:teil]`, `[hl:a+b]`, `[hl:-]` | Teil(e) leuchten in Akzentfarbe, bis zum nächsten `hl` |
| `[xray:on/off]` | Hülle wird glasig mit Kantenlinien (Röntgen) |
| `[label:anker\|Text\|r/l/d]` | Schild mit Linie an einem 3D-Punkt, nur wenn es fürs Verstehen hilft |
| `[card:Text\|Untertitel]`, `[card:-]` | Große Zahlen-Karte oben |
| `[fx:name]` | Themen-Ereignis starten (z. B. Strom fließt) |
| `[name:on/off]` | Beliebige Schalter im Thema (wind, dom, mass, speed …) |
| `{300\|dreihundert}` | Untertitel zeigt „300“, die Stimme sagt „dreihundert“ |

## Looks

Alle Szenen benutzen nur Farb-Rollen (`ground`, `object`, `accent`, `energy` …). Ein Look ist eine Palette plus Licht und Materialregeln in `video/src/kit/theme.ts`. Ein Look-Wechsel ist ein Parameter, kein neues Rendering-Setup.

| Look | Idee | Farben | Material/Licht | Schrift |
|---|---|---|---|---|
| **Diorama** (gewählt) | Warm & gedämpft, Welt als Insel mit Erdschichten | Sand `#E4D6BF`, Wiese `#5E8C76`, Creme `#F4EFE6`, Tinte `#2B2A33`, Akzent Orange `#E8743B`, Energie `#F2C14E` | Flat-Shading (Low-Poly-Facetten), matt, warme Sonne, statische Papier-Körnung | Manrope 800 + Fraunces 900 |
| **Nachtschicht** (Vorschlag) | Dunkle Bühne, Technik wird zur Lichtspur. Laut Recherche näher an Simplicissimus | Nachtblau `#0B1424`, Stahl `#D8E3EF`, Akzent `#FF8A3D`, Energie Cyan `#5CE1FF` | Kühles Licht, Energie leuchtet (additiver Schein), starke Vignette | Space Grotesk |
| **Knete** (Vorschlag) | Weiches Spielzeug-Diorama in Pastell | Himmel `#BFE3F2`, Mint `#A8DDB5`, Akzent Pink `#FF6F91`, Gelb `#FFC94A` | Weich schattiert, viel Umgebungslicht, kaum Körnung | Nunito 900 |

Style-Frames: `docs/design/styleframes/`.

## Regeln

- **Ein Akzent pro Moment.** Nur das Teil, über das gerade gesprochen wird, ist orange. Alles andere bleibt ruhig.
- **Abstrakt statt detailliert.** Ein Getriebe besteht aus zwei Zahnradpaaren, nicht aus 40 Teilen. Proportionen dürfen für die Lesbarkeit übertrieben sein (die Gondel ist ca. 1,5x zu groß).
- **Kamera bewegt sich immer.** Leichtes Atmen plus langsame Orbits, Übergänge mit Ease-in-out. Das Atmen ist periodisch über die Videolänge, damit der Loop nahtlos bleibt.
- **Größenvergleiche mit Bekanntem.** Kölner Dom, Fußballfeld, Badewanne, ICE.
- **Figuren ohne Gesicht** (Kapsel + Kugel) für Maßstab und Alltagsbezug.
- **Safe-Zones 1080×1920:** oben 220 px, unten 420 px, rechts 140 px frei (TikTok-Bedienelemente). Untertitel sitzen knapp über der unteren Zone, Karten unter der oberen.
- **Untertitel:** 2–4 Wörter, Manrope 800 / 78 px, Tinten-Kontur, aktives Wort in Akzentfarbe mit kleinem Pop.
- **Loop:** Der Rotor dreht sich so, dass nach der Videolänge genau eine Drittel-Umdrehung erreicht ist. Wolken und Kamera-Atmen sind periodisch. Karte und Kamera stehen im letzten Frame wie im ersten.

## Sound

- Stimme: ElevenLabs Adam, `eleven_multilingual_v2`, speed 1.08, Endpoint `with-timestamps` (exakte Wort-Timings für die Untertitel)
- Whoosh bei Kamerafahrten, Pop bei Karten, Tick bei Labels (aus comparison)
- Wind, Maschinenbrummen und Generator-Summen sind mit ffmpeg erzeugt (ElevenLabs Sound Effects ist in der Cloud-Umgebung blockiert, siehe `konzept.md`)
- Keine Musik eingebrannt (kommt beim Upload)

## Neues Thema anlegen

1. `content/topics/<id>.json`: Skript in 6 Akten mit Tags und `facts` (Quelle pro Zahl)
2. `video/src/topics/<id>.tsx`: Szene aus `kit/parts` bauen, `shots` und `anchors` definieren, in `topics/index.ts` eintragen
3. `python3 scripts/build.py <id>` → Stills prüfen (`node scripts/render.mjs <id> --stills 0,300,900 --scale 0.4`) → Video rendern
