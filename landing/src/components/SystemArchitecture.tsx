import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowRight, ChevronRight, Car, User, 
  CreditCard, FileText, CheckCircle2, X 
} from 'lucide-react'

// SVGs for the nodes
const PythonIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 110 110">
    <path fill="#387EB8" d="M54.5 10.4c-24 0-22.5 10.4-22.5 10.4l.03 10.8h22.8v3.3H23.1s-14.8 1.7-14.8 21.6c0 19.9 12.9 20.8 12.9 20.8h7.7v-10.8s-.4-12.9 12.7-12.9h22s12.2-.2 12.2-11.9v-20.2s1.7-10.8-21.3-10.8zM42.1 17.2c2.2 0 4 1.8 4 4s-1.8 4-4 4-4-1.8-4-4 1.8-4 4-4z" />
    <path fill="#FFE052" d="M55.5 99.6c24 0 22.5-10.4 22.5-10.4l-.03-10.8H55.2v-3.3h31.7s14.8-1.7 14.8-21.6c0-19.9-12.9-20.8-12.9-20.8h-7.7v10.8s.4 12.9-12.7 12.9h-22s-12.2.2-12.2 11.9v20.2s-1.7 10.8 21.3 10.8zm12.4-6.8c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z" />
  </svg>
)

const KafkaIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 100 100">
    <circle cx="26" cy="50" r="11" fill="#F5F3EF" />
    <circle cx="74" cy="24" r="9" fill="#F5F3EF" />
    <circle cx="74" cy="76" r="9" fill="#F5F3EF" />
    <path d="M26 50 L74 24" stroke="#F5F3EF" strokeWidth="5" strokeLinecap="round" />
    <path d="M26 50 L74 76" stroke="#F5F3EF" strokeWidth="5" strokeLinecap="round" />
  </svg>
)

const SparkIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 100 100">
    <path fill="#E25A1C" d="M50 8 L59 34 L86 34 L64 51 L72 78 L50 61 L28 78 L36 51 L14 34 L41 34 Z" />
    <circle cx="50" cy="48" r="9" fill="#FBBF24" />
  </svg>
)

const PostgresIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 100 100">
    <path fill="#336791" d="M50 14 C28 14 18 28 18 46 C18 64 26 80 39 86 C41 83 42 78 42 74 C37 72 33 67 33 59 C33 49 41 44 50 44 C59 44 67 49 67 59 C67 67 63 72 58 74 C58 78 59 83 61 86 C74 80 82 64 82 46 C82 28 72 14 50 14 Z" />
    <circle cx="41" cy="40" r="3" fill="#FFFFFF" />
    <circle cx="59" cy="40" r="3" fill="#FFFFFF" />
  </svg>
)

const FastAPIIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="46" fill="#059669" />
    <path d="M52 18 L26 54 L48 54 L44 82 L74 46 L52 46 Z" fill="#FFFFFF" />
  </svg>
)

const DashboardIcon = () => (
  <div className="w-6 h-6 flex items-end justify-center gap-0.5">
    <span className="w-1.5 h-2.5 rounded-t-xs bg-[#E7D7BE]" />
    <span className="w-1.5 h-4 rounded-t-xs bg-[#EA580C]" />
    <span className="w-1.5 h-5 rounded-t-xs bg-[#E7D7BE]" />
  </div>
)

interface SystemArchitectureProps {
  onViewArchitecture: () => void
}

export const SystemArchitecture: React.FC<SystemArchitectureProps> = ({ onViewArchitecture }) => {
  const [selectedNode, setSelectedNode] = useState<number | null>(null)

  const sources = [
    { name: 'Ride Events', icon: Car },
    { name: 'User Events', icon: User },
    { name: 'Payment Events', icon: CreditCard },
    { name: 'System Logs', icon: FileText },
  ]

  const pipelineNodes = [
    {
      id: 'gen',
      name: 'Event Generator',
      sub: '(Python)',
      icon: PythonIcon,
      role: 'Emits structured JSON envelopes with UUIDv4 and ISO-8601 UTC timestamps.',
    },
    {
      id: 'bus',
      name: 'Kafka',
      sub: '(Event Bus)',
      icon: KafkaIcon,
      role: 'Single-node KRaft broker with per-ride keying for ordering.',
    },
    {
      id: 'spark',
      name: 'Stream Processing',
      sub: '(Apache Spark)',
      icon: SparkIcon,
      role: 'Monotonic state transitions and timestamp normalization.',
    },
    {
      id: 'pg',
      name: 'PostgreSQL',
      sub: '(Data Store)',
      icon: PostgresIcon,
      role: 'Idempotent persistence (ON CONFLICT DO NOTHING) and durable DLQ.',
    },
    {
      id: 'api',
      name: 'FastAPI',
      sub: '(API Layer)',
      icon: FastAPIIcon,
      role: 'Read-only REST telemetry layer with cohort metrics.',
    },
    {
      id: 'dash',
      name: 'Dashboard',
      sub: '(Analytics UI)',
      icon: DashboardIcon,
      role: 'Operational dashboard rendering real-time metrics.',
    },
  ]

  return (
    <section id="architecture" className="w-full px-4 sm:px-6 lg:px-8 py-2 md:py-3 scroll-mt-12">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Heading & Button */}
        <div className="lg:col-span-3 flex flex-col items-start pr-0 lg:pr-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#D4CEBF] text-[10px] font-bold tracking-widest uppercase mb-3.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E7D7BE]" />
            <span>Infrastructure Map</span>
          </div>

          <h3 className="text-2xl sm:text-[26px] font-extrabold text-[#F5F3EF] tracking-tight mb-2">
            System Architecture
          </h3>

          <p className="text-xs sm:text-[13px] text-[#A39E93] leading-relaxed font-normal mb-6">
            A scalable, modular, and production-ready data pipeline for real-time event processing.
          </p>

          <button
            onClick={onViewArchitecture}
            className="px-5 py-2.5 rounded-full bg-[#E7D7BE] hover:bg-[#F3E8D6] text-[#08080A] font-bold text-xs uppercase flex items-center gap-2 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            View Full Architecture
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Column: Event Sources + Dashed StreamForge Pipeline Enclosure in Dark Glass */}
        <div className="lg:col-span-9 w-full overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          <div className="flex items-center gap-3 min-w-[760px]">
            
            {/* Event Sources Box */}
            <div className="w-[125px] shrink-0 bg-[#0E0E12]/90 rounded-2xl p-3 border border-white/[0.08] shadow-sm">
              <span className="block text-[10px] font-bold text-[#E7D7BE] mb-2 uppercase tracking-wider">
                Event Sources
              </span>
              <div className="space-y-1.5">
                {sources.map((s, i) => {
                  const Icon = s.icon
                  return (
                    <div key={i} className="flex items-center gap-1.5 text-[10px] text-[#D4CEBF] bg-white/[0.02] border border-white/[0.04] px-1.5 py-1 rounded-md">
                      <Icon className="w-3 h-3 text-[#E7D7BE]" />
                      <span className="truncate">{s.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Arrow into pipeline */}
            <div className="text-[#7A756D] shrink-0">
              <ChevronRight className="w-4 h-4" />
            </div>

            {/* Dashed StreamForge Data Pipeline Enclosure */}
            <div className="flex-1 bg-[#0E0E12]/80 rounded-2xl p-3 sm:p-4 border border-dashed border-[#E7D7BE]/35 relative shadow-sm">
              <span className="absolute -top-2.5 left-4 px-2 py-0.2 bg-[#08080A] text-[10px] font-bold text-[#E7D7BE] border border-[#E7D7BE]/30 rounded-full uppercase tracking-wider">
                StreamForge Data Pipeline
              </span>

              <div className="flex items-center justify-between gap-1.5 pt-1">
                {pipelineNodes.map((node, i) => {
                  const Icon = node.icon
                  const isSelected = selectedNode === i

                  return (
                    <React.Fragment key={node.id}>
                      <motion.div
                        whileHover={{ y: -2, scale: 1.02 }}
                        onClick={() => setSelectedNode(isSelected ? null : i)}
                        className={`flex-1 min-w-[78px] max-w-[130px] rounded-xl p-2 flex flex-col items-center text-center cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-[#E7D7BE]/15 border-2 border-[#E7D7BE] shadow-[0_0_15px_rgba(231,215,190,0.15)]'
                            : 'bg-[#14141A] hover:bg-[#1A1A22] border border-white/[0.06] shadow-2xs'
                        }`}
                      >
                        <div className="w-7 h-7 flex items-center justify-center mb-1">
                          <Icon />
                        </div>
                        <span className="text-[9.5px] font-bold text-[#F5F3EF] leading-tight">
                          {node.name}
                        </span>
                        <span className="text-[8px] text-[#A39E93] mt-0.5">
                          {node.sub}
                        </span>
                      </motion.div>

                      {i < pipelineNodes.length - 1 && (
                        <div className="text-[#7A756D] px-0.5 shrink-0">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      )}
                    </React.Fragment>
                  )
                })}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Selected Node Drawer */}
      <AnimatePresence>
        {selectedNode !== null && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-3 flex items-start justify-between bg-[#14141A] rounded-xl p-4 border border-[#E7D7BE]/30 shadow-lg"
          >
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-[#E7D7BE]/15 text-[#E7D7BE] flex items-center justify-center mt-0.5 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <span className="font-bold text-[#F5F3EF] text-xs">
                  {pipelineNodes[selectedNode].name} {pipelineNodes[selectedNode].sub}
                </span>
                <p className="text-xs text-[#A39E93] mt-1">
                  {pipelineNodes[selectedNode].role}
                </p>
              </div>
            </div>
            <button onClick={() => setSelectedNode(null)} className="text-[#7A756D] hover:text-[#F5F3EF] p-1">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

    </section>
  )
}
