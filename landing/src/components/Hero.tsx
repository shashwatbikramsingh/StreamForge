import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Play, Radio, Layers, BarChart3 } from 'lucide-react'
import { DashboardMockup } from './DashboardMockup'

interface HeroProps {
  onGetStartedClick: () => void
  onExploreClick: () => void
}

export const Hero: React.FC<HeroProps> = ({ onGetStartedClick, onExploreClick }) => {
  return (
    <section className="relative w-full px-4 sm:px-6 lg:px-8 pt-1 pb-2 md:pt-2 md:pb-3">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
        
        {/* Left Column: Copy + CTAs */}
        <motion.div 
          className="lg:col-span-5 flex flex-col items-start"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#FFF3EA] border border-[#FED7AA]/70 text-[#9A3412] text-xs font-semibold mb-3 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#EA580C]" />
            <span>Real-Time Data Platform</span>
          </div>

          {/* Main Headline with exact 3-line cadence matching reference */}
          <h1 className="text-[38px] sm:text-[44px] lg:text-[48px] font-extrabold text-[#111827] tracking-tight leading-[1.08] mb-3">
            Turn Streaming Events<br />
            Into <span className="text-[#E8590C]">Actionable</span><br />
            <span className="text-[#E8590C]">Intelligence.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-[14.5px] sm:text-[15.5px] text-neutral-600 leading-relaxed font-normal mb-4 max-w-xl">
            Ingest, process, and analyze real-time data at scale. Build reliable, fault-tolerant data pipelines and turn raw events into business insights — all in one unified platform.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3 mb-4 w-full sm:w-auto">
            <button
              onClick={onGetStartedClick}
              className="px-6 py-3 rounded-full bg-[#18181B] hover:bg-neutral-800 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-md shadow-neutral-900/10 transition-all hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={onExploreClick}
              className="px-5 py-3 rounded-full bg-white hover:bg-neutral-50/90 text-neutral-800 font-semibold text-sm border border-neutral-300/80 flex items-center justify-center gap-2.5 shadow-2xs transition-all hover:border-neutral-400 active:scale-[0.98] w-full sm:w-auto"
            >
              <div className="w-5 h-5 rounded-full border border-neutral-400 flex items-center justify-center">
                <Play className="w-2.5 h-2.5 fill-neutral-800 text-neutral-800 ml-0.5" />
              </div>
              Explore Platform
            </button>
          </div>

          {/* Feature micro-pills below buttons */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-5 text-xs font-semibold text-neutral-700">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-[#FFF4ED] border border-[#FFE2D1] flex items-center justify-center text-[#EA580C]">
                <Radio className="w-3 h-3" />
              </div>
              <span className="text-xs">Real-Time Processing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-[#FFF4ED] border border-[#FFE2D1] flex items-center justify-center text-[#EA580C]">
                <Layers className="w-3 h-3" />
              </div>
              <span className="text-xs">Scalable & Reliable</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-[#FFF4ED] border border-[#FFE2D1] flex items-center justify-center text-[#EA580C]">
                <BarChart3 className="w-3 h-3" />
              </div>
              <span className="text-xs">Insightful Analytics</span>
            </div>
          </div>
        </motion.div>

        {/* Right Column: Interactive Mockup Card */}
        <motion.div 
          className="lg:col-span-7 flex justify-center w-full min-w-0"
          initial={{ opacity: 0, scale: 0.97, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <DashboardMockup />
        </motion.div>

      </div>
    </section>
  )
}
