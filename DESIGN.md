# StreamForge — Design System & Visual Specification

<!-- impeccable:design-schema 1 -->

## 1. Design Direction & World

- **Aesthetic:** Warm Porcelain Tech & Radiant Data Stream.
- **Canvas:** Soft warm cream background (`#FAF7F2`) with subtle organic amber/peach ambient radial glows.
- **Containers:** Pure white pillowed surfaces with soft, multi-layered warm ambient shadows and rounded corners (`rounded-2xl` to `rounded-3xl`).
- **Accent:** Vibrant warm brand orange (`#EA580C` / `#F97316`), symbolizing the energetic forge of real-time streaming data.

## 2. Color Palette

| Token | Hex / Value | Purpose |
|---|---|---|
| `bg-canvas` | `#FAF7F2` | Page background, warm cream porcelain |
| `card-surface` | `#FFFFFF` (95% blur) | Elevated pillowed cards and interactive panels |
| `text-primary` | `#111827` | Headings, titles, high-emphasis text |
| `text-secondary` | `#4B5563` | Body text, feature descriptions |
| `text-muted` | `#9CA3AF` | Captions, axis labels, timestamps |
| `brand-orange` | `#EA580C` | Primary CTAs, active highlights, key metrics |
| `brand-orange-light` | `#FFF3EB` | Pill badges, icon container grounds |
| `status-live-green` | `#10B981` | Live health badges, positive metric trends |
| `status-error-red` | `#EF4444` | Dead-letter queue count, failed event metric |
| `status-warning-amber` | `#F59E0B` | Degraded status, processing rate icon ground |

## 3. Typography & Hierarchy

- **Display Face:** *Plus Jakarta Sans* / *Inter* (geometric, clean, humanistic grotesque).
- **Hero Title:** `54px` (`font-extrabold`, `leading-[1.08]`, `tracking-tight`).
- **Section Headers:** `32px`–`36px` (`font-extrabold`).
- **Card Headings:** `16px`–`18px` (`font-bold`).
- **Body:** `15px`–`16px` (`leading-relaxed`, `text-neutral-600`).
- **Metadata / Monospace:** `10px`–`12px` (`JetBrains Mono` / UI monospace for technical coordinates).

## 4. Component Patterns

- **Logo:** 5-bar dynamic equalizer wave animating with rhythmic stream pulses.
- **Hero Dashboard Mockup:** Floating elevated card with 3D depth, live ticking event volume, SVG cubic bezier area chart, and donut pipeline health gauge.
- **Pill Badges:** Soft peach pill (`bg-[#FFF3EB] border border-[#FED7AA] text-[#9A3412]`) with pulsating orange indicator dot.
- **Buttons:**
  - *Primary CTA:* Dark charcoal pill (`bg-neutral-900 hover:bg-neutral-800 text-white rounded-full`).
  - *Secondary CTA:* White outlined pill (`bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-800`).
  - *Accent CTA:* Vibrant orange pill (`bg-[#EA580C] hover:bg-[#D9480F] text-white`).
- **Pipeline Architecture Flow:** 5 elevated stage cards (`Event Generator` → `Kafka` → `Stream Processing` → `PostgreSQL` → `Analytics & Dashboard`) linked with directional arrows and traveling streaming light particles.

## 5. Motion & Micro-Interactions

- **Spring-based physics:** `framer-motion` transitions with exponential ease-out (`[0.16, 1, 0.3, 1]`).
- **Hover elevations:** Subtle `translate-y-[-3px]` with ambient shadow expansion.
- **Live stream simulator:** Dynamic ticker increments and fluctuating throughput numbers.

