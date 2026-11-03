# StreamForge — Design System & Visual Specification

<!-- impeccable:design-schema 1 -->

## 1. Design Direction & World

- **Aesthetic:** Obsidian Noir & Champagne Gold Luxury Streaming Telemetry (inspired by high-end telemetry and governance planes).
- **Canvas:** Deep Obsidian Noir (`#08080A`) canvas with subtle warm ember/champagne ambient haze and micro-particle grid texture.
- **Hero Centerpiece:** Centered editorial composition with a high-performance HTML5 3D perspective particle mesh terrain (`ParticleTerrain.tsx`) simulating real-time undulating event waveforms, complete with interactive cursor parallax displacement and anchored playback scrub telemetry.
- **Platform Showcase:** Full-width dedicated StreamForge Studio console (`ProductPreview.tsx` + `DashboardMockup.tsx`) with KPI cards, cubic bezier volume chart, donut health gauge, and live auto-updating event stream ticker.
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
- **Hero Title:** 3-line cadence centered display (`text-4xl sm:text-6xl lg:text-[72px] font-extrabold tracking-tight leading-[1.04]`).
- **Section Headers:** `28px`–`36px` / `text-3xl sm:text-4xl` (`font-extrabold tracking-tight text-[#F5F3EF]`).
- **Card Headings:** `15px`–`18px` (`font-bold text-[#F5F3EF]`).
- **Body:** `14px`–`16px` (`text-[#A39E93] leading-relaxed`).
- **Monospace Telemetry:** `10px`–`12px` UI monospace for technical coordinates, latency timings, and topic names.

## 4. Layout Architecture & Spatial Rhythm

- **Global Container System:** Standardized `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` across all 12 sections. Eliminates awkward 2000px line-stretch while maintaining full edge-to-edge luxury background atmosphere.
- **Section Pacing:** Generous, intentional vertical rhythm (`py-12 md:py-20`) eliminating suffocating gaps and chaotic wall-to-wall card crowding.
- **Hero vs Product Preview Separation:**
  - *Hero:* Authoritative centered typography + CTAs leading directly into an expansive, dedicated 3D particle terrain window with anchored scrub bar telemetry.
  - *Product Preview:* Dedicated full-width interactive operations studio showcase featuring the complete `DashboardMockup` and live auto-updating event stream ticker.
- **Bento & Split Grid Systems:**
  - *Problem vs Solution:* Balanced 2-column comparative split with central directional transition arrow.
  - *Features:* 4x2 matrix with 11px icon badges and hover elevations.
  - *Architecture:* Dedicated interactive topology with clickable nodes and inspection drawer.
  - *Use Cases & Reliability:* Dual-column industry scenarios vs reliability engineering ledger.
  - *Docs & Pricing:* 4-column developer portal paired with transparent 3-tier pricing spotlighting the Pro tier.

## 5. Motion & Micro-Interactions

- **3D Particle Waveform:** Sine-cosine surface equation oscillating at 60fps with mouse cursor parallax displacement.
- **Physics Curves:** `framer-motion` ease-out spring curves (`ease: [0.16, 1, 0.3, 1]`).
- **Live Event Feed:** Continuous synthetic stream simulation updating at ~2.8s intervals with realistic latency and partition assignments.
- **WCAG Compliance:** Contrast ratios strictly exceed 4.5:1 across all copy and modal interfaces.
