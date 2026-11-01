import React from 'react'
import { motion } from 'framer-motion'
import { Layers, Shield, Maximize2, Code2 } from 'lucide-react'

export const FeaturesTrustBar: React.FC = () => {
  const features = [
    {
      id: 'throughput',
      title: 'High Throughput',
      subtitle: '100K+ events/sec',
      icon: Layers,
    },
    {
      id: 'fault-tolerant',
      title: 'Fault Tolerant',
      subtitle: 'No data loss',
      icon: Shield,
    },
    {
      id: 'scalable',
      title: 'Horizontally Scalable',
      subtitle: 'Grow with your data',
      icon: Maximize2,
    },
    {
      id: 'production-ready',
      title: 'Production Ready',
      subtitle: 'Built with industry-grade tools',
      icon: Code2,
    },
  ]

  return (
    <section className="max-w-[1180px] mx-auto px-4 sm:px-6 pt-2 pb-14 md:pb-18">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {features.map((feature, idx) => {
          const Icon = feature.icon
          return (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              whileHover={{ y: -2, transition: { duration: 0.15 } }}
              className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-100 shadow-[0_8px_20px_-4px_rgba(234,88,12,0.03),0_2px_6px_-1px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_24px_-5px_rgba(234,88,12,0.06)] hover:border-orange-200/70 transition-all flex items-center gap-3.5 group cursor-default"
            >
              {/* Left Peach Icon Container */}
              <div className="w-11 h-11 rounded-xl bg-[#FFF4ED] border border-[#FFE2D1] flex items-center justify-center text-[#EA580C] shrink-0 group-hover:scale-105 group-hover:bg-[#EA580C] group-hover:text-white transition-all duration-300">
                <Icon className="w-5 h-5" />
              </div>

              {/* Title & Subtitle */}
              <div className="truncate">
                <h4 className="text-[13.5px] font-bold text-neutral-900 group-hover:text-[#EA580C] transition-colors truncate">
                  {feature.title}
                </h4>
                <p className="text-[11.5px] text-neutral-500 font-medium truncate mt-0.5">
                  {feature.subtitle}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
