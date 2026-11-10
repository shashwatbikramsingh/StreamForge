import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, Cog, Database, BarChart2, 
  ArrowRight, Play, Pause, Terminal, 
  CheckCircle2, Copy, Check, Zap 
} from 'lucide-react'

export const HowItWorks: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [copiedSnippet, setCopiedSnippet] = useState(false)

  const steps = [
    {
      idx: 0,
      title: 'Ingest',
      sub: 'Stage 01',
      desc: 'Capture continuous events from applications and microservices via high-throughput Kafka topics.',
      icon: Upload,
      protocol: 'Kafka KRaft Binary Protocol',
      topic: 'streamforge.events.v1 (4 partitions)',
      latencyTarget: '< 2.1ms p99 ingestion latency',
      guarantee: 'At-Least-Once Broker Receipt (acks=all)',
      details: 'Events are keyed using deterministic Murmur2 hashing to guarantee partition-level FIFO ordering. The producer validates JSON payloads before network transmission.',
      codeSnippet: `// Producer Ingestion Envelope (streamforge.events.v1)
{
  "event_id": "c9a0b12e-4b7d-4fa1-8201-9a71d8e12f0a",
  "event_type": "ride_booked",
  "partition_key": "ride_99182",
  "occurred_at": "2026-11-10T14:30:00.000Z",
  "payload": {
    "passenger_id": "usr_4812",
    "pickup_lat": 37.7749,
    "pickup_lng": -122.4194
  }
}`
    },
    {
      idx: 1,
      title: 'Process',
      sub: 'Stage 02',
      desc: 'Validate schemas, transform payloads, and maintain monotonic state using Apache Spark Streaming.',
      icon: Cog,
      protocol: 'Apache Spark Structured Streaming 3.5',
      topic: 'StateStore RocksDB + 5m Watermark',
      latencyTarget: '< 15ms micro-batch latency',
      guarantee: 'Fault-Tolerant Stateful Checkpointing',
      details: 'Spark validates event schemas against registered contracts, enforces strict monotonic state transitions, and drops duplicate payloads arriving within a 5-minute sliding window.',
      codeSnippet: `# Spark Streaming Monotonic State & Dedup
parsed_stream = (
    raw_kafka_df
    .select(from_json(col("value"), schema).alias("event"))
    .withWatermark("event.occurred_at", "5 minutes")
    .dropDuplicates(["event.event_id"])
    .filter(is_valid_state_transition(col("event.state")))
)`
    },
    {
      idx: 2,
      title: 'Store',
      sub: 'Stage 03',
      desc: 'Persist clean, idempotent records in PostgreSQL partitioned by day with automated DLQ quarantine.',
      icon: Database,
      protocol: 'PostgreSQL 16 partitioned tables',
      topic: 'Daily partition ranges + DLQ isolation',
      latencyTarget: '< 3.2ms transaction commit',
      guarantee: 'ACID Upserts (ON CONFLICT DO NOTHING)',
      details: 'Clean events are written to partitioned PostgreSQL tables with strict unique constraints. Any malformed payload is instantly redirected to the durable DLQ table without stopping ingestion.',
      codeSnippet: `-- Idempotent Storage & Dead-Letter Isolation
INSERT INTO streamforge_events (
  event_id, event_type, partition_key, occurred_at, payload
) VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (event_id) DO NOTHING;

-- Non-blocking Dead Letter Queue Table
-- Error records quarantined with diagnostic stack trace`
    },
    {
      idx: 3,
      title: 'Analyze',
      sub: 'Stage 04',
      desc: 'Extract actionable signals, broadcast live WebSocket metrics, and trigger real-time anomaly alerts.',
      icon: BarChart2,
      protocol: 'FastAPI Async WebSocket broadcast',
      topic: 'Live broadcast channels + Prometheus',
      latencyTarget: '< 1ms UI DOM update tick',
      guarantee: 'Zero-Lag 60 FPS Telemetry Streaming',
      details: 'The operational dashboard maintains an open WebSocket link to stream real-time throughput KPIs, cohort conversion metrics, and instant DLQ quarantine alerts directly to engineers.',
      codeSnippet: `// WebSocket Telemetry Client
const socket = new WebSocket('ws://localhost:8000/ws/events');
socket.onmessage = (event) => {
  const telemetry = JSON.parse(event.data);
  updateLiveThroughputGauge(telemetry.processing_rate);
  renderEventTicker(telemetry.latest_event);
};`
    },
  ]

  // Auto-play timer for interactive walkthrough
  useEffect(() => {
    if (!isPlaying) return
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [isPlaying, steps.length])

  const handleCopy = (code: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(code)
    }
    setCopiedSnippet(true)
    setTimeout(() => setCopiedSnippet(false), 2000)
  }

  const currentStepData = steps[activeStep]

  return (
    <section id="how-it-works" className="w-full py-12 md:py-20 border-t border-white/[0.04] scroll-mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading & Cycle Playback Bar */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div className="text-left max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#D4CEBF] text-[10px] font-bold tracking-widest uppercase mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E7D7BE]" />
              <span>OPERATIONAL FLOW</span>
            </div>

            <h3 className="text-3xl sm:text-4xl font-extrabold text-[#F5F3EF] tracking-tight mb-3">
              From Event to Insight
            </h3>

            <p className="text-sm sm:text-base text-[#A39E93] leading-relaxed font-normal">
              An end-to-end streaming architecture that ingests raw telemetry, validates schema integrity, and persists trustworthy operational intelligence.
            </p>
          </div>

          {/* Interactive Play/Pause Simulation Toggle */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                isPlaying
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25'
                  : 'bg-white/[0.04] text-[#D4CEBF] border-white/10 hover:bg-white/[0.08]'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 text-amber-400" /> : <Play className="w-3.5 h-3.5 text-[#E7D7BE]" />}
              <span>{isPlaying ? 'Pause Simulation' : 'Auto Cycle'}</span>
            </button>
            <div className="text-[11px] font-mono text-[#A39E93] px-2 py-1 rounded-md bg-white/[0.02] border border-white/[0.05]">
              Step {activeStep + 1} of 4
            </div>
          </div>
        </div>

        {/* 4 Steps Interactive Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {steps.map((step, idx) => {
            const Icon = step.icon
            const isActive = activeStep === idx

            return (
              <motion.div
                key={step.title}
                whileHover={{ y: -2 }}
                onClick={() => {
                  setActiveStep(idx)
                  setIsPlaying(false)
                }}
                className={`relative rounded-2xl p-5 cursor-pointer transition-all border flex flex-col justify-between ${
                  isActive
                    ? 'bg-[#14141A] border-[#E7D7BE] shadow-[0_0_20px_rgba(231,215,190,0.15)] ring-1 ring-[#E7D7BE]/30'
                    : 'bg-[#0E0E12] border-white/[0.08] hover:border-white/20 hover:bg-[#14141A]/70 shadow-md'
                }`}
              >
                {/* Active animated progress indicator line */}
                {isActive && isPlaying && (
                  <motion.div
                    className="absolute top-0 left-0 right-0 h-1 bg-[#E7D7BE] rounded-t-2xl"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 4, ease: 'linear' }}
                  />
                )}

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                      isActive 
                        ? 'bg-[#E7D7BE] text-[#08080A]' 
                        : 'bg-white/[0.04] border border-white/10 text-[#E7D7BE]'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#A39E93]">
                      {step.sub}
                    </span>
                  </div>

                  <h4 className="text-base font-bold text-[#F5F3EF] mb-1">
                    {step.title}
                  </h4>
                  <p className="text-xs text-[#A39E93] leading-relaxed">
                    {step.desc}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px]">
                  <span className={`font-medium ${isActive ? 'text-[#E7D7BE]' : 'text-[#71717A]'}`}>
                    {isActive ? 'Active Stage' : 'Click to inspect'}
                  </span>
                  <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isActive ? 'translate-x-1 text-[#E7D7BE]' : 'text-[#71717A]'}`} />
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Dynamic Stage Telemetry & Code Inspection Box */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStepData.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="bg-[#0E0E12] rounded-2xl border border-[#E7D7BE]/30 p-5 sm:p-7 shadow-xl"
          >
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between pb-4 mb-5 border-b border-white/[0.06] gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#E7D7BE]">
                  <currentStepData.icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#F5F3EF]">
                      {currentStepData.sub}: {currentStepData.title} Deep Dive
                    </span>
                    <span className="text-xs font-mono text-[#E7D7BE] bg-[#E7D7BE]/10 px-2 py-0.5 rounded border border-[#E7D7BE]/20">
                      {currentStepData.protocol}
                    </span>
                  </div>
                  <span className="text-xs text-[#A39E93]">{currentStepData.topic}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-400 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{currentStepData.guarantee}</span>
                </div>
                <div className="text-[#A39E93] font-mono">
                  SLA: {currentStepData.latencyTarget}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Architecture Detail Explanation */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                <div>
                  <h5 className="text-xs uppercase font-bold text-[#E7D7BE] tracking-wider mb-2">
                    Engineering Mechanics & Invariants
                  </h5>
                  <p className="text-xs sm:text-[13px] text-[#D4CEBF] leading-relaxed">
                    {currentStepData.details}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.05] space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#F5F3EF]">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Pipeline Integrity Guarantee</span>
                  </div>
                  <p className="text-xs text-[#A39E93] leading-relaxed">
                    Every state transition is checkpointed with strict schema contracts. Zero unmonitored silent drops across broker and database layers.
                  </p>
                </div>
              </div>

              {/* Code Snippet Box with Copy Button */}
              <div className="lg:col-span-7">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs text-[#A39E93] font-mono">
                    <Terminal className="w-3.5 h-3.5 text-[#E7D7BE]" />
                    <span>Contract & Serialization Protocol</span>
                  </div>
                  <button
                    onClick={() => handleCopy(currentStepData.codeSnippet)}
                    className="text-xs text-[#E7D7BE] hover:underline flex items-center gap-1 font-mono"
                  >
                    {copiedSnippet ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                <pre className="text-xs font-mono text-[#D4CEBF] bg-[#0A0A0D] p-4 rounded-xl border border-white/[0.08] overflow-x-auto leading-relaxed">
                  {currentStepData.codeSnippet}
                </pre>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

      </div>
    </section>
  )
}
