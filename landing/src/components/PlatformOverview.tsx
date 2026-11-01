import React from 'react'
import { motion } from 'framer-motion'
import { Zap, Layers, Database, BarChart2, ArrowRight } from 'lucide-react'

export const PlatformOverview: React.FC = () => {
  const stages = [
    {
      id: 'ingest',
      title: 'Ingest',
      description: 'Capture high-volume, real-time events from any source.',
      icon: Zap,
    },
    {
      id: 'process',
      title: 'Process',
      description: 'Stream, transform, and validate data at scale.',
      icon: Layers,
    },
    {
      id: 'store',
      title: 'Store',
      description: 'Persist clean, structured data for deep analysis.',
      icon: Database,
    },
    {
      id: 'analyze',
      title: 'Analyze',
      description: 'Monitor pipelines and discover actionable insights.',
      icon: BarChart2,
    },
  ]

  return (
    <section id="features" className="max-w-[1180px] mx-auto px-4 sm:px-6 py-12 md:py-16">
      
      {/* Centered Header */}
      <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12">
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-[#FFF3EA] border border-[#FED7AA]/70 text-[#EA580C] text-xs font-semibold mb-4">
          Platform Overview
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111827] tracking-tight mb-3">
          Your entire data pipeline. One place.
        </h2>
        <p className="text-[15px] sm:text-base text-neutral-600 leading-relaxed font-normal">
          From event ingestion to analytics, StreamForge brings every stage of your data journey together.
        </p>
      </div>

      {/* 4 Cards Row matching screenshot layout: [Icon] [Title + Subtitle] [Arrow] */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stages.map((stage, idx) => {
          const Icon = stage.icon
          return (
            <motion.div
              key={stage.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              className="bg-white rounded-2xl p-5 border border-neutral-100 shadow-[0_10px_25px_-5px_rgba(234,88,12,0.04),0_2px_8px_-2px_rgba(0,0,0,0.02)] hover:shadow-[0_18px_30px_-8px_rgba(234,88,12,0.08)] hover:border-orange-200/80 transition-all flex items-start gap-3.5 group cursor-pointer"
            >
              {/* Left Icon in warm peach rounded square container */}
              <div className="w-12 h-12 rounded-xl bg-[#FFF4ED] border border-[#FFE2D1] flex items-center justify-center text-[#EA580C] shrink-0 group-hover:scale-105 group-hover:bg-[#EA580C] group-hover:text-white transition-all duration-300">
                <Icon className="w-6 h-6" />
              </div>

              {/* Center Content: Title + Description */}
              <div className="flex-1 min-w-0 pr-1">
                <h3 className="text-base font-bold text-[#111827] mb-1 group-hover:text-[#EA580C] transition-colors">
                  {stage.title}
                </h3>
                <p className="text-[12px] sm:text-xs text-neutral-500 leading-relaxed">
                  {stage.description}
                </p>
              </div>

              {/* Right Arrow */}
              <div className="text-neutral-400 group-hover:text-[#EA580C] group-hover:translate-x-1 transition-all duration-200 pt-1 shrink-0">
                <ArrowRight className="w-4 h-4" />
              </div>
            </motion.div>
          )
        })}
      </div>

    </section>
  )
}
