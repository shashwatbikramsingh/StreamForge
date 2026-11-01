import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ChevronRight, X, CheckCircle2 } from 'lucide-react'

// Authentic high-fidelity technology SVGs
const PythonIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 110 110">
    <path fill="#387EB8" d="M54.5 10.4c-24 0-22.5 10.4-22.5 10.4l.03 10.8h22.8v3.3H23.1s-14.8 1.7-14.8 21.6c0 19.9 12.9 20.8 12.9 20.8h7.7v-10.8s-.4-12.9 12.7-12.9h22s12.2-.2 12.2-11.9v-20.2s1.7-10.8-21.3-10.8zM42.1 17.2c2.2 0 4 1.8 4 4s-1.8 4-4 4-4-1.8-4-4 1.8-4 4-4z" />
    <path fill="#FFE052" d="M55.5 99.6c24 0 22.5-10.4 22.5-10.4l-.03-10.8H55.2v-3.3h31.7s14.8-1.7 14.8-21.6c0-19.9-12.9-20.8-12.9-20.8h-7.7v10.8s.4 12.9-12.7 12.9h-22s-12.2.2-12.2 11.9v20.2s-1.7 10.8 21.3 10.8zm12.4-6.8c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z" />
  </svg>
)

const KafkaIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 100 100">
    <circle cx="26" cy="50" r="11" fill="#18181B" />
    <circle cx="74" cy="24" r="9" fill="#18181B" />
    <circle cx="74" cy="76" r="9" fill="#18181B" />
    <path d="M26 50 L74 24" stroke="#18181B" strokeWidth="5" strokeLinecap="round" />
    <path d="M26 50 L74 76" stroke="#18181B" strokeWidth="5" strokeLinecap="round" />
  </svg>
)

const PySparkIcon = () => (
  <div className="w-7 h-7 flex items-center justify-center">
    <svg className="w-7 h-7" viewBox="0 0 100 100">
      <path fill="#E25A1C" d="M50 8 L59 34 L86 34 L64 51 L72 78 L50 61 L28 78 L36 51 L14 34 L41 34 Z" />
      <circle cx="50" cy="48" r="9" fill="#FBBF24" />
    </svg>
  </div>
)

const PostgresIcon = () => (
  <svg className="w-7 h-7" viewBox="0 0 100 100">
    <path fill="#336791" d="M50 14 C28 14 18 28 18 46 C18 64 26 80 39 86 C41 83 42 78 42 74 C37 72 33 67 33 59 C33 49 41 44 50 44 C59 44 67 49 67 59 C67 67 63 72 58 74 C58 78 59 83 61 86 C74 80 82 64 82 46 C82 28 72 14 50 14 Z" />
    <circle cx="41" cy="40" r="3" fill="#FFFFFF" />
    <circle cx="59" cy="40" r="3" fill="#FFFFFF" />
  </svg>
)

const AnalyticsIcon = () => (
  <div className="w-7 h-7 flex items-end justify-center gap-1">
    <span className="w-1.5 h-3 rounded-t-sm bg-[#EA580C]" />
    <span className="w-1.5 h-6 rounded-t-sm bg-[#EA580C]" />
    <span className="w-1.5 h-4.5 rounded-t-sm bg-[#F97316]" />
    <span className="w-1.5 h-7 rounded-t-sm bg-[#EA580C]" />
  </div>
)

interface DataPipelineProps {
  onViewArchitecture: () => void
}

export const DataPipelineArchitecture: React.FC<DataPipelineProps> = ({ onViewArchitecture }) => {
  const [selectedNode, setSelectedNode] = useState<number | null>(null)

  const nodes = [
    {
      id: 'generator',
      name: 'Event Generator',
      tech: '(Python)',
      icon: PythonIcon,
      role: 'Generates realistic synthetic ride-booking lifecycle events with UUIDv4 and ISO-8601 UTC timestamps.',
      guarantee: 'Deterministic seedable replay & poison message injection',
    },
    {
      id: 'kafka',
      name: 'Kafka',
      tech: '(Event Bus)',
      icon: KafkaIcon,
      role: 'Single-node KRaft broker with ride_id partition keying ensuring FIFO per-ride event ordering.',
      guarantee: 'At-least-once delivery with partition ordering',
    },
    {
      id: 'processing',
      name: 'Stream Processing',
      tech: '(PySpark)',
      icon: PySparkIcon,
      role: 'Validates schema versioning, enforces monotonic ride state transitions, and detects out-of-order events.',
      guarantee: 'Fail-safe state transition matrix (REQUESTED to CANCELLED)',
    },
    {
      id: 'storage',
      name: 'PostgreSQL',
      tech: '(Data Store)',
      icon: PostgresIcon,
      role: 'Durable relational store for processed_events (ON CONFLICT DO NOTHING), ride projections, and dead_letter_events.',
      guarantee: 'Sole durable DLQ destination & pipeline counter persistence',
    },
    {
      id: 'analytics',
      name: 'Analytics & Dashboard',
      tech: '(StreamForge)',
      icon: AnalyticsIcon,
      role: 'FastAPI read-only query layer and Streamlit live operational telemetry with strict cohort metrics.',
      guarantee: 'Terminal cancellation cohorts & three-timestamp latency',
    },
  ]

  return (
    <section id="architecture" className="max-w-[1180px] mx-auto px-4 sm:px-6 py-8 md:py-12">
      
      {/* Outer Card Container matching screenshot */}
      <div className="relative bg-white rounded-3xl p-5 sm:p-7 lg:p-8 border border-neutral-100 shadow-[0_20px_45px_-12px_rgba(234,88,12,0.06),0_4px_15px_-3px_rgba(0,0,0,0.02)]">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          
          {/* Left Column */}
          <div className="lg:col-span-4 flex flex-col items-start pr-0 lg:pr-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF3EA] border border-[#FED7AA]/70 text-[#9A3412] text-xs font-semibold mb-3">
              <span className="w-2 h-2 rounded-full bg-[#EA580C]" />
              Data Pipeline
            </div>

            <h3 className="text-2xl sm:text-[26px] font-extrabold text-[#111827] tracking-tight mb-2">
              From event to insight.
            </h3>

            <p className="text-[13.5px] sm:text-[14px] text-neutral-600 leading-relaxed font-normal mb-5">
              A modern, end-to-end streaming data architecture built for speed, reliability, and real-time analytics.
            </p>

            <button
              onClick={onViewArchitecture}
              className="px-5 py-2.5 rounded-full bg-[#EA580C] hover:bg-[#D9480F] text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              View Architecture
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Right Column: 5 Pipeline Nodes with connecting arrows */}
          <div className="lg:col-span-8 w-full overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <div className="flex items-center justify-between min-w-[540px] sm:min-w-0 gap-1 sm:gap-2">
              {nodes.map((node, i) => {
                const IconComponent = node.icon
                const isSelected = selectedNode === i

                return (
                  <React.Fragment key={node.id}>
                    {/* Node Card */}
                    <motion.div
                      whileHover={{ y: -3, scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedNode(isSelected ? null : i)}
                      className={`relative flex-1 min-w-[85px] max-w-[115px] rounded-2xl p-2 sm:p-2.5 flex flex-col items-center text-center cursor-pointer transition-all duration-200 ${
                        isSelected 
                          ? 'bg-orange-50/90 border-2 border-[#EA580C] shadow-md shadow-orange-500/10'
                          : 'bg-white hover:bg-neutral-50/70 border border-neutral-200/80 shadow-2xs hover:shadow-xs'
                      }`}
                    >
                      {/* Node Icon */}
                      <div className="w-9 h-9 flex items-center justify-center mb-1.5">
                        <IconComponent />
                      </div>

                      {/* Node Title */}
                      <span className="text-[10px] sm:text-[11px] font-bold text-neutral-900 leading-tight">
                        {node.name}
                      </span>

                      {/* Node Tech subtitle */}
                      <span className="text-[8.5px] sm:text-[9px] text-neutral-400 mt-0.5 font-medium">
                        {node.tech}
                      </span>

                      {/* Selected dot */}
                      {isSelected && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#EA580C] ring-2 ring-white" />
                      )}
                    </motion.div>

                    {/* Connecting Arrow */}
                    {i < nodes.length - 1 && (
                      <div className="relative flex items-center justify-center px-0.5 text-neutral-300">
                        <ChevronRight className="w-3.5 h-3.5" />
                        {/* Subtle streaming particle */}
                        <motion.span
                          className="absolute w-1.5 h-1.5 rounded-full bg-[#EA580C]"
                          animate={{
                            x: [-6, 6],
                            opacity: [0, 1, 0],
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: 1.8,
                            delay: i * 0.35,
                            ease: 'easeInOut',
                          }}
                        />
                      </div>
                    )}
                  </React.Fragment>
                )
              })}
            </div>
          </div>

        </div>

        {/* Selected Node Spec Drawer */}
        <AnimatePresence>
          {selectedNode !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-4 border-t border-neutral-100 flex items-start justify-between bg-orange-50/50 rounded-xl p-4 border border-orange-100"
            >
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-orange-100 text-[#EA580C] flex items-center justify-center mt-0.5 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-900 text-sm">{nodes[selectedNode].name}</span>
                    <span className="text-xs text-[#EA580C] font-semibold">{nodes[selectedNode].tech}</span>
                  </div>
                  <p className="text-xs text-neutral-600 mt-1 leading-relaxed">
                    {nodes[selectedNode].role}
                  </p>
                  <p className="text-[11px] text-neutral-500 mt-1 font-mono">
                    Guarantee: <span className="text-neutral-800 font-semibold">{nodes[selectedNode].guarantee}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedNode(null)}
                className="text-neutral-400 hover:text-neutral-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

    </section>
  )
}
