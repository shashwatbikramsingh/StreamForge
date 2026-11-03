import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronRight, Pause, Play, Radio, Layers, BarChart3 } from 'lucide-react'
import { DashboardMockup } from './DashboardMockup'
import { ParticleTerrain } from './ParticleTerrain'

interface HeroProps {
  onGetStartedClick: () => void
  onExploreClick: () => void
}

export const Hero: React.FC<HeroProps> = ({ onGetStartedClick, onExploreClick }) => {
  const [isPlaying, setIsPlaying] = useState(true)

  return (
    <section className="relative w-full px-4 sm:px-6 lg:px-8 pt-4 pb-8 md:pt-6 md:pb-12 overflow-hidden">
      
      {/* 3D Undulating Particle Terrain Mesh (matching the Dribbble shot) */}
      <ParticleTerrain />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
        
        {/* Left Column: Dramatic Editorial Copy + CTAs */}
        <motion.div 
          className="lg:col-span-5 flex flex-col items-start"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Eyebrow badge matching Dribbble shot */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#D4CEBF] text-[10px] font-bold tracking-widest uppercase mb-4 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E7D7BE] animate-pulse" />
            <span>GOVERNED STREAMING OPERATIONS</span>
          </div>

          {/* Display Headline in Dribbble 3-line cadence + StreamForge punchline */}
          <h1 className="text-[44px] sm:text-[52px] lg:text-[58px] font-extrabold text-[#F5F3EF] tracking-tight leading-[1.04] mb-4">
            Your streams.<br />
            Your evidence.<br />
            <span className="text-[#E7D7BE]">Your control.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-[15px] sm:text-[16px] text-[#A39E93] leading-relaxed font-normal mb-6 max-w-xl">
            Make every streaming event decision traceable, validated, and actionable before it becomes a data bottleneck. Ingest, process, and analyze real-time data at scale with fault-tolerant pipelines.
          </p>

          {/* CTAs matching the Dribbble luxury buttons */}
          <div className="flex flex-wrap items-center gap-4 mb-6 w-full sm:w-auto">
            {/* Primary Champagne Pill */}
            <button
              onClick={onGetStartedClick}
              className="px-6 py-3 rounded-full bg-[#E7D7BE] hover:bg-[#F3E8D6] text-[#08080A] font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-[#E7D7BE]/10 transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
            >
              REQUEST A DIAGNOSTIC
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {/* Secondary inline action */}
            <button
              onClick={onExploreClick}
              className="text-xs font-bold tracking-wide text-[#E4DFD5] hover:text-[#E7D7BE] flex items-center gap-1.5 transition-colors py-2 px-1 group"
            >
              <span>Open control plane</span>
              <ChevronRight className="w-4 h-4 text-[#A39E93] group-hover:text-[#E7D7BE] group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>

          {/* Feature micro-pills */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-[#A39E93]">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/5">
              <Radio className="w-3 h-3 text-[#E7D7BE]" />
              <span className="text-[11px]">Real-Time Processing</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/5">
              <Layers className="w-3 h-3 text-[#E7D7BE]" />
              <span className="text-[11px]">Scalable & Reliable</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/5">
              <BarChart3 className="w-3 h-3 text-[#E7D7BE]" />
              <span className="text-[11px]">Insightful Analytics</span>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Dark Glass Dashboard Mockup */}
        <motion.div 
          className="lg:col-span-7 flex justify-center w-full min-w-0"
          initial={{ opacity: 0, scale: 0.98, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <DashboardMockup />
        </motion.div>

      </div>

      {/* Scrub bar at bottom matching the Dribbble shot's video/demo player */}
      <div className="mt-8 pt-4 border-t border-white/[0.06] flex items-center justify-between gap-4 text-[10px] text-[#A39E93]">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-[#E7D7BE] flex items-center justify-center transition-colors"
            aria-label={isPlaying ? "Pause simulation" : "Resume simulation"}
          >
            {isPlaying ? (
              <Pause className="w-3 h-3 fill-current" />
            ) : (
              <Play className="w-3 h-3 fill-current ml-0.5" />
            )}
          </button>
          <div className="w-36 sm:w-64 h-1 rounded-full bg-white/10 overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-[#E7D7BE] to-[#EA580C]"
              animate={{ width: isPlaying ? ['20%', '85%', '20%'] : '50%' }}
              transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
            />
          </div>
          <span className="font-mono text-[#D4CEBF]">01:24 / 03:00</span>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-[10.5px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[#D4CEBF] font-mono">LIVE CLUSTER: KRAFT-PROD-01 · 842 EVT/S</span>
        </div>
      </div>

    </section>
  )
}
