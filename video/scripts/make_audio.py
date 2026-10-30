"""Original score, impacts, and narration for the Origin showcase.

Narration uses Microsoft neural voices through edge-tts (generated for this
film). The bed and effects are synthesized here and are not third-party music.
"""

import asyncio
import math
import os
import random
import struct
import wave

import edge_tts

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "audio"))
RATE = 22050
BED_SECONDS = 84

LINES = [
    ("n1.mp3", "Origin. Design a pocket display, one pixel at a time."),
    ("n2.mp3", "Navigation, the grid, and the placement readout take their places."),
    ("n3.mp3", "Name a piece, then paint its dots. Start is the top-left painted dot."),
    ("n4.mp3", "Draw the next piece on top. Hide it, and the one underneath keeps its own start."),
    ("n5.mp3", "Set the width and height of the display, then copy the placements."),
    ("n6.mp3", "Origin."),
]


def write_wav(path: str, samples) -> None:
    with wave.open(path, "w") as handle:
        handle.setnchannels(2)
        handle.setsampwidth(2)
        handle.setframerate(RATE)
        frames = bytearray()
        for left, right in samples:
            frames += struct.pack("<hh", int(max(-1, min(1, left)) * 32767), int(max(-1, min(1, right)) * 32767))
        handle.writeframes(frames)


def bed() -> None:
    total = RATE * BED_SECONDS
    rng = random.Random(11)
    low = 0.0
    samples = []
    for i in range(total):
        t = i / RATE
        fade = min(1.0, t / 2.5) * min(1.0, (BED_SECONDS - t) / 3.0)
        trem = 0.82 + 0.18 * math.sin(2 * math.pi * 0.07 * t)
        tone = (
            math.sin(2 * math.pi * 110 * t) * 0.45
            + math.sin(2 * math.pi * 164.81 * t) * 0.28
            + math.sin(2 * math.pi * 220 * t) * 0.12
        )
        noise = rng.uniform(-1, 1)
        low += 0.02 * (noise - low)
        sample = (tone * 0.045 + low * 0.02) * trem * fade
        width = math.sin(2 * math.pi * 0.03 * t) * 0.15
        samples.append((sample * (1 - width), sample * (1 + width)))
    write_wav(os.path.join(ROOT, "bed.wav"), samples)


def impact() -> None:
    samples = []
    for i in range(int(RATE * 0.28)):
        t = i / RATE
        env = math.exp(-t * 14)
        body = math.sin(2 * math.pi * 140 * t) * 0.55 + math.sin(2 * math.pi * 280 * t) * 0.2
        samples.append((body * env * 0.7, body * env * 0.7))
    write_wav(os.path.join(ROOT, "impact.wav"), samples)


def whoosh() -> None:
    rng = random.Random(3)
    samples = []
    total = int(RATE * 0.55)
    low = 0.0
    for i in range(total):
        t = i / total
        env = math.sin(math.pi * t) ** 1.4
        noise = rng.uniform(-1, 1)
        low += 0.08 * (noise - low)
        sample = low * env * 0.45
        samples.append((sample, sample * 0.85))
    write_wav(os.path.join(ROOT, "whoosh.wav"), samples)


def tick() -> None:
    samples = []
    for i in range(int(RATE * 0.07)):
        t = i / RATE
        env = math.exp(-t * 60)
        body = math.sin(2 * math.pi * 980 * t)
        samples.append((body * env * 0.25, body * env * 0.25))
    write_wav(os.path.join(ROOT, "tick.wav"), samples)


async def narration() -> None:
    for name, text in LINES:
        communicate = edge_tts.Communicate(text, "en-US-AndrewNeural", rate="-8%")
        await communicate.save(os.path.join(ROOT, name))
        print(name, "written")


def main() -> None:
    os.makedirs(ROOT, exist_ok=True)
    bed()
    impact()
    whoosh()
    tick()
    asyncio.run(narration())
    print("audio ready", ROOT)


if __name__ == "__main__":
    main()
