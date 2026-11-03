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
    <section className="w-full py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#D4CEBF] text-[10px] font-bold tracking-widest uppercase mb-3.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E7D7BE]" />
            <span>THE REAL-TIME CHALLENGE</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F5F3EF] tracking-tight mb-3">
            Why Streaming Pipelines Fail
          </h2>
          <p className="text-sm sm:text-base text-[#A39E93] leading-relaxed">
            Raw event streams without end-to-end validation quickly deteriorate into data loss, duplicate records, and silent failures.
          </p>
        </div>

        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Card: The Problem */}
          <motion.div
            initial={{ opacity: 0, x: -15 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-6 bg-[#0E0E12] rounded-3xl p-7 sm:p-9 border border-rose-500/20 shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[10px] font-bold tracking-wider uppercase mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                The Problem
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-[#F5F3EF] tracking-tight mb-2">
                Real-time data is complex and challenging.
              </h3>

              <p className="text-sm text-[#A39E93] leading-relaxed font-normal mb-6">
                Modern applications generate massive, continuous event streams. Processing them reliably, at scale, is not easy.
              </p>
            </div>

            <div className="space-y-3">
              {problems.map((prob, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-rose-500/30 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/25 text-rose-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[#D4CEBF]">{prob}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Floating Center Transition Arrow */}
          <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-11 h-11 rounded-full bg-[#14141A] shadow-2xl border border-white/20 items-center justify-center text-[#E7D7BE]">
            <ArrowRight className="w-4 h-4" />
          </div>

          {/* Right Card: Our Solution */}
          <motion.div
            initial={{ opacity: 0, x: 15 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-6 bg-[#0E0E12] rounded-3xl p-7 sm:p-9 border border-[#E7D7BE]/30 shadow-[0_12px_40px_rgba(231,215,190,0.03)] flex flex-col justify-between"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E7D7BE]/10 border border-[#E7D7BE]/25 text-[#E7D7BE] text-[10px] font-bold tracking-wider uppercase mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E7D7BE]" />
                Our Solution
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-[#F5F3EF] tracking-tight mb-2">
                StreamForge makes streaming data simple.
              </h3>

              <p className="text-sm text-[#A39E93] leading-relaxed font-normal mb-6">
                A robust end-to-end platform to ingest, process, validate, store, and analyze real-time events with reliability and scale.
              </p>
            </div>

            <div className="space-y-3">
              {solutions.map((sol, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-[#E7D7BE]/40 transition-colors"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#E7D7BE]/15 border border-[#E7D7BE]/25 text-[#E7D7BE] flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[#E4DFD5]">{sol}</span>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
