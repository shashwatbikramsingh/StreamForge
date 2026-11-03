import React from 'react'
import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react'

export const ProblemSolution: React.FC = () => {
  const problems = [
    'High-volume, continuous events',
    'Processing delays and bottlenecks',
    'Duplicate or inconsistent data',
    'Pipeline failures and data loss',
  ]

  const solutions = [
    'Real-time, high-throughput ingestion',
    'Stream processing & data validation',
    'Deduplication and fault tolerance',
    'Monitoring and actionable insights',
  ]

  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 py-2 md:py-3">
      <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        
        {/* Left Card: The Problem */}
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-6 bg-[#0E0E12]/90 rounded-3xl p-6 sm:p-8 border border-white/[0.08] shadow-xl flex flex-col justify-between h-full"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-bold tracking-wider uppercase mb-3.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              The Problem
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold text-[#F5F3EF] tracking-tight mb-2">
              Real-time data is complex and challenging.
            </h3>

            <p className="text-xs sm:text-[13px] text-[#A39E93] leading-relaxed font-normal mb-6">
              Modern applications generate massive, continuous event streams. Processing them reliably, at scale, is not easy.
            </p>
          </div>

          <div className="space-y-2.5">
            {problems.map((prob, i) => (
              <div 
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-rose-500/30 transition-colors"
              >
                <div className="w-6 h-6 rounded-lg bg-rose-500/15 border border-rose-500/25 text-rose-400 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-medium text-[#D4CEBF]">{prob}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Floating Center Transition Arrow */}
        <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-[#14141A] shadow-xl border border-white/15 items-center justify-center text-[#E7D7BE]">
          <ArrowRight className="w-4 h-4" />
        </div>

        {/* Right Card: Our Solution */}
        <motion.div
          initial={{ opacity: 0, x: 15 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-6 bg-[#0E0E12]/90 rounded-3xl p-6 sm:p-8 border border-[#E7D7BE]/20 shadow-[0_12px_40px_rgba(231,215,190,0.03)] flex flex-col justify-between h-full"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E7D7BE]/10 border border-[#E7D7BE]/25 text-[#E7D7BE] text-[10px] font-bold tracking-wider uppercase mb-3.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E7D7BE]" />
              Our Solution
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold text-[#F5F3EF] tracking-tight mb-2">
              StreamForge makes streaming data simple.
            </h3>

            <p className="text-xs sm:text-[13px] text-[#A39E93] leading-relaxed font-normal mb-6">
              A robust end-to-end platform to ingest, process, validate, store, and analyze real-time events with reliability and scale.
            </p>
          </div>

          <div className="space-y-2.5">
            {solutions.map((sol, i) => (
              <div 
                key={i}
                className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-[#E7D7BE]/40 transition-colors"
              >
                <div className="w-6 h-6 rounded-lg bg-[#E7D7BE]/15 border border-[#E7D7BE]/25 text-[#E7D7BE] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-medium text-[#E4DFD5]">{sol}</span>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  )
}
