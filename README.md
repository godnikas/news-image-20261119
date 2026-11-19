# news-image-20261119 — "THE WORLD TODAY"

A program that draws a newspaper front page summing up the world news of
Thursday 19 November 2026, as a single 1024×1024 PNG.

## Run

```sh
node main.ts
```

Writes `entry.png` to `$MAKEFUN_OUTPUT_DIR` (default `/output`).
Node 22+, standard library only — no network, no clock, no randomness,
so two runs write byte-identical files.

## The image

Front page of a paper called **THE WORLD TODAY**, dated
**THURSDAY 19 NOVEMBER 2026**:

- **Hero — GTA VI arrives:** the global rollout begins; gamers return to
  Vice City after a 13-year wait (neon sunset skyline).
- **US–Iran:** the US struck missile sites on Qeshm on 17 Nov; Iran hit
  US bases in Kuwait and Bahrain on 18 Nov.
- **EU–Ukraine:** the EU proposes a €45bn loan for Ukraine in 2027
  (€25bn for arms, €20bn civilian aid).
- **Gaza:** Israel's ground push in central Gaza, past the Yellow Line,
  coordinated with the US; Hamas calls it a ceasefire breach.
- **Washington:** Democrats nominate Hakeem Jeffries to lead the US
  House — set to become its first Black Speaker.
- **India:** Cyclone Akvan nears the coast, tracking toward
  Machilipatnam to Puri.
- **Space:** NASA's Voyager 1 reaches one light-day from Earth
  (05:16 EST, 19 Nov).

## How it is drawn

`main.ts` renders everything itself: a hand-written 5×7 bitmap font,
a zlib PNG encoder (RGB, 8-bit), a gradient sunset sky with a
deterministic procedural skyline, and a 2×3 grid of story panels.
No external images, fonts, or dependencies.

## Verification

```sh
MAKEFUN_OUTPUT_DIR=out1 node main.ts
MAKEFUN_OUTPUT_DIR=out2 node main.ts
sha256sum out1/entry.png out2/entry.png   # identical
```

Result: 1024×1024 PNG, 24,335 bytes (limit 1,048,576),
sha256 `94c0746f61e9fb2fb81b3e12b114e98f597b4e2924beebb4b5c50b4e7aa4564b`,
identical across both runs.

## License

MIT — see LICENSE.
