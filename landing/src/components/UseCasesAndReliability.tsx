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
    <section id="use-cases" className="w-full px-4 sm:px-6 lg:px-8 py-1 md:py-1.5">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Card: Use Cases (6 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-7 border border-neutral-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF3EA] border border-[#FED7AA]/70 text-[#9A3412] text-xs font-semibold mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]" />
              Use Cases
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold text-[#111827] tracking-tight mb-2">
              Real-World Applications
            </h3>

            <p className="text-xs sm:text-[13px] text-neutral-500 leading-relaxed font-normal mb-6">
              Flexible enough for a wide range of real-time data scenarios.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {useCases.map((uc, i) => {
              const Icon = uc.icon
              return (
                <div 
                  key={i}
                  className="bg-neutral-50/70 rounded-2xl p-3 border border-neutral-100 flex flex-col items-start hover:border-orange-200 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#FFF4ED] border border-[#FFE2D1] flex items-center justify-center text-[#EA580C] mb-2">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-neutral-900 mb-1">
                    {uc.title}
                  </span>
                  <p className="text-[10.5px] text-neutral-500 leading-tight">
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
          className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-7 border border-neutral-100 shadow-[0_8px_30px_rgba(234,88,12,0.04)] flex flex-col justify-between"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF3EA] border border-[#FED7AA]/70 text-[#9A3412] text-xs font-semibold mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]" />
              Reliability
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold text-[#111827] tracking-tight mb-2">
              Built for Production
            </h3>

            <p className="text-xs sm:text-[13px] text-neutral-500 leading-relaxed font-normal mb-6">
              Engineering practices that ensure reliability, consistency, and scalability.
            </p>
          </div>

          <div className="space-y-2.5">
            {reliabilityPoints.map((point, i) => (
              <div key={i} className="flex items-center gap-2.5 text-xs text-neutral-700">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">{point}</span>
              </div>
            ))}
          </div>
        </motion.div>

      </div>
    </section>
  )
}

