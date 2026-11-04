# StreamForge Web — Frontend Application ⚡

Interactive, luxury dark-mode landing page and live operational intelligence telemetry interface for **StreamForge**.

Built with **React 19**, **TypeScript**, **Vite**, **Tailwind CSS v4**, **Framer Motion**, and a custom **HTML5 3D Canvas Particle Terrain**.

---

## 🎨 Visual System & Aesthetic

Inspired by luxury telemetry and mission control interfaces:
- **Canvas Ground:** Deep Obsidian Noir (`#08080A`).
- **Surface Elevation:** Translucent obsidian glass cards (`bg-[#0E0E12] border border-white/[0.08]`) with specular highlights and soft drop shadows.
- **Accents:** Champagne Gold (`#E7D7BE`) for primary actions and highlights, with Warm Ember (`#EA580C`) for active live streaming markers and alerts.
- **Hero Centerpiece:** Real-time 60fps mathematical sine-cosine undulating particle terrain mesh (`ParticleTerrain.tsx`) responding to pointer parallax displacement.
- **Operational Telemetry:** macOS-style studio console mockup with cubic bezier volume curves, live partition lag metrics, donut cluster health gauges, and auto-updating event stream tables.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (Node 20+ recommended)
- npm or pnpm

### Development
```bash
# Install dependencies
npm install

# Start local dev server with HMR
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### Production Build
```bash
# Typecheck & build production bundle
npm run build

# Preview production build locally
npm run preview
```

---

## 🧱 Component Architecture

```
landing/src/
├── components/
│   ├── Navbar.tsx                   # Glassmorphic header with concentric rings brand mark
│   ├── Hero.tsx                     # 3-line cadence display with Dribbble playback scrub bar
│   ├── ParticleTerrain.tsx          # 60fps HTML5 Canvas 3D undulating particle wave
│   ├── DashboardMockup.tsx          # macOS-style dark telemetry console with SVG spline chart
│   ├── ProductPreview.tsx           # Full-width platform showcase & live event stream ticker
│   ├── TechStack.tsx                # Data infrastructure ribbon with authentic brand SVGs
│   ├── ProblemSolution.tsx          # Comparative split (Streaming Crisis vs StreamForge Engine)
│   ├── FeaturesGrid.tsx             # 8-card core capabilities matrix with hover elevations
│   ├── HowItWorks.tsx               # 4-stage pipeline stepper (Ingest → Process → Store → Analyze)
│   ├── SystemArchitecture.tsx       # Interactive topology with clickable node inspection drawer
│   ├── UseCasesAndReliability.tsx   # Production scenarios & fault tolerance reliability ledger
│   ├── DocsAndPricing.tsx           # Developer portal & transparent 3-tier pricing
│   ├── CtaBanner.tsx                # Obsidian pre-footer conversion capsule
│   ├── Footer.tsx                   # Footer with concentric brand mark & social links
│   ├── Modals.tsx                   # Architecture blueprint, cluster launch, and walkthrough modals
│   ├── SocialIcons.tsx              # Authentic vector brand marks (GitHub, LinkedIn, X/Twitter)
│   └── BackgroundGradients.tsx      # Subtle ambient obsidian haze & micro-dot grid textures
├── App.tsx                          # Root layout, modal state & fluid container coordination
└── main.tsx                         # React entry point
```

---

## 📄 License
This application is part of the StreamForge project and is licensed under the [MIT License](../LICENSE).
