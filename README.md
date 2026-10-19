# Wie funktioniert eigentlich…?

Vollautomatisierte TikTok-Erklärvideos (Deutsch, 62–75 s, 1080×1920): Low-Poly-3D, erzählt von ElevenLabs „Adam“, mit Wort-für-Wort-Untertiteln.

- Konzept und die 25 Entscheidungen: [docs/konzept.md](docs/konzept.md)
- Design-System, Regie-Tags und Looks: [docs/design-system.md](docs/design-system.md)
- Themen-Backlog: [docs/themen.md](docs/themen.md)
- Style-Frames (JPG): [docs/design/styleframes](docs/design/styleframes)

## Aufbau

| Was | Wo |
|---|---|
| Skripte mit Regie-Tags + Quellen | `content/topics/<id>.json` |
| Vertonung + Timeline | `scripts/build.py` |
| Vorlage (Untertitel, Karten, Labels, Kamera, Looks) | `video/src/kit/`, `video/src/Explainer.tsx` |
| 3D-Szenen pro Thema | `video/src/topics/<id>.tsx` |
| Rendern | `video/scripts/render.mjs` |

## Ein Video bauen

```
cd video && npm install && cd ..
python3 scripts/build.py windrad                 # Adam, wenn ELEVENLABS_API_KEY gesetzt ist, sonst Platzhalterstimme
cd video
node scripts/render.mjs windrad --stills 0,400,1200 --scale 0.4   # schnelle Standbilder zum Prüfen
node scripts/render.mjs windrad                  # -> out/windrad.mp4
node scripts/render.mjs windrad --look nacht     # anderer Look
npm run studio                                   # Remotion Studio zum Durchklicken
```

Benötigt: Node 22, Python 3, ffmpeg. Für die Platzhalterstimme `pip install piper-tts` (das Stimmmodell lädt `build.py` beim ersten Lauf von GitHub).
Den ElevenLabs-Key nie ins Repo schreiben: als Umgebungsvariable `ELEVENLABS_API_KEY` oder in eine lokale `.env` (ist in `.gitignore`).
