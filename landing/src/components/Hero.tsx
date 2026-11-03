import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ChevronRight, Pause, Play, Radio, Layers, BarChart3 } from 'lucide-react'
import { ParticleTerrain } from './ParticleTerrain'

interface HeroProps {
  onGetStartedClick: () => void
  onExploreClick: () => void
}

export const Hero: React.FC<HeroProps> = ({ onGetStartedClick, onExploreClick }) => {
  const [isPlaying, setIsPlaying] = useState(true)

  return (
    <section className="relative w-full pt-8 pb-12 md:pt-14 md:pb-18 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Editorial Centered Content matching the Dribbble Reference */}
        <motion.div 
          className="max-w-4xl mx-auto text-center flex flex-col items-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Eyebrow badge matching Dribbble shot */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#D4CEBF] text-[10.5px] font-bold tracking-widest uppercase mb-6 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E7D7BE] animate-pulse" />
            <span>GOVERNED STREAMING OPERATIONS</span>
          </div>

          {/* Display Headline in Dribbble 3-line cadence */}
          <h1 className="text-4xl sm:text-6xl lg:text-[72px] font-extrabold text-[#F5F3EF] tracking-tight leading-[1.04] mb-6">
            Your streams.<br />
            Your evidence.<br />
            <span className="text-[#E7D7BE]">Your control.</span>
          </h1>

          {/* Focused Subtitle */}
          <p className="text-base sm:text-lg text-[#A39E93] leading-relaxed font-normal mb-8 max-w-2xl mx-auto">
            Make every streaming event decision traceable, validated, and actionable before it becomes a data bottleneck. Ingest, process, and analyze real-time data at scale with fault-tolerant pipelines.
          </p>

          {/* Centered CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-8 w-full sm:w-auto">
            <button
              onClick={onGetStartedClick}
              className="px-7 py-3.5 rounded-full bg-[#E7D7BE] hover:bg-[#F3E8D6] text-[#08080A] font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-[#E7D7BE]/15 transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
            >
              REQUEST A DIAGNOSTIC
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onExploreClick}
              className="text-xs font-bold tracking-wide text-[#E4DFD5] hover:text-[#E7D7BE] flex items-center gap-1.5 transition-colors py-2 px-3 group"
            >
              <span>Open control plane</span>
              <ChevronRight className="w-4 h-4 text-[#A39E93] group-hover:text-[#E7D7BE] group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>

          {/* Feature micro-pills */}
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-medium text-[#A39E93]">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/5">
              <Radio className="w-3 h-3 text-[#E7D7BE]" />
              <span className="text-[11px]">Real-Time Processing</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/5">
              <Layers className="w-3 h-3 text-[#E7D7BE]" />
              <span className="text-[11px]">Scalable & Reliable</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] border border-white/5">
              <BarChart3 className="w-3 h-3 text-[#E7D7BE]" />
              <span className="text-[11px]">Insightful Analytics</span>
            </div>
          </div>
        </motion.div>

        {/* 3D Undulating Particle Waveform Container with Dribbble Demo Scrub Bar */}
        <motion.div
          className="relative w-full h-[360px] sm:h-[440px] md:h-[500px] rounded-3xl overflow-hidden border border-white/10 bg-[#09090D] mt-10 shadow-[0_25px_80px_rgba(0,0,0,0.85)]"
          initial={{ opacity: 0, scale: 0.98, y: 25 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Live Interactive 3D Canvas */}
          <ParticleTerrain />

          {/* Bottom Scrub Control Bar matching Dribbble reference */}
          <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 bg-gradient-to-t from-[#08080A] via-[#08080A]/75 to-transparent flex items-center justify-between gap-4 text-[11px] text-[#A39E93] z-20">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#E7D7BE] flex items-center justify-center transition-colors"
                aria-label={isPlaying ? "Pause simulation" : "Resume simulation"}
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                )}
              </button>
              <div className="w-36 sm:w-72 h-1 rounded-full bg-white/15 overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-to-r from-[#E7D7BE] to-[#EA580C]"
                  animate={{ width: isPlaying ? ['20%', '85%', '20%'] : '50%' }}
                  transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
                />
              </div>
              <span className="font-mono text-[#D4CEBF] text-xs">01:24 / 03:00</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[#D4CEBF] font-mono text-xs hidden sm:inline">LIVE TELEMETRY: KRAFT-PROD-01 · 842 EVT/S · 98.7% HEALTH</span>
              <span className="text-[#D4CEBF] font-mono text-xs sm:hidden">842 EVT/S · 98.7%</span>
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  )
}
