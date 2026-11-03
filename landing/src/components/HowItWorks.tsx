import React from 'react'
import { motion } from 'framer-motion'
import { Upload, Cog, Database, BarChart2, ArrowRight } from 'lucide-react'

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: '1. Ingest',
      desc: 'Capture events from various sources.',
      icon: Upload,
    },
    {
      num: '2. Process',
      desc: 'Validate, transform, and enrich data.',
      icon: Cog,
    },
    {
      num: '3. Store',
      desc: 'Persist clean, structured data securely.',
      icon: Database,
    },
    {
      num: '4. Analyze',
      desc: 'Visualize, monitor, and extract actionable insights.',
      icon: BarChart2,
    },
  ]

  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 py-2 md:py-3">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
        
        {/* Left Column */}
        <div className="lg:col-span-4 flex flex-col items-start pr-0 lg:pr-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#D4CEBF] text-[10px] font-bold tracking-widest uppercase mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E7D7BE]" />
            <span>Operational Flow</span>
          </div>

          <h3 className="text-2xl sm:text-[26px] font-extrabold text-[#F5F3EF] tracking-tight mb-2">
            From Event to Insight.
          </h3>

          <p className="text-xs sm:text-[13px] text-[#A39E93] leading-relaxed font-normal">
            A simple, end-to-end flow that turns raw events into real-time business insights.
          </p>
        </div>

        {/* Right 4 Step Cards with arrows in Dark Glass */}
        <div className="lg:col-span-8 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          <div className="flex items-center justify-between min-w-[560px] gap-2">
            {steps.map((step, idx) => {
              const Icon = step.icon
              return (
                <React.Fragment key={step.num}>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: idx * 0.08 }}
                    className="flex-1 bg-[#0E0E12]/90 rounded-2xl p-3.5 sm:p-4 border border-white/[0.08] hover:border-[#E7D7BE]/40 shadow-sm flex flex-col items-start group transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#E7D7BE] group-hover:bg-[#E7D7BE] group-hover:text-[#08080A] mb-2.5 transition-all">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-[#F5F3EF] mb-1">
                      {step.num}
                    </span>
                    <span className="text-[11px] text-[#A39E93] leading-tight">
                      {step.desc}
                    </span>
                  </motion.div>

                  {idx < steps.length - 1 && (
                    <div className="text-[#7A756D] px-0.5 shrink-0">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </div>

      </div>
    </section>
  )
}
