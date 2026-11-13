import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowRight, ChevronRight, Car, User, 
  CreditCard, FileText, CheckCircle2, X,
  Terminal, Cpu, ShieldCheck, Copy, Check, Zap
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
  const [selectedNode, setSelectedNode] = useState<number | null>(1) // default to Kafka for instant exploration
  const [activeDrawerTab, setActiveDrawerTab] = useState<'overview' | 'contract' | 'metrics'>('overview')
  const [isTracing, setIsTracing] = useState(false)
  const [traceStep, setTraceStep] = useState<number | null>(null)
  const [copiedSnippet, setCopiedSnippet] = useState(false)

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
      sub: '(Python 3.11)',
      icon: PythonIcon,
      role: 'Emits high-throughput structured JSON event envelopes with UUIDv4, ISO-8601 UTC timestamps, and deterministic partitioning keys.',
      guarantee: 'At-Least-Once Delivery (Client Acknowledged)',
      throughput: '12,500 evt/sec',
      latency: '0.8ms generation overhead',
      contractSnippet: `{
  "event_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "event_type": "ride_booked",
  "schema_version": "1.4.0",
  "occurred_at": "2026-11-13T17:30:00.000Z",
  "partition_key": "ride_77189",
  "payload": {
    "passenger_id": "usr_9918",
    "driver_id": "drv_1021",
    "fare_usd": 32.40,
    "surge_multiplier": 1.15
  }
}`,
      metrics: [
        { label: 'Throughput', value: '12.5K/s' },
        { label: 'Memory Footprint', value: '48 MB' },
        { label: 'Payload Codec', value: 'JSON / Snappy' },
        { label: 'Keying Strategy', value: 'Murmur2 Hash' },
      ]
    },
    {
      id: 'bus',
      name: 'Kafka Broker',
      sub: '(KRaft Mode)',
      icon: KafkaIcon,
      role: 'Single-node KRaft broker with per-ride keying for strict partition-level FIFO ordering, zero Zookeeper dependencies, and instantaneous leader failover.',
      guarantee: 'Strict FIFO per Partition (acks=all)',
      throughput: '45,000 evt/sec peak',
      latency: '2.4ms broker latency',
      contractSnippet: `# kafka-topics.sh --bootstrap-server kafka:9092
Topic: streamforge.events.v1
  PartitionCount: 4
  ReplicationFactor: 1
  Configs:
    cleanup.policy=delete
    retention.ms=86400000 (24h)
    min.insync.replicas=1
    compression.type=lz4`,
      metrics: [
        { label: 'Partitions', value: '4 Active' },
        { label: 'Lag Target', value: '< 15 ms' },
        { label: 'Replication', value: 'KRaft Quorum' },
        { label: 'Buffer Size', value: '64 MB Heap' },
      ]
    },
    {
      id: 'spark',
      name: 'Stream Processing',
      sub: '(Apache Spark 3.5)',
      icon: SparkIcon,
      role: 'Monotonic state transitions, deduplication sliding window, and timestamp normalization with fault-tolerant checkpointing to local state stores.',
      guarantee: 'Exactly-Once Micro-Batching with Checkpoints',
      throughput: '28,000 evt/sec processed',
      latency: '14.2ms micro-batch window',
      contractSnippet: `df_stream = (
    spark.readStream
    .format("kafka")
    .option("kafka.bootstrap.servers", "kafka:9092")
    .option("subscribe", "streamforge.events.v1")
    .load()
    .selectExpr("CAST(key AS STRING)", "CAST(value AS STRING)")
    .select(from_json(col("value"), schema).alias("data"))
    .withWatermark("data.occurred_at", "5 minutes")
    .dropDuplicates(["data.event_id"])
)`,
      metrics: [
        { label: 'Watermark', value: '5 Minutes' },
        { label: 'Dedup Cache', value: 'StateStore RocksDB' },
        { label: 'Batch Interval', value: '250 ms' },
        { label: 'Validation Mode', value: 'Strict Enforced' },
      ]
    },
    {
      id: 'pg',
      name: 'PostgreSQL 16',
      sub: '(Storage & DLQ)',
      icon: PostgresIcon,
      role: 'Idempotent persistence (ON CONFLICT (event_id) DO NOTHING), partition-by-day table architectures, and persistent quarantine isolation for malformed events.',
      guarantee: 'ACID Transactions & Idempotent Upserts',
      throughput: '8,500 writes/sec',
      latency: '3.1ms write commit',
      contractSnippet: `CREATE TABLE IF NOT EXISTS streamforge_events (
  event_id UUID PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  partition_id VARCHAR(16) NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (occurred_at);

-- Dead Letter Quarantine Table
CREATE TABLE IF NOT EXISTS streamforge_dlq (
  quarantine_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_payload TEXT,
  error_diagnostic TEXT,
  retry_count INT DEFAULT 0,
  quarantined_at TIMESTAMPTZ DEFAULT NOW()
);`,
      metrics: [
        { label: 'Idempotency', value: 'ON CONFLICT PASS' },
        { label: 'Partitioning', value: 'Daily Ranges' },
        { label: 'DLQ Isolation', value: 'Zero Drop Rate' },
        { label: 'Connection Pool', value: 'PgBouncer 32' },
      ]
    },
    {
      id: 'api',
      name: 'FastAPI Backend',
      sub: '(Async REST & WS)',
      icon: FastAPIIcon,
      role: 'Read-only REST telemetry layer with cohort metrics, live WebSocket broadcast channels, and Prometheus telemetry scrape endpoints.',
      guarantee: 'Sub-5ms Latency p95 / Non-blocking Async',
      throughput: '15,000 req/sec',
      latency: '2.1ms p95 latency',
      contractSnippet: `@app.websocket("/ws/events")
async def websocket_events_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            evt = await event_queue.get()
            await websocket.send_json(evt.dict())
    except WebSocketDisconnect:
        logger.info("Telemetry client disconnected")`,
      metrics: [
        { label: 'Framework', value: 'Uvicorn ASGI' },
        { label: 'WebSocket Rate', value: 'Broadcast 100/s' },
        { label: 'Endpoints', value: 'REST + WS + Metrics' },
        { label: 'Response Format', value: 'Pydantic v2 JSON' },
      ]
    },
    {
      id: 'dash',
      name: 'Analytics UI',
      sub: '(StreamForge Studio)',
      icon: DashboardIcon,
      role: 'High-performance interactive telemetry dashboard rendering live charts, event inspections, pipeline health gauges, and instant DLQ replay controls.',
      guarantee: '60 FPS Canvas & Real-Time DOM Ticker',
      throughput: 'Real-time rendering',
      latency: '< 1 frame render tick',
      contractSnippet: `// WebSocket telemetry subscriber
const ws = new WebSocket('ws://localhost:8000/ws/events');
ws.onmessage = (message) => {
  const telemetry = JSON.parse(message.data);
  dispatchPipelineMetrics(telemetry);
};`,
      metrics: [
        { label: 'Rendering', value: 'React 19 + Framer' },
        { label: 'FPS Target', value: '60 FPS Solid' },
        { label: 'State Sync', value: 'Instant WS' },
        { label: 'Theme Specs', value: 'Obsidian Noir' },
      ]
    },
  ]

  // Flow Simulation (Packet Trace) Handler
  const handleTraceFlow = () => {
    if (isTracing) return
    setIsTracing(true)
    let current = 0
    setTraceStep(0)
    setSelectedNode(0)

    const interval = setInterval(() => {
      current++
      if (current < pipelineNodes.length) {
        setTraceStep(current)
        setSelectedNode(current)
      } else {
        clearInterval(interval)
        setIsTracing(false)
        setTraceStep(null)
      }
    }, 650)
  }

  // Copy Snippet Handler
  const handleCopySnippet = (snippet: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(snippet)
    }
    setCopiedSnippet(true)
    setTimeout(() => setCopiedSnippet(false), 2000)
  }

  const activeNodeData = selectedNode !== null ? pipelineNodes[selectedNode] : null

  return (
    <section id="architecture" className="w-full py-12 md:py-20 scroll-mt-12 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header and Telemetry Action Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-8">
          
          {/* Left Column: Heading & Button */}
          <div className="lg:col-span-4 flex flex-col items-start pr-0 lg:pr-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#D4CEBF] text-[10px] font-bold tracking-widest uppercase mb-3.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E7D7BE]" />
              <span>Infrastructure Map</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-[#F5F3EF] tracking-tight mb-2">
              System Architecture
            </h3>

            <p className="text-xs sm:text-sm text-[#A39E93] leading-relaxed font-normal mb-5">
              A fault-tolerant streaming architecture engineered for at-least-once delivery, idempotent persistence, and sub-5ms operational intelligence.
            </p>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={onViewArchitecture}
                className="px-5 py-2.5 rounded-full bg-[#E7D7BE] hover:bg-[#F3E8D6] text-[#08080A] font-bold text-xs uppercase flex items-center gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                View Architecture
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={handleTraceFlow}
                disabled={isTracing}
                className={`px-4 py-2.5 rounded-full text-xs font-semibold uppercase flex items-center gap-1.5 transition-all border ${
                  isTracing 
                    ? 'bg-[#E7D7BE]/20 text-[#E7D7BE] border-[#E7D7BE]/40 cursor-wait' 
                    : 'bg-white/[0.04] text-[#D4CEBF] border-white/10 hover:bg-white/[0.08]'
                }`}
                title="Trace simulated packet across nodes"
              >
                <Zap className={`w-3.5 h-3.5 ${isTracing ? 'text-amber-400 animate-spin' : 'text-[#E7D7BE]'}`} />
                <span>{isTracing ? `Tracing Node ${traceStep! + 1}/6...` : 'Trace Packet'}</span>
              </button>
            </div>
          </div>

          {/* Right Column: Visual Streaming Topology Pipeline */}
          <div className="lg:col-span-8 w-full overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
            <div className="flex items-center gap-3 min-w-[760px] relative">
              
              {/* Event Sources Box */}
              <div className="w-[125px] shrink-0 bg-[#0E0E12] rounded-2xl p-3 border border-white/[0.08] shadow-sm">
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

              {/* Arrow into pipeline with signal particle */}
              <div className="text-[#7A756D] shrink-0 relative flex items-center justify-center">
                <ChevronRight className="w-4 h-4" />
                <motion.span 
                  className="absolute w-1.5 h-1.5 rounded-full bg-[#E7D7BE]"
                  animate={{ x: [-8, 8], opacity: [0, 1, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                />
              </div>

              {/* StreamForge Data Pipeline Enclosure */}
              <div className="flex-1 bg-[#0E0E12]/90 rounded-2xl p-3 sm:p-4 border border-dashed border-[#E7D7BE]/35 relative shadow-sm">
                <span className="absolute -top-2.5 left-4 px-2 py-0.2 bg-[#08080A] text-[10px] font-bold text-[#E7D7BE] border border-[#E7D7BE]/30 rounded-full uppercase tracking-wider">
                  StreamForge Data Pipeline
                </span>

                <div className="flex items-center justify-between gap-1.5 pt-1 relative">
                  {pipelineNodes.map((node, i) => {
                    const Icon = node.icon
                    const isSelected = selectedNode === i
                    const isStepActive = traceStep === i

                    return (
                      <React.Fragment key={node.id}>
                        <motion.div
                          whileHover={{ y: -2, scale: 1.02 }}
                          onClick={() => {
                            setSelectedNode(isSelected ? null : i)
                            setActiveDrawerTab('overview')
                          }}
                          className={`flex-1 min-w-[80px] max-w-[130px] rounded-xl p-2.5 flex flex-col items-center text-center cursor-pointer transition-all relative ${
                            isStepActive
                              ? 'bg-amber-500/25 border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)] scale-105'
                              : isSelected
                              ? 'bg-[#E7D7BE]/15 border-2 border-[#E7D7BE] shadow-[0_0_15px_rgba(231,215,190,0.15)]'
                              : 'bg-[#14141A] hover:bg-[#1A1A22] border border-white/[0.06] shadow-2xs'
                          }`}
                        >
                          {isStepActive && (
                            <span className="absolute -top-2 right-2 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                          )}
                          <div className="w-7 h-7 flex items-center justify-center mb-1">
                            <Icon />
                          </div>
                          <span className="text-[10px] font-bold text-[#F5F3EF] leading-tight">
                            {node.name}
                          </span>
                          <span className="text-[8px] text-[#A39E93] mt-0.5">
                            {node.sub}
                          </span>
                        </motion.div>

                        {i < pipelineNodes.length - 1 && (
                          <div className="text-[#7A756D] px-0.5 shrink-0 relative flex items-center justify-center">
                            <ChevronRight className="w-3.5 h-3.5" />
                            {/* Micro animated particle traversing connector */}
                            <motion.span 
                              className="absolute w-1 h-1 rounded-full bg-[#E7D7BE]"
                              animate={{ x: [-4, 4], opacity: [0.2, 1, 0.2] }}
                              transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2, ease: 'linear' }}
                            />
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

        {/* Selected Node Technical Inspection Drawer */}
        <AnimatePresence>
          {activeNodeData && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden bg-[#0E0E12] rounded-2xl border border-[#E7D7BE]/30 shadow-xl"
            >
              {/* Drawer Title Bar & Navigation */}
              <div className="px-5 py-3.5 bg-[#14141A] border-b border-white/[0.06] flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#E7D7BE]">
                    <activeNodeData.icon />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#F5F3EF] text-sm">
                        {activeNodeData.name}
                      </span>
                      <span className="text-xs text-[#A39E93] font-mono">
                        {activeNodeData.sub}
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-mono">
                      Guarantee: {activeNodeData.guarantee}
                    </span>
                  </div>
                </div>

                {/* Drawer Tab Switchers */}
                <div className="flex items-center gap-1.5 bg-[#08080A] p-1 rounded-lg border border-white/[0.06]">
                  {[
                    { key: 'overview', label: 'Overview', icon: CheckCircle2 },
                    { key: 'contract', label: 'Contract / Schema', icon: Terminal },
                    { key: 'metrics', label: 'Telemetry Coordinates', icon: Cpu },
                  ].map((tab) => {
                    const isActive = activeDrawerTab === tab.key
                    const TabIcon = tab.icon
                    return (
                      <button
                        key={tab.key}
                        onClick={() => setActiveDrawerTab(tab.key as any)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all ${
                          isActive
                            ? 'bg-[#E7D7BE] text-[#08080A]'
                            : 'text-[#A39E93] hover:text-[#F5F3EF] hover:bg-white/[0.04]'
                        }`}
                      >
                        <TabIcon className="w-3.5 h-3.5" />
                        <span>{tab.label}</span>
                      </button>
                    )
                  })}

                  <button 
                    onClick={() => setSelectedNode(null)}
                    className="p-1 text-[#7A756D] hover:text-[#F5F3EF] ml-1"
                    title="Close inspection drawer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Drawer Body Content */}
              <div className="p-5">
                {activeDrawerTab === 'overview' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-3">
                      <div className="text-xs uppercase font-bold text-[#E7D7BE] tracking-wider">
                        Component Mission & Functional Role
                      </div>
                      <p className="text-xs sm:text-[13px] text-[#D4CEBF] leading-relaxed">
                        {activeNodeData.role}
                      </p>
                      <div className="p-3 bg-white/[0.02] rounded-xl border border-white/[0.05] space-y-1.5">
                        <div className="text-[11px] font-bold text-[#F5F3EF] flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Resilience & Recovery Pattern</span>
                        </div>
                        <p className="text-xs text-[#A39E93]">
                          Every failure mode triggers immediate state checkpoint restoration or dead-letter quarantine isolation without halting upstream event production.
                        </p>
                      </div>
                    </div>

                    <div className="bg-[#14141A] p-4 rounded-xl border border-white/[0.06] space-y-2.5">
                      <div className="text-[11px] uppercase font-bold text-[#A39E93]">
                        Live Performance Benchmarks
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#A39E93]">Peak Throughput:</span>
                        <span className="font-mono font-bold text-[#F5F3EF]">{activeNodeData.throughput}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#A39E93]">Processing Latency:</span>
                        <span className="font-mono text-emerald-400">{activeNodeData.latency}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-[#A39E93]">Fault Isolation:</span>
                        <span className="font-mono text-[#E7D7BE]">Automated DLQ</span>
                      </div>
                    </div>
                  </div>
                )}

                {activeDrawerTab === 'contract' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs uppercase font-bold text-[#A39E93]">
                        Production Schema / Configuration Payload
                      </span>
                      <button
                        onClick={() => handleCopySnippet(activeNodeData.contractSnippet)}
                        className="text-xs text-[#E7D7BE] hover:underline flex items-center gap-1 font-mono"
                      >
                        {copiedSnippet ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied to Clipboard!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Snippet</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="text-xs font-mono text-[#D4CEBF] bg-[#0A0A0D] p-4 rounded-xl border border-white/[0.08] overflow-x-auto leading-relaxed">
                      {activeNodeData.contractSnippet}
                    </pre>
                  </div>
                )}

                {activeDrawerTab === 'metrics' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {activeNodeData.metrics.map((m, idx) => (
                      <div key={idx} className="bg-[#14141A] p-3.5 rounded-xl border border-white/[0.06]">
                        <span className="text-[10px] text-[#A39E93] uppercase tracking-wider block mb-1">
                          {m.label}
                        </span>
                        <span className="text-sm font-bold font-mono text-[#F5F3EF]">
                          {m.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  )
}
