# Vertonung mit Adam (lokal am Mac)

Die Cloud-Umgebung kommt nicht an ElevenLabs. Deshalb läuft die Vertonung bei dir lokal, gerendert wird danach in der Cloud.
Pro Video ist es ein Befehl. Der ElevenLabs-Key bleibt dabei auf deinem Rechner.

## Einmalig einrichten (ca. 5 Minuten)

Terminal öffnen:
```
brew install git gh ffmpeg
gh auth login
cd ~
gh repo clone neinkob12/wieFE
cd wieFE
```
`python3` ist auf dem Mac schon da. Weitere Pakete braucht das Skript für Adam nicht.

Dann im Ordner `wieFE` eine Datei `.env` anlegen, mit dieser einen Zeile (dein Key statt `...`):
```
ELEVENLABS_API_KEY=...
```
Die `.env` steht in `.gitignore` und landet nie im Repo. Den Key nicht in Chats kopieren.

## Pro Video

```
cd ~/wieFE
git pull
git checkout claude/prototyp-windrad        # solange der Prototyp-Branch offen ist, sonst main
python3 scripts/build.py windrad
```
Das Skript vertont das freigegebene Skript aus `content/topics/windrad.json` Satz für Satz mit Adam (`eleven_multilingual_v2`, Tempo 1.08) und holt die Wort-Zeitstempel für die Untertitel gleich mit. Am Ende zeigt es die Länge, z. B. `windrad: 66.3 s, 196 Woerter, Stimme: adam`.

Reinhören: Die Sätze liegen als MP3 in `video/public/audio/windrad/` (Dateien `adam_*.mp3`).

Dann hochladen:
```
git add video/public/audio/windrad video/public/timelines/windrad.json
git commit -m "Adam-Vertonung windrad"
git push
```
Danach Claude Bescheid geben („windrad ist vertont“). Claude rendert das Video in der Cloud.

## Gut zu wissen

- **Zeichen sparen:** Jeder Satz wird gecacht. Wird im Skript nur ein Satz geändert, kostet ein neuer Lauf nur diesen Satz. Die Cache-Dateien liegen mit im Repo, darum vor jedem Lauf `git pull`.
- **Budget:** Ein Video hat ca. 1.000–1.200 Zeichen. Der Creator-Plan (100.000 Zeichen) reicht für etwa 3 Videos am Tag, für 4 am Tag braucht es Zusatz-Credits oder Pro.
- **Aussprache:** Klingt ein Wort falsch, im Skript `{Anzeige|gesprochen}` schreiben, z. B. `{150|hundertfünfzig}`. Oder dauerhaft in `config/aussprache.json` eintragen.
- **Ohne Key** nimmt das Skript automatisch die Platzhalterstimme (nur für Entwürfe, wird nicht eingecheckt).
- **Fehler `CERTIFICATE_VERIFY_FAILED`:** einmal `/Applications/Python 3.*/Install Certificates.command` doppelklicken (Python von python.org).
- **Fehler `HTTP Error 401`:** Key falsch oder abgelaufen. **`429`:** zu viele Anfragen, kurz warten und nochmal starten, fertige Sätze bleiben erhalten.
