import React from 'react'
import { motion } from 'framer-motion'
import { 
  Zap, Layers, Database, BarChart2, 
  ShieldCheck, Copy, RefreshCw, AlertOctagon 
} from 'lucide-react'

export const FeaturesGrid: React.FC = () => {
  const features = [
    {
      id: 'ingestion',
      title: 'Real-Time Ingestion',
      description: 'Capture high-volume events from multiple sources with low latency.',
      icon: Zap,
    },
    {
      id: 'processing',
      title: 'Stream Processing',
      description: 'Process, transform, and enrich data in real time using Spark.',
      icon: Layers,
    },
    {
      id: 'storage',
      title: 'Reliable Storage',
      description: 'Store structured and streaming data in PostgreSQL.',
      icon: Database,
    },
    {
      id: 'analytics',
      title: 'Live Analytics',
      description: 'Visualize key metrics and pipeline health in real time.',
      icon: BarChart2,
    },
    {
      id: 'quality',
      title: 'Data Quality',
      description: 'Validate, clean, and monitor event data for reliability.',
      icon: ShieldCheck,
    },
    {
      id: 'dedup',
      title: 'Deduplication',
      description: 'Detect and remove duplicate events to ensure data accuracy.',
      icon: Copy,
    },
    {
      id: 'tolerance',
      title: 'Fault Tolerance',
      description: 'Automatic retries, error handling, and resilient processing.',
      icon: RefreshCw,
    },
    {
      id: 'dlq',
      title: 'Dead Letter Queue',
      description: 'Capture and analyze failed events for debugging and reprocessing.',
      icon: AlertOctagon,
    },
  ]

  return (
    <section id="features" className="w-full px-4 sm:px-6 lg:px-8 py-1 md:py-1.5">
      
      {/* Centered Heading */}
      <div className="text-center max-w-2xl mx-auto mb-3.5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF3EA] border border-[#FED7AA]/70 text-[#9A3412] text-xs font-semibold mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]" />
          Features
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight mb-2">
          Everything You Need for a Real-Time Data Pipeline
        </h2>
        <p className="text-xs sm:text-[13px] text-neutral-500 leading-relaxed font-normal">
          A complete, end-to-end platform to ingest, process, store, and analyze streaming data.
        </p>
      </div>

      {/* 4x2 Grid of Feature Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {features.map((feat, idx) => {
          const Icon = feat.icon
          return (
            <motion.div
              key={feat.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: idx * 0.05 }}
              whileHover={{ y: -2 }}
              className="bg-white rounded-2xl p-4 sm:p-5 border border-neutral-100 shadow-[0_4px_16px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_24px_rgba(234,88,12,0.06)] hover:border-orange-200/70 transition-all flex flex-col justify-between group cursor-default"
            >
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#FFF4ED] border border-[#FFE2D1] flex items-center justify-center text-[#EA580C] mb-3.5 group-hover:scale-105 group-hover:bg-[#EA580C] group-hover:text-white transition-all duration-200">
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-neutral-900 mb-1.5 group-hover:text-[#EA580C] transition-colors">
                  {feat.title}
                </h3>
                <p className="text-[12px] text-neutral-500 leading-relaxed">
                  {feat.description}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>

    </section>
  )
}

