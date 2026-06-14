# generate_sounds.py — Flow Lines SFX + music synthesiser (FL-UX-A-Audio)
# Pure Python stdlib (wave/struct/math/random) — no external deps, no ffmpeg
# (neither was available). Outputs 16-bit mono WAV to public/sounds/ per the
# brief's per-sound synthesis specs. Howler selects codec by extension, so the
# service files reference .wav. All assets are original synthesis (CC0-clean).
import math
import os
import random
import struct
import wave

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "sounds")
os.makedirs(OUT, exist_ok=True)

random.seed(1234)  # deterministic output across runs


def write_wav(name, samples, rate):
    """Clamp floats to [-1,1] and write a 16-bit mono WAV."""
    path = os.path.join(OUT, name)
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        frames = bytearray()
        for s in samples:
            v = int(max(-1.0, min(1.0, s)) * 32767)
            frames += struct.pack("<h", v)
        w.writeframes(bytes(frames))
    dur = len(samples) / rate
    print(f"  {name}: {dur:.2f}s @ {rate}Hz ({len(frames)//1024} KB)")
    return dur


def lowpass(samples, rate, fc):
    """Simple one-pole low-pass filter."""
    rc = 1.0 / (2 * math.pi * fc)
    dt = 1.0 / rate
    alpha = dt / (rc + dt)
    out = []
    prev = 0.0
    for x in samples:
        prev = prev + alpha * (x - prev)
        out.append(prev)
    return out


def edge_fade(samples, rate, ms):
    """In-place linear fade on the first/last `ms` (anti-click / loop seam)."""
    n = int(rate * ms / 1000)
    for i in range(min(n, len(samples))):
        g = i / n
        samples[i] *= g
        samples[-1 - i] *= g
    return samples


# ── path-draw: filtered white noise, slow attack, loopable (2s) ──────────────
def gen_path_draw(rate=44100):
    n = int(rate * 2.0)
    noise = [random.uniform(-1, 1) for _ in range(n)]
    filtered = lowpass(noise, rate, 800)
    out = [s * 0.15 for s in filtered]
    edge_fade(out, rate, 100)  # 0.1s fade at both loop ends
    return write_wav("path-draw.wav", out, rate)


# ── lock-in: 880→440 sine sweep + 1320Hz warmth, fast attack (~0.3s) ─────────
def gen_lock_in(rate=44100):
    dur = 0.3
    n = int(rate * dur)
    out = []
    for i in range(n):
        t = i / rate
        frac = t / dur
        f = 880 + (440 - 880) * frac          # downward chime sweep
        env = math.exp(-t * 16) if t > 0.005 else t / 0.005
        s = math.sin(2 * math.pi * f * t) * 0.8
        s += math.sin(2 * math.pi * 1320 * t) * 0.3  # bright overtone
        out.append(s * env)
    edge_fade(out, rate, 3)
    return write_wav("lock-in.wav", out, rate)


# ── undo: 220→110 sine, very short click (~0.2s) ─────────────────────────────
def gen_undo(rate=44100):
    dur = 0.2
    n = int(rate * dur)
    out = []
    for i in range(n):
        t = i / rate
        f = 220 + (110 - 220) * (t / dur)
        env = math.exp(-t * 22) if t > 0.002 else t / 0.002
        out.append(math.sin(2 * math.pi * f * t) * 0.6 * env)
    edge_fade(out, rate, 3)
    return write_wav("undo.wav", out, rate)


# ── win: ascending arpeggio C5-E5-G5-C6 with a short delay tail (~1.5s) ──────
def gen_win(rate=44100):
    notes = [523.25, 659.25, 783.99, 1046.50]
    stagger, note_dur, total = 0.25, 0.4, 1.5
    n = int(rate * total)
    out = [0.0] * n
    for idx, freq in enumerate(notes):
        start = int(idx * stagger * rate)
        for i in range(int(note_dur * rate)):
            if start + i >= n:
                break
            t = i / rate
            env = math.exp(-t * 6) if t > 0.005 else t / 0.005
            out[start + i] += math.sin(2 * math.pi * freq * t) * 0.5 * env
    # Simple feedback delay (reverb-ish tail).
    d = int(0.12 * rate)
    for i in range(d, n):
        out[i] += out[i - d] * 0.4
    peak = max(1e-6, max(abs(s) for s in out))
    out = [s / peak * 0.85 for s in out]  # normalise headroom
    edge_fade(out, rate, 5)
    return write_wav("win.wav", out, rate)


# ── hint: soft ping 1047→1319 (~0.3s) ────────────────────────────────────────
def gen_hint(rate=44100):
    dur = 0.3
    n = int(rate * dur)
    out = []
    for i in range(n):
        t = i / rate
        f = 1047 + (1319 - 1047) * min(1.0, t / 0.2)
        env = math.exp(-t * 14) if t > 0.003 else t / 0.003
        out.append(math.sin(2 * math.pi * f * t) * 0.5 * env)
    edge_fade(out, rate, 3)
    return write_wav("hint.wav", out, rate)


# ── ambient-drops: water-drop soundscape over a soft flow (30s, seamless) ────
def gen_ambient_drops(duration=30, sr=22050):
    """Gentle water drops over a low filtered-noise flow. Drops are scheduled
    only inside [0.8, duration-1.2]s so the loop seam lands in a silent gap →
    seamless Howler loop. Deterministic (re-seeded so call order can't shift it)."""
    random.seed(1234)
    n = int(duration * sr)
    out = [0.0] * n

    # Layer 1 — soft background flow: white noise → LP 300Hz, very low gain.
    flow = lowpass([random.uniform(-1, 1) for _ in range(n)], sr, 300)
    for i in range(n):
        out[i] += flow[i] * 0.04

    def add_drop(start_s, f0, vol, dur_s, decay):
        start = int(start_s * sr)
        for i in range(int(dur_s * sr)):
            if start + i >= n:
                break
            t = i / sr
            f = f0 - (f0 * 0.5) * (t / dur_s)        # chirp down ~half an octave
            env = math.exp(-t * decay) if t > 0.003 else t / 0.003
            out[start + i] += math.sin(2 * math.pi * f * t) * vol * env

    # Layer 2 — sporadic surface drops (~every 0.8–2.5s), ~15–20 over 30s.
    drops = 0
    t = 0.8
    while t < duration - 1.2:
        add_drop(t, random.uniform(600, 1200), random.uniform(0.3, 0.7), 0.15, 26)
        drops += 1
        t += random.uniform(0.8, 2.5)

    # Layer 3 — occasional deep resonant drop (every 5–8s) for depth.
    t = random.uniform(5, 8)
    while t < duration - 1.2:
        add_drop(t, 180, 0.25, 0.4, 7)
        t += random.uniform(5, 8)

    peak = max(1e-6, max(abs(s) for s in out))
    out = [s / peak * 0.7 for s in out]  # normalise to 0.7 peak
    edge_fade(out, sr, 500)              # 0.5s fade in/out at the loop seam
    print(f"  (ambient-drops: ~{drops} surface drops)")
    return write_wav("ambient-drops.wav", out, sr)


print("Generating Flow Lines audio ->", OUT)
gen_path_draw()
gen_lock_in()
gen_undo()
gen_win()
gen_hint()
gen_ambient_drops()
print("Done.")
