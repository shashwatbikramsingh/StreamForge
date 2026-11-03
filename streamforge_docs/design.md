# StreamForge — Design System & Visual Specification

<!-- impeccable:design-schema 1 -->

## 1. Design Direction & World

- **Aesthetic:** Obsidian Noir & Champagne Gold Luxury Streaming Telemetry (inspired by high-end telemetry and governance planes).
- **Canvas:** Deep Obsidian Noir (`#08080A`) canvas with subtle warm ember/champagne ambient haze and micro-particle grid texture.
- **Hero Centerpiece:** High-performance HTML5 3D perspective particle mesh terrain (`ParticleTerrain.tsx`) simulating real-time undulating event waveforms with interactive cursor parallax.
- **Containers:** Obsidian glass cards (`bg-[#0E0E12] border border-white/[0.08]`) with multi-layered specular highlights, inner sheen, and subtle golden ring iconography.
- **Accents:** Champagne Gold (`#E7D7BE`) for primary badges and CTAs, coupled with Warm Ember (`#EA580C`) for active telemetry and streaming pulse indicators.

## 2. Color Palette & Semantic Tokens

| Token | Hex / Value | Purpose |
|---|---|---|
| `bg-canvas` | `#08080A` | Deep obsidian page canvas |
| `card-surface` | `#0E0E12` / `rgba(14, 14, 18, 0.95)` | Glassmorphic card surfaces and panels |
| `card-surface-elevated`| `#14141A` | Hover states and elevated sub-cards |
| `text-primary` | `#F5F3EF` | Primary headings, titles, high-emphasis text |
| `text-secondary` | `#D4CEBF` / `#A39E93` | Body descriptions, subtitle copy, secondary stats |
| `text-muted` | `#71717A` | Captions, axis labels, auxiliary technical coordinates |
| `accent-champagne` | `#E7D7BE` | Primary CTA buttons, key highlight text, luxury badges |
| `accent-ember` | `#EA580C` | Real-time event highlights, warning indicators, flame markers |
| `border-subtle` | `rgba(255, 255, 255, 0.08)` | Standard card and separator hairline borders |
| `border-highlight`| `rgba(231, 215, 190, 0.30)`| Active selection, primary CTA focus rings |
| `status-live-green` | `#10B981` | Pipeline healthy indicators, 98.7% success rates |
| `status-error-red` | `#EF4444` | Dead-letter queue counter, failed event alerts |

## 3. Typography & Hierarchy

- **Display Face:** High-clarity geometric grotesque (*Inter* / *Plus Jakarta Sans*).
- **Eyebrow Headers:** `10px`–`11px` uppercase with generous letter spacing (`tracking-[0.2em] font-semibold text-[#E7D7BE]`).
- **Hero Title:** 3-line cadence display (`text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white`).
- **Section Headers:** `28px`–`36px` (`font-bold tracking-tight text-[#F5F3EF]`).
- **Card Headings:** `16px`–`18px` (`font-semibold text-white`).
- **Body:** `14px`–`15px` (`text-[#A39E93] leading-relaxed`).
- **Monospace Telemetry:** `10px`–`12px` UI monospace for technical coordinates, latency timings, and topic names.

## 4. Component Patterns

- **Brand Mark:** Concentric glowing golden telemetry rings symbolizing continuous event loops.
- **3D Particle Waveform:** Canvas-driven dynamic grid mesh reacting to time and pointer coordinates.
- **Hero Audio/Playback Scrub Bar:** Dribbble-inspired bottom control plane with playback toggle, animated progress bar, and live cluster state indicator (`CLUSTERS ACTIVE: 4/4`).
- **Dashboard Glass Card:** High-contrast dark telemetry mockups featuring SVG champagne area charts, donut health gauges, and live event ticker streams.
- **Pill Badges:** Translucent champagne pills (`bg-[#E7D7BE]/10 border border-[#E7D7BE]/20 text-[#E7D7BE]`) with pulsating ember telemetry dots.
- **Buttons:**
  - *Primary CTA:* Solid Champagne Gold pill (`bg-[#E7D7BE] hover:bg-[#F3E8D7] text-[#08080A] font-semibold rounded-full uppercase tracking-wider`).
  - *Secondary CTA:* Obsidian glass outline pill (`bg-white/[0.03] hover:bg-white/[0.08] border border-white/15 text-white rounded-full`).
  - *Ghost / Link CTA:* Champagne text with hover underline or icon slide animation.
- **System Architecture Flow:** Interactive architecture diagram with clickable nodes, animated signal flow, and slide-in specification drawer.

## 5. Motion & Micro-Interactions

- **Particle Mesh:** Mathematical sine-cosine wave oscillation at 60fps with mouse parallax displacement.
- **Physics:** `framer-motion` ease-out spring curves (`ease: [0.16, 1, 0.3, 1]`).
- **Live Stream Simulator:** Event counters dynamically ticking upward with fluctuating sub-second latency readings.
- **Hover Micro-interactions:** Specular highlight shift, subtle border glow brightening (`border-white/20`), and icon translate-x triggers.

## 6. Layout Density & Spacing System

- **Global Container Width:** 100% fluid edge-to-edge layout (`w-full px-4 sm:px-6 lg:px-8`) with intentional full bleed across widescreen viewports.
- **Vertical Section Rhythm:** Unified parent flex column cadence (`gap-2 sm:gap-2.5 md:gap-3`) with compact section padding (`py-1 md:py-1.5`) eliminating dead space.
- **WCAG Compliance:** Contrast ratios strictly exceed 4.5:1 across all interactive copy, modal dialogues, and tabular telemetry data.
