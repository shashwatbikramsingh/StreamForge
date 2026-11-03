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
      description: 'Capture high-volume events from multiple sources with ultra-low latency.',
      icon: Zap,
    },
    {
      id: 'processing',
      title: 'Stream Processing',
      description: 'Process, transform, and enrich data in real time using Apache Spark streaming.',
      icon: Layers,
    },
    {
      id: 'storage',
      title: 'Reliable Storage',
      description: 'Store structured and streaming data with strong idempotency in PostgreSQL.',
      icon: Database,
    },
    {
      id: 'analytics',
      title: 'Live Analytics',
      description: 'Visualize key throughput metrics and pipeline health in real time.',
      icon: BarChart2,
    },
    {
      id: 'quality',
      title: 'Data Quality',
      description: 'Validate, clean, and monitor event data with strict schema contracts.',
      icon: ShieldCheck,
    },
    {
      id: 'dedup',
      title: 'Deduplication',
      description: 'Detect and eliminate duplicate events to ensure strict mathematical accuracy.',
      icon: Copy,
    },
    {
      id: 'fault-tolerance',
      title: 'Fault Tolerance',
      description: 'Automatic retries, backoff handling, and resilient streaming recovery.',
      icon: RefreshCw,
    },
    {
      id: 'dlq',
      title: 'Dead Letter Queue',
      description: 'Isolate and analyze unparseable events for painless debugging and reprocessing.',
      icon: AlertOctagon,
    },
  ]

  return (
    <section id="features" className="w-full py-12 md:py-20 scroll-mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Centered Heading */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#D4CEBF] text-[10px] font-bold tracking-widest uppercase mb-3.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E7D7BE]" />
            <span>CORE CAPABILITIES</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-[#F5F3EF] tracking-tight mb-3">
            Everything You Need for a Real-Time Data Pipeline
          </h2>
          <p className="text-sm sm:text-base text-[#A39E93] leading-relaxed font-normal">
            A complete, end-to-end platform to ingest, process, store, and analyze streaming data.
          </p>
        </div>

        {/* 4x2 Grid of Feature Cards in Dark Glass */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
          {features.map((feat, idx) => {
            const Icon = feat.icon
            return (
              <motion.div
                key={feat.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: idx * 0.04 }}
                whileHover={{ y: -4 }}
                className="bg-[#0E0E12] rounded-2xl p-6 border border-white/[0.08] hover:border-[#E7D7BE]/40 hover:bg-[#14141A] transition-all flex flex-col justify-between group cursor-default shadow-md"
              >
                <div>
                  <div className="w-11 h-11 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#E7D7BE] mb-4 group-hover:scale-105 group-hover:bg-[#E7D7BE] group-hover:text-[#08080A] transition-all duration-200">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-[#F5F3EF] mb-2 group-hover:text-[#E7D7BE] transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-[#A39E93] leading-relaxed">
                    {feat.description}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
