"""Vertont ein Thema und schreibt die Timeline fuer Remotion.

Aufruf: python3 scripts/build.py windrad [--voice adam|piper]
Liest content/topics/<id>.json, schreibt video/public/audio/<id>/*.mp3 und video/public/timelines/<id>.json.

Skript-Syntax im Text:
  [typ:arg|extra]       Regie-Tag, gilt ab dem naechsten Wort (am Satzende: ab Satzende)
                        shot:name|frames  hl:teil(+teil2)|-  label:anker|Text  card:Text|Untertitel  card:-
                        xray:on|off  fx:name  und beliebige weitere Schalter (wind:on, dom:off ...)
  {Anzeige|gesprochen}  z. B. {300|dreihundert}: Untertitel zeigt 300, Stimme sagt dreihundert

Stimme: ElevenLabs "Adam" (eleven_multilingual_v2, Endpoint with-timestamps -> exakte Wort-Timings).
Ohne ELEVENLABS_API_KEY (oder mit --voice piper): Platzhalterstimme Piper "Thorsten", Wort-Timings geschaetzt.
Jeder Satz wird einzeln vertont und gecacht: nur geaenderte Saetze kosten neue Zeichen.
"""
import base64, hashlib, json, math, os, re, subprocess, sys, tarfile, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if (ROOT / ".env").exists():
    for line in (ROOT / ".env").read_text(encoding="utf-8").splitlines():
        if "=" in line and not line.lstrip().startswith("#"):
            k, v = line.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"'))
PUB = ROOT / "video" / "public"
FPS = 30
ADAM = "pNInz6obpgDQGcFmaJgB"
SPEED = 1.08          # Adam leicht schneller (ElevenLabs-Parameter, kein atempo -> Timings bleiben exakt)
GAP_SENTENCE = 0.22   # Pause zwischen Saetzen (s)
GAP_ACT = 0.38        # Pause zwischen Akten (s)
PIPER_URL = "https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-de-thorsten-low.tar.gz"
PIPER_DIR = Path.home() / ".cache" / "wiefe" / "piper"

TOKEN = re.compile(r"\[[^\]]+\]|\{[^}]+\}\S*|\S+")


def pron_map():
    p = ROOT / "config" / "aussprache.json"
    d = json.loads(p.read_text(encoding="utf-8")) if p.exists() else {}
    return {k: v for k, v in d.items() if not k.startswith("_")}


def parse_tag(t):
    body = t[1:-1]
    typ, _, rest = body.partition(":")
    arg, _, extra = rest.partition("|")
    tag = {"type": typ.strip(), "arg": arg.strip()}
    if extra:
        tag["extra"] = extra.strip()
    return tag


def sentences(acts, pron):
    """Zerlegt die Akte in Saetze: [{act, words:[(anzeige, gesprochen)], tags:[(wortindex, tag)]}]"""
    out = []
    for act in acts:
        cur = {"act": act["name"], "words": [], "tags": []}
        for tok in TOKEN.findall(act["text"]):
            if tok.startswith("["):
                cur["tags"].append((len(cur["words"]), parse_tag(tok)))
                continue
            m = re.match(r"\{([^|}]*)\|([^}]*)\}(\S*)", tok)
            if m:
                disp, spk = m.group(1) + m.group(3), m.group(2) + m.group(3)
            else:
                core = tok.strip(".,!?:;…–\"'")
                disp, spk = tok, tok.replace(core, pron[core]) if core in pron else tok
            cur["words"].append((disp, spk))
            if re.search(r"[.!?…]$", disp):
                out.append(cur)
                cur = {"act": act["name"], "words": [], "tags": []}
        if cur["words"] or cur["tags"]:
            out.append(cur)
    return out


def dur_of(path):
    return float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)]).decode())


def word_spans(words):
    text, spans = "", []
    for _, spk in words:
        if text:
            text += " "
        spans.append((len(text), len(text) + len(spk)))
        text += spk
    return text, spans


def tts_eleven(words, out):
    text, spans = word_spans(words)
    body = {"text": text, "model_id": "eleven_multilingual_v2", "language_code": "de",
            "voice_settings": {"stability": 0.7, "similarity_boost": 0.8, "style": 0, "speed": SPEED}}
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{ADAM}/with-timestamps?output_format=mp3_44100_128",
        data=json.dumps(body).encode(), headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json"})
    for i in range(4):
        try:
            res = json.loads(urllib.request.urlopen(req, timeout=120).read())
            break
        except Exception:
            if i == 3:
                raise
            __import__("time").sleep(2 ** (i + 1))
    raw = out.with_suffix(".raw.mp3")
    raw.write_bytes(base64.b64decode(res["audio_base64"]))
    al = res["alignment"]
    st, en = al["character_start_times_seconds"], al["character_end_times_seconds"]
    times = []
    for a, b in spans:
        idx = [i for i in range(a, min(b, len(st)))] or [min(a, len(st) - 1)]
        times.append((st[idx[0]], en[idx[-1]]))
    lead = max(0.0, times[0][0] - 0.03)
    end = times[-1][1] + 0.1
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{lead:.3f}", "-to", f"{end:.3f}", "-i", str(raw),
                    "-b:a", "128k", str(out)], check=True)
    raw.unlink()
    return [(s - lead, e - lead) for s, e in times]


def piper_model():
    onnx = PIPER_DIR / "de-thorsten-low.onnx"
    if not onnx.exists():
        PIPER_DIR.mkdir(parents=True, exist_ok=True)
        tgz = PIPER_DIR / "voice.tar.gz"
        urllib.request.urlretrieve(PIPER_URL, tgz)
        with tarfile.open(tgz) as t:
            t.extractall(PIPER_DIR, filter="data")
        tgz.unlink()
    return onnx


def syllables(w):
    return max(1, len(re.findall(r"[aeiouäöüy]+", w.lower())))


def tts_piper(words, out):
    text, _ = word_spans(words)
    wav = out.with_suffix(".wav")
    subprocess.run([sys.executable, "-m", "piper", "-m", str(piper_model()), "-f", str(wav), "--length-scale", "0.92"],
                   input=text.encode(), check=True, capture_output=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(wav), "-af",
                    "silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse",
                    "-b:a", "128k", str(out)], check=True)
    wav.unlink()
    total = dur_of(out)
    # Geschaetzte Wort-Timings: Silben-Gewicht + Pausen nach Satzzeichen
    weights = []
    for _, spk in words:
        pause = 0.9 if re.search(r"[,:;–]$", spk) else 0.0
        weights.append((syllables(spk) + 0.4, pause))
    unit = total / sum(w + p for w, p in weights)
    t, times = 0.0, []
    for w, p in weights:
        times.append((t, t + w * unit))
        t += (w + p) * unit
    return times


def synth(vid, words, engine):
    adir = PUB / "audio" / vid
    adir.mkdir(parents=True, exist_ok=True)
    text, _ = word_spans(words)
    key = hashlib.sha1(f"{engine}|{SPEED}|{text}".encode()).hexdigest()[:12]
    out = adir / f"{engine}_{key}.mp3"
    meta = out.with_suffix(".json")
    if out.exists() and meta.exists():
        return out, json.loads(meta.read_text())
    times = tts_eleven(words, out) if engine == "adam" else tts_piper(words, out)
    meta.write_text(json.dumps(times))
    return out, times


def synth_sfx():
    """Ambient-Sounds, die es nirgends passend gibt, selbst erzeugen (einmalig, gecacht)."""
    sdir = PUB / "sfx"
    sdir.mkdir(parents=True, exist_ok=True)
    recipes = {
        # Wind: braunes Rauschen, tiefpass, langsames Auf und Ab
        "wind.mp3": "anoisesrc=color=brown:amplitude=0.5:d=20,lowpass=f=700,tremolo=f=0.15:d=0.5,afade=t=in:d=1,afade=t=out:st=19:d=1",
        # Maschinenbrummen in der Gondel
        "hum.mp3": "sine=f=55:d=20,volume=0.6[a];sine=f=110:d=20,volume=0.3[b];anoisesrc=color=pink:amplitude=0.08:d=20,lowpass=f=300[c];[a][b][c]amix=3,afade=t=in:d=0.8",
        # Elektrisches Summen im Generator
        "buzz.mp3": "sine=f=100:d=20,volume=0.4[a];sine=f=200:d=20,volume=0.25[b];sine=f=300:d=20,volume=0.15[c];[a][b][c]amix=3,afade=t=in:d=0.5",
    }
    for name, graph in recipes.items():
        p = sdir / name
        if not p.exists():
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-filter_complex", graph, "-ac", "1", "-b:a", "96k", str(p)], check=True)


def build(vid, engine):
    spec = json.loads((ROOT / "content" / "topics" / f"{vid}.json").read_text(encoding="utf-8"))
    sents = sentences(spec["acts"], pron_map())
    t = 0.0
    voice, words, cues, acts = [], [], [], []
    prev_act = None
    for s in sents:
        if prev_act is not None:
            t += GAP_ACT if s["act"] != prev_act else GAP_SENTENCE
        if s["act"] != prev_act:
            if acts:
                acts[-1]["to"] = round(t * FPS)
            acts.append({"name": s["act"], "from": round(t * FPS), "to": None})
        prev_act = s["act"]
        if not s["words"]:
            for _, tag in s["tags"]:
                cues.append({**tag, "f": round(t * FPS)})
            continue
        path, times = synth(vid, s["words"], engine)
        start = t
        voice.append({"src": str(path.relative_to(PUB)), "from": round(start * FPS)})
        for (disp, _), (a, b) in zip(s["words"], times):
            words.append({"w": disp, "s": round((start + a) * FPS), "e": round((start + b) * FPS)})
        for i, tag in s["tags"]:
            at = start + (times[i][0] if i < len(times) else times[-1][1])
            lead = 6 if tag["type"] == "shot" else 0  # Kamera faehrt minimal vor dem Wort los
            cues.append({**tag, "f": max(0, round(at * FPS) - lead)})
        t = start + dur_of(path)
    # Loop: das Video endet direkt nach dem letzten Wort, der Anfang schliesst nahtlos an
    total = round((t + 0.18) * FPS)
    acts[-1]["to"] = total
    # Tags ganz am Anfang des Videos gelten ab Frame 0
    first_word = words[0]["s"] if words else 0
    for c in cues:
        if c["f"] <= first_word:
            c["f"] = 0
    cues.sort(key=lambda c: c["f"])

    synth_sfx()
    sfx = [{"src": "sfx/wind.mp3", "from": f0, "volume": 0.16} for f0 in range(0, total, 20 * FPS - 30)]
    on_off = lambda typ: [(c["f"], c["arg"]) for c in cues if c["type"] == typ]  # noqa: E731

    def spans(typ, start_fx=None):
        res, cur = [], None
        for f0, arg in on_off(typ):
            if arg == "on" and cur is None:
                cur = f0
            elif arg in ("off", "-") and cur is not None:
                res.append((cur, f0))
                cur = None
        if cur is not None:
            res.append((cur, total))
        return res
    for a, b in spans("xray"):
        for f0 in range(a, b, 20 * FPS):
            sfx.append({"src": "sfx/hum.mp3", "from": f0, "volume": 0.22, "dur": min(20 * FPS, b - f0)})
        gen = next((c["f"] for c in cues if c["type"] == "fx" and c["arg"] == "generator"), None)
        if gen is not None and a <= gen < b:
            sfx.append({"src": "sfx/buzz.mp3", "from": gen, "volume": 0.1, "dur": b - gen})
    for c in cues:
        if c["f"] == 0:
            continue
        if c["type"] == "shot":
            sfx.append({"src": "sfx/whoosh.mp3", "from": max(0, c["f"] - 4), "volume": 0.3 if int(c.get("extra") or 36) > 40 else 0.15})
        elif c["type"] == "card" and c["arg"] != "-":
            sfx.append({"src": "sfx/pop.mp3", "from": c["f"], "volume": 0.45})
        elif c["type"] == "label":
            sfx.append({"src": "sfx/tick.mp3", "from": c["f"], "volume": 0.35})
    # Fluegel rauschen vorbei, wenn die Kamera an der Spitze ist (Rotor-Takt wie in topics/windrad.tsx)
    if spec.get("topic") == "windrad":
        base = 2 * math.pi / (6 * FPS)
        third = 2 * math.pi / 3
        n = max(1, round(total * base / third))
        per = total / n
        tip = [c for c in cues if c["type"] == "shot"]
        def shot_at(f0):
            cur = "tip"
            for c in tip:
                if c["f"] <= f0:
                    cur = c["arg"]
            return cur
        k = 0
        while k * per < total:
            f0 = round(k * per) - 8
            if f0 >= 0 and shot_at(f0) == "tip":
                sfx.append({"src": "sfx/whoosh.mp3", "from": f0, "volume": 0.22})
            k += 1

    tl = {"id": vid, "topic": spec.get("topic", vid), "title": spec["title"], "fps": FPS, "durationInFrames": total,
          "look": spec.get("look", "diorama"), "draftVoice": engine != "adam", "voice": voice, "words": words,
          "cues": cues, "acts": acts, "sfx": sfx}
    (PUB / "timelines").mkdir(parents=True, exist_ok=True)
    (PUB / "timelines" / f"{vid}.json").write_text(json.dumps(tl, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{vid}: {total / FPS:.1f} s, {len(words)} Woerter, Stimme: {engine}")
    for a in acts:
        print(f"  {a['name']:9s} {a['from'] / FPS:5.1f} - {a['to'] / FPS:5.1f} s")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    engine = "adam" if os.environ.get("ELEVENLABS_API_KEY") else "piper"
    if "--voice" in sys.argv:
        engine = sys.argv[sys.argv.index("--voice") + 1]
        args = [a for a in args if a != engine]
    for vid in args:
        build(vid, engine)
