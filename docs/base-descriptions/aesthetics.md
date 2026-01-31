⸻

Design North Star

Instrumental Minimalism as the base, with very restrained cyberpunk accents only when something meaningful changes.

Serious scientific instrument, built in the future — not a game UI, not a sci-fi movie prop.

Think:
• Observatory
• Flight recorder
• Research lab display
• Museum exhibit on “the early days of AGI”

Avoid:
• neon gradients
• gamer HUD clutter
• glitch effects
• over-ornamentation

⸻

STYLE OPTION 1 — Instrumental Minimalism (Recommended baseline)

Vibe
• Calm
• Confident
• Factual
• Quietly futuristic

Visual language
• Matte dark backgrounds
• Thin strokes
• Subtle depth via shadow, not gradients
• Motion only when meaning changes

This is the default state of Canaryline.

⸻

Color system

Background: #0B0E11 (near-black, slightly blue)
Surface: #121722
Primary: #E6EDF3 (soft white)
Accent: #4EA1FF (cold blue)
Warning: #F4C430 (amber)
Critical: #E5533D (muted red)

No pure black, no pure white.

⸻

Typography
• Headings: Inter, Satoshi, or IBM Plex Sans
• Data & metrics: IBM Plex Mono or JetBrains Mono

Rules:
• Numbers are sacred → mono only
• Headings are quiet → no shouty weights
• Line-height > typical SaaS (breathing room)

⸻

Motion
• 150–300ms ease-in-out
• No infinite loops
• Pulses only on state change
• Uncertainty = blur/fade, not shake

⸻

STYLE OPTION 2 — Cybernetic Paper (Science × Archive)

Vibe
• Archival
• Analytical
• Feels “printed” but alive
• Less dark, more “lab notebook”

This is excellent for sub-pages like Timeline or Signals.

⸻

Visual language
• Light-on-dark or off-white surfaces
• Fine grid lines
• Section dividers
• Subtle grain/noise texture

Feels like:

“A future historian’s interface for studying early AGI.”

⸻

Color system

Background: #0F1115
Surface: #F2F2EE (paper white)
Ink: #1B1E26
Accent: #6B7CFF (indigo)
Note: #B59B4C (brass)

⸻

Typography
• Headings: Source Serif, Fraunces, or Charter
• Body: Inter
• Data: JetBrains Mono

This mix adds seriousness without cosplay.

⸻

STYLE OPTION 3 — Quiet Cyberpunk (use sparingly)

Vibe
• Slightly dangerous
• Night-time
• Urban intelligence lab

This should be an accent layer, not the whole UI.

⸻

How to do cyberpunk without being cringe
• One neon color only
• No gradients
• No glowing text
• Glow only on lines or dots
• Cyberpunk appears only on warnings or canaries

Example:
• Canary turns amber → thin glow
• Risk state → subtle red halo
• Timeline future projection → dotted neon line

⸻

Unified Design System (what I’d actually ship)

Base layer

Instrumental Minimalism

Contextual overlays
• Timeline page → Cybernetic Paper
• Canary warnings → Quiet Cyberpunk accents

⸻

Component-level design rules (very important)

Radar chart
• Thin stroke
• No fill or 5–10% opacity max
• Uncertainty = soft outer blur
• Axis labels understated, never bold

Canary indicators
• Circle + label
• Color is secondary to text
• Tooltip explains state in plain language

Cards (avoid “card soup”)
• Prefer sections, not cards
• If cards exist: no shadows, 1px border at 10% opacity

Dividers
• Hairline borders
• Or whitespace only
• Never heavy separators

⸻

Texture & depth (this is where “future” lives)

Use very subtle noise (2–4% opacity) on:
• background
• charts
• large empty areas

This avoids flat SaaS look without going retro-futurism meme.

⸻

Accessibility & seriousness
• Color is never the only signal
• All canary states have text labels
• Uncertainty is visible (ranges, fuzziness)
• Tooltips explain jargon in plain English

This keeps it non-infantile.

⸻

Anti-patterns to explicitly ban

❌ Neon gradients
❌ RGB glows
❌ “HUD” frames
❌ Animated scanlines
❌ Gamified meters
❌ Sci-fi fonts
❌ Excessive icons

⸻
