import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Radio, Cpu, Database, BarChart2, 
  Activity, Layers, Sparkles, Check
} from 'lucide-react'

export const FeaturesGrid: React.FC = () => {
  // Card 1: Kafka topics interactive state
  const [activeTopic, setActiveTopic] = useState<'rides' | 'payments' | 'users'>('rides')
  const [topicRates, setTopicRates] = useState({
    rides: 12840,
    payments: 4120,
    users: 1950,
  })

  // Card 2: Python stream processing mode
  const [processingMode, setProcessingMode] = useState<'watermark' | 'dedup' | 'schema'>('watermark')
  const [lastProcessed, setLastProcessed] = useState('EVT-94281')

  // Card 3: PostgreSQL idempotency test trigger
  const [idemStatus, setIdemStatus] = useState<string>('ON CONFLICT (id) DO NOTHING')

  // Card 4: Live Analytics mini chart hover state
  const [chartHovered, setChartHovered] = useState(false)
  const [chartValue, setChartValue] = useState(14250)

  // Card 5: Monitoring latency simulation
  const [latencyP95, setLatencyP95] = useState(2.1)
  const [alertActive, setAlertActive] = useState(false)

  // Card 6: Docker service scale state
  const [activeContainers, setActiveContainers] = useState<Record<string, boolean>>({
    kafka: true,
    consumer: true,
    postgres: true,
    fastapi: true,
  })

  // Live simulation tick
  useEffect(() => {
    const timer = setInterval(() => {
      setTopicRates({
        rides: Math.floor(12500 + Math.random() * 600),
        payments: Math.floor(4000 + Math.random() * 300),
        users: Math.floor(1900 + Math.random() * 150),
      })
      setLastProcessed(`EVT-${Math.floor(10000 + Math.random() * 90000)}`)
      setChartValue(Math.floor(13800 + Math.random() * 900))
      setLatencyP95(+(1.8 + Math.random() * 0.7).toFixed(1))
    }, 2600)
    return () => clearInterval(timer)
  }, [])

  const handleTestIdempotency = () => {
    setIdemStatus('Replaying duplicate payload...')
    setTimeout(() => {
      setIdemStatus('0 Duplicates Written (Idempotent Pass)')
    }, 600)
    setTimeout(() => {
      setIdemStatus('ON CONFLICT (id) DO NOTHING')
    }, 3200)
  }

  const toggleContainer = (svc: string) => {
    setActiveContainers((prev) => ({
      ...prev,
      [svc]: !prev[svc],
    }))
  }

  return (
    <section id="features" className="w-full py-16 md:py-24 scroll-mt-12 bg-[#08080A] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 md:mb-18">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#D4CEBF] text-[10.5px] font-bold tracking-widest uppercase mb-3.5 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            <span>CORE ARCHITECTURE</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#F5F3EF] tracking-tight mb-4">
            Built for High-Throughput Streams
          </h2>

          <p className="text-sm sm:text-base text-[#A39E93] leading-relaxed">
            Every layer engineered with strict data engineering standards, fault tolerance, and mathematically verifiable consistency.
          </p>
        </div>

        {/* 3-Column Glassmorphism Grid matching the user's uploaded mockup */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

          {/* CARD 1: Real-time Ingestion — Apache Kafka */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.05 }}
            whileHover={{ y: -4 }}
            className="group relative rounded-3xl bg-[#0D0D14]/80 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.18] p-5 sm:p-6 flex flex-col justify-between shadow-xl transition-all overflow-hidden"
          >
            {/* Top Interactive Visual Sandbox */}
            <div className="relative h-[210px] w-full rounded-2xl bg-[#08080C] border border-white/[0.06] p-4 flex flex-col justify-between overflow-hidden mb-6">
              {/* Warm amber diagonal light beam */}
              <div className="pointer-events-none absolute -top-8 -right-8 w-44 h-44 rounded-full bg-gradient-to-br from-orange-500/35 to-amber-600/10 blur-2xl" />

              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/[0.06] relative z-10">
                <span className="font-mono text-[#A39E93] flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-orange-400" />
                  Kafka KRaft Topics
                </span>
                <span className="font-mono text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  4 Partitions Active
                </span>
              </div>

              {/* Topics Interactive Rows */}
              <div className="space-y-2 relative z-10">
                {[
                  { id: 'rides', name: 'streamforge.rides.v1', rate: topicRates.rides },
                  { id: 'payments', name: 'streamforge.payments.v1', rate: topicRates.payments },
                  { id: 'users', name: 'streamforge.auth.v1', rate: topicRates.users },
                ].map((t) => {
                  const isActive = activeTopic === t.id
                  return (
                    <div
                      key={t.id}
                      onClick={() => setActiveTopic(t.id as any)}
                      className={`cursor-pointer p-2.5 rounded-xl border flex items-center justify-between transition-all ${
                        isActive
                          ? 'bg-[#181824] border-orange-500/50 shadow-md ring-1 ring-orange-500/20'
                          : 'bg-white/[0.02] border-white/[0.04] hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-orange-400 animate-pulse' : 'bg-white/30'}`} />
                        <span className="font-mono text-[11px] text-[#D4CEBF]">{t.name}</span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-white">
                        {t.rate.toLocaleString()}/s
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#A39E93] font-mono relative z-10 pt-1">
                <span>Murmur2 Keying</span>
                <span className="text-orange-400">At-Least-Once Broker Guarantee</span>
              </div>
            </div>

            {/* Bottom Content */}
            <div>
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-orange-400 mb-3 group-hover:scale-105 group-hover:bg-orange-500/20 transition-all">
                <Radio className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-[#F5F3EF] mb-1.5">
                Real-time Ingestion — Apache Kafka
              </h3>
              <p className="text-xs sm:text-[13px] text-[#A39E93] leading-relaxed">
                Ingest high-frequency event streams with single-node KRaft broker efficiency, per-entity deterministic keying, and zero message loss.
              </p>
            </div>
          </motion.div>

          {/* CARD 2: Stream Processing — Python */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            whileHover={{ y: -4 }}
            className="group relative rounded-3xl bg-[#0D0D14]/80 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.18] p-5 sm:p-6 flex flex-col justify-between shadow-xl transition-all overflow-hidden"
          >
            {/* Top Interactive Visual Sandbox */}
            <div className="relative h-[210px] w-full rounded-2xl bg-[#08080C] border border-white/[0.06] p-4 flex flex-col justify-between overflow-hidden mb-6">
              {/* Ethereal blue-violet & amber glow beam */}
              <div className="pointer-events-none absolute -bottom-10 -left-10 w-44 h-44 rounded-full bg-gradient-to-tr from-cyan-500/20 via-orange-500/20 to-transparent blur-2xl" />

              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/[0.06] relative z-10">
                <span className="font-mono text-[#A39E93] flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  Python 3.11 Worker
                </span>
                <span className="font-mono text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                  Async Loop
                </span>
              </div>

              {/* Mode Selector Tabs */}
              <div className="grid grid-cols-3 gap-1.5 relative z-10">
                {[
                  { key: 'watermark', label: 'Watermark' },
                  { key: 'dedup', label: 'Deduplication' },
                  { key: 'schema', label: 'Schema Check' },
                ].map((mode) => (
                  <button
                    key={mode.key}
                    onClick={() => setProcessingMode(mode.key as any)}
                    className={`py-1 text-[10px] font-mono rounded-lg transition-all ${
                      processingMode === mode.key
                        ? 'bg-white/10 text-white font-bold border border-white/20'
                        : 'bg-white/[0.02] text-[#A39E93] hover:text-white'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Live Processing Terminal Box */}
              <div className="p-2.5 rounded-xl bg-[#14141E] border border-white/[0.06] font-mono text-[11px] space-y-1 relative z-10">
                <div className="text-[#A39E93] flex items-center justify-between">
                  <span>Target: {lastProcessed}</span>
                  <span className="text-emerald-400 flex items-center gap-0.5">
                    <Check className="w-3 h-3" /> 0.8ms
                  </span>
                </div>
                <div className="text-orange-400 text-[10px] truncate">
                  {processingMode === 'watermark' && 'watermark = 5m sliding window'}
                  {processingMode === 'dedup' && 'sha256 = state_store.contains(hash)'}
                  {processingMode === 'schema' && 'contract = pydantic.validate(v1.4)'}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#A39E93] font-mono relative z-10 pt-1">
                <span>Monotonic Transitions</span>
                <span className="text-cyan-400">Zero Unhandled Panics</span>
              </div>
            </div>

            {/* Bottom Content */}
            <div>
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-cyan-400 mb-3 group-hover:scale-105 group-hover:bg-cyan-500/20 transition-all">
                <Cpu className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-[#F5F3EF] mb-1.5">
                Stream Processing — Python
              </h3>
              <p className="text-xs sm:text-[13px] text-[#A39E93] leading-relaxed">
                Validate schemas, normalize timestamps, and enforce valid business state progressions in native async Python routines.
              </p>
            </div>
          </motion.div>

          {/* CARD 3: Reliable Storage — PostgreSQL */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.15 }}
            whileHover={{ y: -4 }}
            className="group relative rounded-3xl bg-[#0D0D14]/80 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.18] p-5 sm:p-6 flex flex-col justify-between shadow-xl transition-all overflow-hidden"
          >
            {/* Top Interactive Visual Sandbox */}
            <div className="relative h-[210px] w-full rounded-2xl bg-[#08080C] border border-white/[0.06] p-4 flex flex-col justify-between overflow-hidden mb-6">
              {/* Warm amber glowing backdrop */}
              <div className="pointer-events-none absolute -top-10 -right-6 w-44 h-44 rounded-full bg-gradient-to-br from-amber-500/30 to-orange-600/10 blur-2xl" />

              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/[0.06] relative z-10">
                <span className="font-mono text-[#A39E93] flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-amber-400" />
                  PostgreSQL 16 Tables
                </span>
                <span className="font-mono text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Daily Partitioning
                </span>
              </div>

              {/* Interactive Idempotency Box */}
              <div className="p-3 rounded-xl bg-[#14141E] border border-white/[0.06] space-y-2 relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#A39E93]">Constraint Rule</span>
                  <button
                    onClick={handleTestIdempotency}
                    className="text-[10px] font-mono font-bold text-orange-400 hover:text-white bg-orange-500/15 hover:bg-orange-500/25 px-2 py-0.5 rounded border border-orange-500/30 transition-all"
                    title="Click to test duplicate replay"
                  >
                    Test Duplicate Replay
                  </button>
                </div>
                <div className="font-mono text-[11px] text-[#D4CEBF] bg-[#0A0A0E] p-2 rounded-lg border border-white/[0.04]">
                  {idemStatus}
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#A39E93] font-mono relative z-10 pt-1">
                <span>Dead Letter Isolation</span>
                <span className="text-emerald-400">1.8ms Commit Latency</span>
              </div>
            </div>

            {/* Bottom Content */}
            <div>
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-amber-400 mb-3 group-hover:scale-105 group-hover:bg-amber-500/20 transition-all">
                <Database className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-[#F5F3EF] mb-1.5">
                Reliable Storage — PostgreSQL
              </h3>
              <p className="text-xs sm:text-[13px] text-[#A39E93] leading-relaxed">
                Persist clean events with idempotent upsert guarantees, automated daily table partitioning, and non-blocking DLQ isolation.
              </p>
            </div>
          </motion.div>

          {/* CARD 4: Live Analytics — Real-time dashboards */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
            whileHover={{ y: -4 }}
            className="group relative rounded-3xl bg-[#0D0D14]/80 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.18] p-5 sm:p-6 flex flex-col justify-between shadow-xl transition-all overflow-hidden"
          >
            {/* Top Interactive Visual Sandbox */}
            <div 
              onMouseEnter={() => setChartHovered(true)}
              onMouseLeave={() => setChartHovered(false)}
              className="relative h-[210px] w-full rounded-2xl bg-[#08080C] border border-white/[0.06] p-4 flex flex-col justify-between overflow-hidden mb-6 cursor-crosshair"
            >
              {/* Ethereal violet-amber glow */}
              <div className="pointer-events-none absolute -top-8 -left-8 w-44 h-44 rounded-full bg-gradient-to-br from-indigo-500/25 to-orange-500/20 blur-2xl" />

              <div className="flex items-center justify-between text-xs pb-1 border-b border-white/[0.06] relative z-10">
                <span className="font-mono text-[#A39E93] flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-orange-400" />
                  Live Operational Velocity
                </span>
                <span className="font-mono text-[10px] text-white font-bold">
                  {chartValue.toLocaleString()}/s
                </span>
              </div>

              {/* Real-time SVG Mini Chart with Floating Rating Card */}
              <div className="relative h-24 w-full flex items-end justify-center z-10">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 200 60">
                  <defs>
                    <linearGradient id="featureChartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EA580C" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#EA580C" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M 0,45 Q 40,25 70,35 T 140,15 T 200,20 L 200,60 L 0,60 Z"
                    fill="url(#featureChartGrad)"
                  />
                  <path
                    d="M 0,45 Q 40,25 70,35 T 140,15 T 200,20"
                    fill="none"
                    stroke="#F97316"
                    strokeWidth="2.5"
                  />
                  <circle cx="140" cy="15" r="3.5" fill="#FFFFFF" stroke="#EA580C" strokeWidth="2" />
                </svg>

                {/* Floating Rating Pill inspired by the reference design */}
                <motion.div
                  animate={{ y: chartHovered ? -5 : 0 }}
                  className="absolute top-1 right-2 p-2 rounded-xl bg-[#181824]/95 border border-white/15 shadow-xl text-[10px]"
                >
                  <div className="flex items-center gap-1 text-[#E7D7BE] font-bold">
                    <Sparkles className="w-3 h-3 text-orange-400" />
                    <span>Pipeline SLA</span>
                  </div>
                  <div className="font-mono text-white text-[11px] font-bold mt-0.5">
                    99.99% Uptime
                  </div>
                </motion.div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#A39E93] font-mono relative z-10 pt-1">
                <span>WebSocket Push</span>
                <span className="text-orange-400">Sub-5ms End-to-End</span>
              </div>
            </div>

            {/* Bottom Content */}
            <div>
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-orange-400 mb-3 group-hover:scale-105 group-hover:bg-orange-500/20 transition-all">
                <BarChart2 className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-[#F5F3EF] mb-1.5">
                Live Analytics — Real-time dashboards
              </h3>
              <p className="text-xs sm:text-[13px] text-[#A39E93] leading-relaxed">
                Stream real-time throughput metrics, consumer lag diagnostics, and cohort conversion telemetry straight to engineering consoles.
              </p>
            </div>
          </motion.div>

          {/* CARD 5: Monitoring & Alerts — Pipeline health and latency */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.25 }}
            whileHover={{ y: -4 }}
            className="group relative rounded-3xl bg-[#0D0D14]/80 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.18] p-5 sm:p-6 flex flex-col justify-between shadow-xl transition-all overflow-hidden"
          >
            {/* Top Interactive Visual Sandbox */}
            <div className="relative h-[210px] w-full rounded-2xl bg-[#08080C] border border-white/[0.06] p-4 flex flex-col justify-between overflow-hidden mb-6">
              {/* Warm sunset lighting aura */}
              <div className="pointer-events-none absolute -top-8 -right-8 w-44 h-44 rounded-full bg-gradient-to-br from-rose-500/25 to-orange-500/20 blur-2xl" />

              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/[0.06] relative z-10">
                <span className="font-mono text-[#A39E93] flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  Health & Latency Sentry
                </span>
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${
                  alertActive 
                    ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' 
                    : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                }`}>
                  {alertActive ? 'Degraded Alert' : 'Healthy 0 Lag'}
                </span>
              </div>

              {/* Latency and Alert Interactive Notification */}
              <div className="space-y-2 relative z-10">
                <div className="p-2.5 rounded-xl bg-[#14141E] border border-white/[0.06] flex items-center justify-between">
                  <span className="text-[11px] text-[#A39E93]">p95 End-to-End Latency:</span>
                  <span className="font-mono text-sm font-bold text-white">{latencyP95}ms</span>
                </div>

                <div 
                  onClick={() => setAlertActive(!alertActive)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    alertActive 
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
                      : 'bg-white/[0.02] border-white/[0.06] text-[#D4CEBF] hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="text-[11px] font-medium">
                    {alertActive ? 'Warning: High Lag Spike Detected' : 'DLQ Quarantine: 0 Errors'}
                  </span>
                  <span className="text-[10px] font-mono underline text-orange-400">
                    {alertActive ? 'Resolve' : 'Test Alert'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#A39E93] font-mono relative z-10 pt-1">
                <span>Three-Timestamp Tracing</span>
                <span className="text-emerald-400">Continuous Heartbeat</span>
              </div>
            </div>

            {/* Bottom Content */}
            <div>
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-105 group-hover:bg-emerald-500/20 transition-all">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-[#F5F3EF] mb-1.5">
                Monitoring & Alerts — Health and latency
              </h3>
              <p className="text-xs sm:text-[13px] text-[#A39E93] leading-relaxed">
                Isolate processing anomalies with automated dead-letter queue classification and proactive consumer lag alerts.
              </p>
            </div>
          </motion.div>

          {/* CARD 6: Scalable & Modular — Docker-based deployment */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
            whileHover={{ y: -4 }}
            className="group relative rounded-3xl bg-[#0D0D14]/80 backdrop-blur-xl border border-white/[0.08] hover:border-white/[0.18] p-5 sm:p-6 flex flex-col justify-between shadow-xl transition-all overflow-hidden"
          >
            {/* Top Interactive Visual Sandbox */}
            <div className="relative h-[210px] w-full rounded-2xl bg-[#08080C] border border-white/[0.06] p-4 flex flex-col justify-between overflow-hidden mb-6">
              {/* Ethereal deep amber & cyan lighting beam */}
              <div className="pointer-events-none absolute -bottom-8 -right-8 w-44 h-44 rounded-full bg-gradient-to-tl from-cyan-500/20 via-orange-500/25 to-transparent blur-2xl" />

              <div className="flex items-center justify-between text-xs pb-2 border-b border-white/[0.06] relative z-10">
                <span className="font-mono text-[#A39E93] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-orange-400" />
                  Docker Compose Swarm
                </span>
                <span className="font-mono text-[10px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                  4 Services
                </span>
              </div>

              {/* Service Container Pills */}
              <div className="grid grid-cols-2 gap-2 relative z-10">
                {[
                  { id: 'kafka', label: 'kafka:9092' },
                  { id: 'consumer', label: 'consumer-py' },
                  { id: 'postgres', label: 'postgres:5432' },
                  { id: 'fastapi', label: 'fastapi-app' },
                ].map((svc) => {
                  const isUp = activeContainers[svc.id]
                  return (
                    <div
                      key={svc.id}
                      onClick={() => toggleContainer(svc.id)}
                      className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isUp
                          ? 'bg-[#14141E] border-white/10 text-white'
                          : 'bg-white/[0.01] border-white/[0.04] text-[#71717A]'
                      }`}
                    >
                      <span className="font-mono text-[10px] truncate">{svc.label}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${isUp ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                    </div>
                  )
                })}
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#A39E93] font-mono relative z-10 pt-1">
                <span>Isolated Network</span>
                <span className="text-orange-400">Single-Command Boot</span>
              </div>
            </div>

            {/* Bottom Content */}
            <div>
              <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-orange-400 mb-3 group-hover:scale-105 group-hover:bg-orange-500/20 transition-all">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-[#F5F3EF] mb-1.5">
                Scalable & Modular — Docker-based
              </h3>
              <p className="text-xs sm:text-[13px] text-[#A39E93] leading-relaxed">
                Boot the entire streaming topology with one command using reproducible Docker containers and built-in cluster validation checks.
              </p>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  )
}
