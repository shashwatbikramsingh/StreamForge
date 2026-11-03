import React from 'react'
import { motion } from 'framer-motion'
import { Upload, Cog, Database, BarChart2, ArrowRight } from 'lucide-react'

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: '1. Ingest',
      desc: 'Capture continuous events from applications and microservices.',
      icon: Upload,
    },
    {
      num: '2. Process',
      desc: 'Validate schemas, transform payloads, and enrich event context.',
      icon: Cog,
    },
    {
      num: '3. Store',
      desc: 'Persist clean, idempotent records in relational datastores.',
      icon: Database,
    },
    {
      num: '4. Analyze',
      desc: 'Extract actionable signals, monitor throughput, and detect anomalies.',
      icon: BarChart2,
    },
  ]

  return (
    <section className="w-full py-12 md:py-20 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-10">
          <div className="lg:col-span-5 text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#D4CEBF] text-[10px] font-bold tracking-widest uppercase mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E7D7BE]" />
              <span>OPERATIONAL FLOW</span>
            </div>

            <h3 className="text-3xl sm:text-4xl font-extrabold text-[#F5F3EF] tracking-tight mb-3">
              From Event to Insight.
            </h3>

            <p className="text-sm sm:text-base text-[#A39E93] leading-relaxed font-normal">
              A simple, end-to-end architectural flow that turns raw streaming noise into reliable business intelligence.
            </p>
          </div>

          {/* 4 Steps Row with connecting arrows */}
          <div className="lg:col-span-7 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
            <div className="flex items-center justify-between min-w-[560px] gap-3">
              {steps.map((step, idx) => {
                const Icon = step.icon
                return (
                  <React.Fragment key={step.num}>
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: idx * 0.08 }}
                      className="flex-1 bg-[#0E0E12] rounded-2xl p-4 sm:p-5 border border-white/[0.08] hover:border-[#E7D7BE]/40 shadow-md flex flex-col items-start group transition-all"
                    >
                      <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#E7D7BE] group-hover:bg-[#E7D7BE] group-hover:text-[#08080A] mb-3 transition-all">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-xs sm:text-sm font-bold text-[#F5F3EF] mb-1">
                        {step.num}
                      </span>
                      <span className="text-xs text-[#A39E93] leading-relaxed">
                        {step.desc}
                      </span>
                    </motion.div>

                    {idx < steps.length - 1 && (
                      <div className="text-white/20 px-1 shrink-0">
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
