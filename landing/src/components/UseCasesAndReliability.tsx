import React from 'react'
import { motion } from 'framer-motion'
import { Car, ShoppingCart, Radio, CheckCircle2 } from 'lucide-react'

export const UseCasesAndReliability: React.FC = () => {
  const useCases = [
    {
      title: 'Ride & Mobility',
      desc: 'Track bookings, rides, and user activity.',
      icon: Car,
    },
    {
      title: 'E-Commerce',
      desc: 'Analyze user actions, orders, and transactions.',
      icon: ShoppingCart,
    },
    {
      title: 'IoT & Sensor Data',
      desc: 'Ingest and process high-frequency sensor data in real time.',
      icon: Radio,
    },
  ]

  const reliabilityPoints = [
    'At-least-once event delivery',
    'Idempotent database writes',
    'Automatic retries & failure handling',
    'Dead Letter Queue (DLQ)',
    'Full pipeline observability & monitoring',
  ]

  return (
    <section id="use-cases" className="w-full px-4 sm:px-6 lg:px-8 py-2 md:py-3 scroll-mt-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Card: Use Cases (6 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-6 bg-[#0E0E12]/90 rounded-3xl p-6 sm:p-7 border border-white/[0.08] shadow-xl flex flex-col justify-between"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#D4CEBF] text-[10px] font-bold tracking-widest uppercase mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E7D7BE]" />
              <span>Production Applications</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold text-[#F5F3EF] tracking-tight mb-2">
              Real-World Applications
            </h3>

            <p className="text-xs sm:text-[13px] text-[#A39E93] leading-relaxed font-normal mb-6">
              Flexible enough for a wide range of real-time data scenarios.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {useCases.map((uc, i) => {
              const Icon = uc.icon
              return (
                <div 
                  key={i}
                  className="bg-white/[0.02] rounded-2xl p-3 border border-white/[0.05] flex flex-col items-start hover:border-[#E7D7BE]/40 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#E7D7BE] mb-2">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-[#F5F3EF] mb-1">
                    {uc.title}
                  </span>
                  <p className="text-[10.5px] text-[#A39E93] leading-tight">
                    {uc.desc}
                  </p>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Right Card: Reliability (6 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="lg:col-span-6 bg-[#0E0E12]/90 rounded-3xl p-6 sm:p-7 border border-white/[0.08] shadow-xl flex flex-col justify-between"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#D4CEBF] text-[10px] font-bold tracking-widest uppercase mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E7D7BE]" />
              <span>Reliability First</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold text-[#F5F3EF] tracking-tight mb-2">
              Built for Production
            </h3>

            <p className="text-xs sm:text-[13px] text-[#A39E93] leading-relaxed font-normal mb-6">
              Engineering practices that ensure reliability, consistency, and scalability.
            </p>
          </div>

          <div className="space-y-3">
            {reliabilityPoints.map((point, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs text-[#E4DFD5]">
                <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <span className="font-medium">{point}</span>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  )
}
