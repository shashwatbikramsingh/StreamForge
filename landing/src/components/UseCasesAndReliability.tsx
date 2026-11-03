import React from 'react'
import { motion } from 'framer-motion'
import { Car, ShoppingCart, Radio, CheckCircle2 } from 'lucide-react'

export const UseCasesAndReliability: React.FC = () => {
  const useCases = [
    {
      title: 'Ride & Mobility',
      desc: 'Track bookings, rides, GPS locations, and active user velocity.',
      icon: Car,
    },
    {
      title: 'E-Commerce',
      desc: 'Analyze user actions, live checkout conversions, and transactional fraud.',
      icon: ShoppingCart,
    },
    {
      title: 'IoT & Sensor Data',
      desc: 'Ingest and process high-frequency hardware telemetry in real time.',
      icon: Radio,
    },
  ]

  const reliabilityPoints = [
    'At-least-once event delivery guaranteed by Kafka offsets',
    'Idempotent database persistence (ON CONFLICT DO NOTHING)',
    'Exponential backoff retries & dead-letter queue isolation',
    'Durable DLQ tables for non-blocking exception debugging',
    'Comprehensive three-timestamp pipeline telemetry & observability',
  ]

  return (
    <section id="use-cases" className="w-full py-12 md:py-20 scroll-mt-12 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Card: Use Cases (6 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-6 bg-[#0E0E12] rounded-3xl p-7 sm:p-9 border border-white/[0.08] shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#D4CEBF] text-[10px] font-bold tracking-widest uppercase mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E7D7BE]" />
                <span>PRODUCTION SCENARIOS</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#F5F3EF] tracking-tight mb-3">
                Real-World Applications
              </h3>

              <p className="text-sm text-[#A39E93] leading-relaxed font-normal mb-8">
                Engineered to handle diverse real-time data scenarios with predictable performance and zero data loss.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {useCases.map((uc, i) => {
                const Icon = uc.icon
                return (
                  <div 
                    key={i}
                    className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-[#E7D7BE]/30 flex flex-col items-start transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 text-[#E7D7BE] flex items-center justify-center mb-3">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-[#F5F3EF] mb-1.5">
                      {uc.title}
                    </span>
                    <span className="text-xs text-[#A39E93] leading-relaxed">
                      {uc.desc}
                    </span>
                  </div>
                )
              })}
            </div>
          </motion.div>

          {/* Right Card: Reliability & Production Practices (6 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-6 bg-[#0E0E12] rounded-3xl p-7 sm:p-9 border border-white/[0.08] shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-widest uppercase mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>SYSTEM RELIABILITY</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#F5F3EF] tracking-tight mb-3">
                Built for Production
              </h3>

              <p className="text-sm text-[#A39E93] leading-relaxed font-normal mb-8">
                Strict data engineering practices that ensure reliability, mathematical consistency, and fault tolerance.
              </p>
            </div>

            <div className="space-y-3">
              {reliabilityPoints.map((point, i) => (
                <div 
                  key={i}
                  className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05]"
                >
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-[#D4CEBF]">{point}</span>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
