# Remaining roster v1 shared prompt contract

These blocks are combined with the identity and semantic-state instructions in
each character's prompt manifest. Generation uses the built-in image generator.
Every output is a game-asset candidate rather than a playable roster entry.

## Canonical idle contract

```text
Use case: stylized-concept
Asset type: canonical game-character portrait for a bright software-engineering deckbuilder
Input images: Image 1 is odin-master-v1.png and is the definitive visual-style, linework, adult-proportion, polish, and thigh-up framing anchor only. Do not copy Odin's identity, beard, plaid shirt, earbuds, glasses, or pose. Remaining images are identity references for one adult colleague.
Style/medium: Match Image 1's original western Saturday-morning television animation character art: chunky variable charcoal outlines, simplified but recognizable facial planes, bold graphic shapes, crisp 2-to-3-tone cel shading, small controlled hand-drawn texture, clean expressive silhouette, and bright game-ready polish. Not anime, not photorealistic, and not a direct imitation of an existing game or franchise.
Composition/framing: One character only on a portrait canvas, full body to mid-thigh, centered at eye level with generous clear padding around head or hair, elbows, and hands. Entire silhouette inside the canvas at a similar apparent scale to Image 1.
Lighting/mood: Bright cheerful high-key animation lighting.
Scene/backdrop: Perfectly flat solid chroma green #00FF00 for local removal. One uniform color only with no shadow, gradient, texture, reflection, floor plane, halo, or lighting variation.
Constraints: Preserve identity across the supplied references. Crisp opaque illustrated edges and generous padding. Do not use #00FF00 in the subject. No cast or contact shadow, glow, text, logo, watermark, interface, prop, other person, scenery, extra object, extra finger, or extra limb.
```

## Thinking and success contract

```text
Use case: identity-preserve
Asset type: semantic THINKING or SUCCESS game-character portrait for a bright software-engineering deckbuilder
Input images: Image 1 is that character's transparent idle-v1.png and controls identity, exact outfit, proportions, palette, western Saturday-morning-cartoon linework, cel shading, polish, scale, and framing. Remaining images are supplementary expression or gesture references only.
Style/medium: Exactly match Image 1's chunky variable charcoal outlines, simplified recognizable facial planes, crisp 2-to-3-tone cel shading, controlled hand-drawn texture, and bright polished game-character finish. No redesign, anime influence, or realism drift.
Composition/framing: One character only on a portrait canvas, full body to mid-thigh, at the same apparent scale, centered with generous clear padding. Entire silhouette inside the canvas.
Scene/backdrop: Perfectly flat solid chroma green #00FF00. Uniform color only with no shadow, gradient, texture, floor plane, reflection, halo, or lighting variation.
Constraints: Preserve identity, exact outfit, proportions, palette, and rendering from Image 1. Do not use #00FF00 in the subject. No text, logo, watermark, interface, prop, scenery, other person, extra object, extra finger, or extra limb.
```

The character manifests below provide the identity, outfit, reference order,
state action, tone, and additional exclusions that complete each prompt.
