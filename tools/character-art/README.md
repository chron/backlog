# Character art pipeline

The source of truth is `assets/characters/art-manifest.json`. Generated chroma
sources, transparent PNG masters, optimized WebPs, prompt manifests, focal data,
and QA reports remain separate from gameplay content until a character is made
playable.

## Generate

Use the built-in image generator with the exact prompt and ordered references in
the character's `.prompt.md` file. Save its flat-key output as:

```text
assets/characters/<character>-<idle|thinking|success>-v1-chroma.png
```

Generation is intentionally not hidden inside this script: it remains an
explicit reviewed creative step. Set the mood's manifest status to `generated`
only after its chroma source is selected.

## Export and validate

Run the complete deterministic post-processing pass:

```bash
uv run tools/character-art/pipeline.py all
```

Or work on one mood while iterating:

```bash
uv run tools/character-art/pipeline.py process matt idle
uv run tools/character-art/pipeline.py validate
uv run tools/character-art/pipeline.py contact-sheet
```

The pipeline uses the installed imagegen chroma helper with a soft matte and
despill, writes RGBA PNG masters beside the source artwork, and writes quality-84
WebPs under `assets/characters/webp/`. Validation checks canvas size, alpha,
transparent corners, safe top/side padding, subject coverage, residual key-color
dominance on soft edges, WebP alpha, and all five portrait-role focal records.

Review `assets/characters/qa/contact-sheet-v1.png` before changing a mood status
from `generated` to `reviewed`. Generated assets are candidates, not playable
roster entries.
