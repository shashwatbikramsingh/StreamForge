import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Activity, Search, Copy, Check, 
  Pause, Play, PlusCircle, ChevronDown, ChevronUp, 
  Code2, Filter, AlertOctagon, X, BarChart2, Layers, ArrowUpRight
} from 'lucide-react'
import { StreamForgeHexagonLogo } from './SocialIcons'

interface StreamEvent {
  id: string
  type: string
  status: 'Success' | 'Failed'
  time: string
  partition: string
  latency: string
  payload?: Record<string, any>
  dedupHash?: string
}

interface ProductPreviewProps {
  onViewDashboard: () => void
}

export const ProductPreview: React.FC<ProductPreviewProps> = ({ onViewDashboard }) => {
  const [connectionMode, setConnectionMode] = useState<'websocket' | 'rest' | 'simulated'>('simulated')
  const [isPaused, setIsPaused] = useState(false)
  const [filterCategory, setFilterCategory] = useState<'all' | 'ride' | 'payment' | 'login' | 'dlq'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null)

  // Live fluctuating metrics for the showcase
  const [throughput, setThroughput] = useState(12840)
  const [activeRides, setActiveRides] = useState(2318)
  const [avgLatency, setAvgLatency] = useState(320)
  const [selectedMetric, setSelectedMetric] = useState<'throughput' | 'rides' | 'latency'>('throughput')

  const [events, setEvents] = useState<StreamEvent[]>([
    { 
      id: 'EVT-94281', 
      type: 'ride_booked', 
      status: 'Success', 
      time: '11:00:24', 
      partition: 'P-02', 
      latency: '4.2ms',
      dedupHash: '0x8f2a...c4e1',
      payload: { rider_id: 'usr_8921', driver_id: 'drv_3310', pickup_zone: 'SFO-Terminal 2', fare_estimate: 34.50, surge: 1.0 }
    },
    { 
      id: 'EVT-94280', 
      type: 'payment', 
      status: 'Success', 
      time: '10:59:58', 
      partition: 'P-01', 
      latency: '3.8ms',
      dedupHash: '0x3c71...9a0b',
      payload: { transaction_id: 'tx_991827', amount_cents: 4250, currency: 'USD', gateway: 'Stripe KRaft', idempotent: true }
    },
    { 
      id: 'EVT-94289', 
      type: 'user_login', 
      status: 'Success', 
      time: '10:59:47', 
      partition: 'P-03', 
      latency: '5.1ms',
      dedupHash: '0x1b4e...78fa',
      payload: { user_id: 'usr_4402', auth_provider: 'OAuth2/JWT', mfa_verified: true, client_ip: '198.51.100.42' }
    },
    { 
      id: 'EVT-94288', 
      type: 'ride_completed', 
      status: 'Failed', 
      time: '10:59:32', 
      partition: 'P-00 (DLQ)', 
      latency: '12.4ms',
      dedupHash: '0xde01...dead',
      payload: { error_reason: 'SchemaValidationError: Missing coordinate latitude', quarantine_topic: 'streamforge.dlq.v1', retry_count: 3 }
    },
    { 
      id: 'EVT-94287', 
      type: 'ride_started', 
      status: 'Success', 
      time: '10:59:15', 
      partition: 'P-02', 
      latency: '4.0ms',
      dedupHash: '0x55aa...1122',
      payload: { ride_id: 'rd_7721', start_time: '2026-11-14T10:59:15Z', vehicle_fleet_id: 'v_901' }
    },
    { 
      id: 'EVT-94286', 
      type: 'payment', 
      status: 'Success', 
      time: '10:58:54', 
      partition: 'P-01', 
      latency: '3.5ms',
      dedupHash: '0x77ee...4433',
      payload: { transaction_id: 'tx_991826', amount_cents: 1875, currency: 'USD', gateway: 'Stripe KRaft', idempotent: true }
    },
    { 
      id: 'EVT-94285', 
      type: 'ride_booked', 
      status: 'Success', 
      time: '10:58:31', 
      partition: 'P-03', 
      latency: '4.6ms',
      dedupHash: '0x99dd...7766',
      payload: { rider_id: 'usr_3110', driver_id: 'drv_1109', pickup_zone: 'JFK-T4', fare_estimate: 68.00, surge: 1.4 }
    },
    { 
      id: 'EVT-94284', 
      type: 'user_login', 
      status: 'Success', 
      time: '10:58:10', 
      partition: 'P-02', 
      latency: '4.9ms',
      dedupHash: '0x22bb...8899',
      payload: { user_id: 'usr_1092', auth_provider: 'OAuth2/JWT', mfa_verified: true, client_ip: '203.0.113.19' }
    }
  ])

  // Helper to generate realistic synthetic events
  const createSyntheticEvent = (forcedType?: string, forcedFailed?: boolean): StreamEvent => {
    const types = ['ride_booked', 'payment', 'ride_completed', 'user_login', 'ride_started']
    const type = forcedType || types[Math.floor(Math.random() * types.length)]
    const isFailed = forcedFailed !== undefined ? forcedFailed : Math.random() < 0.12
    const now = new Date()
    const timeStr = now.toTimeString().split(' ')[0]
    const idNum = Math.floor(10000 + Math.random() * 90000)
    const partitionNum = Math.floor(Math.random() * 4)

    let payload: Record<string, any> = {}
    if (isFailed) {
      payload = {
        error_reason: 'SchemaValidationError: Corrupted protobuf timestamp',
        quarantine_topic: 'streamforge.dlq.v1',
        retry_count: 3,
        isolated_at: now.toISOString()
      }
    } else if (type.includes('payment')) {
      payload = {
        transaction_id: `tx_${idNum}`,
        amount_cents: Math.floor(1200 + Math.random() * 8000),
        currency: 'USD',
        gateway: 'Stripe KRaft',
        idempotent: true
      }
    } else if (type.includes('login')) {
      payload = {
        user_id: `usr_${idNum}`,
        auth_provider: 'OAuth2/JWT',
        mfa_verified: true,
        client_ip: `198.51.100.${Math.floor(Math.random() * 250)}`
      }
    } else {
      payload = {
        ride_id: `rd_${idNum}`,
        rider_id: `usr_${Math.floor(1000 + Math.random() * 9000)}`,
        fare_usd: +(15 + Math.random() * 45).toFixed(2),
        surge_multiplier: +(1.0 + Math.random() * 0.8).toFixed(1)
      }
    }

    return {
      id: `EVT-${idNum}`,
      type,
      status: isFailed ? 'Failed' : 'Success',
      time: timeStr,
      partition: isFailed ? 'P-00 (DLQ)' : `P-0${partitionNum}`,
      latency: `${(3 + Math.random() * 5).toFixed(1)}ms`,
      dedupHash: `0x${Math.random().toString(16).substring(2, 6)}...${Math.random().toString(16).substring(2, 6)}`,
      payload
    }
  }

  // Handle manual injection of test event
  const handleInjectEvent = (asDLQ: boolean = false) => {
    const newEvt = createSyntheticEvent(asDLQ ? 'ride_completed' : undefined, asDLQ)
    setEvents((prev) => [newEvt, ...prev.slice(0, 11)])
  }

  // Copy Event ID to clipboard
  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(id)
    }
    setCopiedId(id)
    setTimeout(() => {
      setCopiedId(null)
    }, 2000)
  }

  // Real-time metrics tick
  useEffect(() => {
    if (isPaused) return
    const interval = setInterval(() => {
      setThroughput(Math.floor(12700 + Math.random() * 400))
      setActiveRides(Math.floor(2300 + Math.random() * 40))
      setAvgLatency(Math.floor(310 + Math.random() * 25))
    }, 2500)
    return () => clearInterval(interval)
  }, [isPaused])

  // WebSocket & Polling setup
  useEffect(() => {
    let isMounted = true
    let ws: WebSocket | null = null
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    const wsUrl = apiUrl.replace(/^http/, 'ws') + '/ws/events'

    try {
      ws = new WebSocket(wsUrl)
      ws.onopen = () => {
        if (isMounted) setConnectionMode('websocket')
      }
      ws.onmessage = (msgEvent) => {
        if (!isMounted || isPaused) return
        try {
          const data = JSON.parse(msgEvent.data)
          if (data && data.event_id) {
            const formatted: StreamEvent = {
              id: data.event_id,
              type: data.event_type.toLowerCase().replace('ride_', ''),
              status: data.status === 'Failed' ? 'Failed' : 'Success',
              time: new Date(data.occurred_at || Date.now()).toTimeString().split(' ')[0],
              partition: data.partition || 'P-01',
              latency: `${data.latency_ms || 4.2}ms`,
              payload: data.payload || data,
              dedupHash: data.dedup_hash || '0x4a12...8e01'
            }
            setEvents((prev) => [formatted, ...prev.slice(0, 11)])
          }
        } catch {
          // ignore
        }
      }
      ws.onerror = () => {
        if (isMounted) setConnectionMode('simulated')
      }
      ws.onclose = () => {
        if (isMounted) setConnectionMode('simulated')
      }
    } catch {
      // WS failover
    }

    const fallbackInterval = setInterval(async () => {
      if (!isMounted || isPaused) return
      if (ws && ws.readyState === WebSocket.OPEN) return

      try {
        const res = await fetch(`${apiUrl}/api/v1/events/recent?limit=8`, { signal: AbortSignal.timeout(1800) })
        if (res.ok) {
          const data = await res.json()
          if (isMounted && Array.isArray(data) && data.length > 0) {
            setEvents(data.map((item: any) => ({
              id: item.event_id,
              type: item.event_type.toLowerCase().replace('ride_', ''),
              status: item.status === 'Failed' ? 'Failed' : 'Success',
              time: new Date(item.occurred_at).toTimeString().split(' ')[0],
              partition: item.partition || 'P-01',
              latency: `${item.latency_ms || 4.2}ms`,
              payload: item.payload,
              dedupHash: item.dedup_hash || '0x9e12...33b1'
            })))
            setConnectionMode('rest')
            return
          }
        }
      } catch {
        // simulation
      }

      setConnectionMode('simulated')
      const newEvt = createSyntheticEvent()
      setEvents((prev) => [newEvt, ...prev.slice(0, 11)])
    }, 2800)

    return () => {
      isMounted = false
      if (ws) ws.close()
      clearInterval(fallbackInterval)
    }
  }, [isPaused])

  // Filtered events
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      let matchesCat = true
      if (filterCategory === 'ride') {
        matchesCat = evt.type.includes('ride')
      } else if (filterCategory === 'payment') {
        matchesCat = evt.type.includes('payment')
      } else if (filterCategory === 'login') {
        matchesCat = evt.type.includes('login')
      } else if (filterCategory === 'dlq') {
        matchesCat = evt.status === 'Failed' || evt.partition.includes('DLQ')
      }

      if (!matchesCat) return false
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      return (
        evt.id.toLowerCase().includes(q) ||
        evt.type.toLowerCase().includes(q) ||
        evt.partition.toLowerCase().includes(q) ||
        evt.status.toLowerCase().includes(q)
      )
    })
  }, [events, filterCategory, searchQuery])

  const counts = useMemo(() => {
    return {
      all: events.length,
      ride: events.filter(e => e.type.includes('ride')).length,
      payment: events.filter(e => e.type.includes('payment')).length,
      login: events.filter(e => e.type.includes('login')).length,
      dlq: events.filter(e => e.status === 'Failed' || e.partition.includes('DLQ')).length,
    }
  }, [events])

  return (
    <section id="product" className="w-full py-16 md:py-24 scroll-mt-12 bg-[#08080A] relative overflow-hidden">
      
      {/* Background Radial Amber Sunset Aura matching the uploaded screenshot */}
      <div 
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] sm:w-[900px] md:w-[1050px] h-[600px] sm:h-[750px] rounded-full blur-[140px] opacity-35 md:opacity-45"
        style={{
          background: 'radial-gradient(circle, rgba(234, 88, 12, 0.40) 0%, rgba(249, 115, 22, 0.18) 40%, rgba(8, 8, 10, 0) 75%)'
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Heading matching the screenshot */}
        <div className="text-left max-w-3xl mb-12 md:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#D4CEBF] text-[10.5px] font-bold tracking-widest uppercase mb-4 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            <span>DASHBOARD</span>
          </div>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-[#F5F3EF] tracking-tight leading-[1.08] mb-4">
            Real-time insights,<br />
            from live data.
          </h2>

          <p className="text-sm sm:text-base text-[#A39E93] leading-relaxed max-w-xl">
            A live analytics dashboard to monitor events, trends and key metrics as they happen.
          </p>
        </div>

        {/* ============================================================== */}
        {/* COMPACT CENTERPIECE: ZERO SIDE GAPS, PROPORTIONED CLUSTER     */}
        {/* ============================================================== */}
        <div className="relative w-full flex items-center justify-center my-6 md:my-10">
          
          <div className="relative flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-0 max-w-4xl mx-auto w-full">
            
            {/* LEFT COLUMN: 3 Large Metric Cards */}
            <div className="w-full lg:w-[210px] flex lg:flex-col items-center lg:items-end justify-center gap-3 z-20 shrink-0">
              
              {/* Card 1: Event Throughput */}
              <motion.div
                whileHover={{ scale: 1.03 }}
                onClick={() => setSelectedMetric('throughput')}
                className={`cursor-pointer w-full p-4 rounded-2xl border transition-all text-left ${
                  selectedMetric === 'throughput'
                    ? 'bg-[#181824] border-orange-500/60 shadow-[0_0_20px_rgba(234,88,12,0.25)] ring-1 ring-orange-500/30'
                    : 'bg-[#0E0E14]/90 hover:bg-[#14141E] border-white/[0.08] shadow-md'
                }`}
              >
                <div className="text-lg sm:text-xl font-bold font-mono text-white mb-0.5">
                  {throughput.toLocaleString()} <span className="text-xs font-normal text-[#A39E93]">/sec</span>
                </div>
                <div className="text-xs text-[#A39E93] font-medium">
                  Event Throughput
                </div>
              </motion.div>

              {/* Card 2: Active Rides */}
              <motion.div
                whileHover={{ scale: 1.03 }}
                onClick={() => setSelectedMetric('rides')}
                className={`cursor-pointer w-full p-4 rounded-2xl border transition-all text-left ${
                  selectedMetric === 'rides'
                    ? 'bg-[#181824] border-orange-500/60 shadow-[0_0_20px_rgba(234,88,12,0.25)] ring-1 ring-orange-500/30'
                    : 'bg-[#0E0E14]/90 hover:bg-[#14141E] border-white/[0.08] shadow-md'
                }`}
              >
                <div className="text-lg sm:text-xl font-bold font-mono text-white mb-0.5">
                  {activeRides.toLocaleString()}
                </div>
                <div className="text-xs text-[#A39E93] font-medium">
                  Active Rides
                </div>
              </motion.div>

              {/* Card 3: Avg. Latency */}
              <motion.div
                whileHover={{ scale: 1.03 }}
                onClick={() => setSelectedMetric('latency')}
                className={`cursor-pointer w-full p-4 rounded-2xl border transition-all text-left ${
                  selectedMetric === 'latency'
                    ? 'bg-[#181824] border-orange-500/60 shadow-[0_0_20px_rgba(234,88,12,0.25)] ring-1 ring-orange-500/30'
                    : 'bg-[#0E0E14]/90 hover:bg-[#14141E] border-white/[0.08] shadow-md'
                }`}
              >
                <div className="text-lg sm:text-xl font-bold font-mono text-white mb-0.5">
                  ~{avgLatency} <span className="text-xs font-normal text-[#A39E93]">ms</span>
                </div>
                <div className="text-xs text-[#A39E93] font-medium">
                  Avg. Latency
                </div>
              </motion.div>

            </div>

            {/* DEDICATED LEFT CONNECTOR BRIDGE (Seamless Dotted Tree, Zero Gap) */}
            <div className="hidden lg:flex items-center justify-center w-12 shrink-0 z-10 pointer-events-none">
              <svg className="w-12 h-44 overflow-visible" viewBox="0 0 48 180" fill="none">
                <path d="M 0 35 H 24 V 90 H 48" stroke="rgba(255, 255, 255, 0.20)" strokeWidth="1.5" strokeDasharray="3 3" />
                <path d="M 0 90 H 48" stroke="rgba(255, 255, 255, 0.20)" strokeWidth="1.5" strokeDasharray="3 3" />
                <path d="M 0 145 H 24 V 90 H 48" stroke="rgba(255, 255, 255, 0.20)" strokeWidth="1.5" strokeDasharray="3 3" />
                <motion.circle
                  r="3.5"
                  fill="#F97316"
                  animate={{ cx: [0, 48], cy: [90, 90], opacity: [0, 1, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                />
              </svg>
            </div>

            {/* CENTER COLUMN: Phone Glass Enclosure with 3 Live Notification Cards */}
            <div className="relative w-full max-w-[340px] sm:max-w-[360px] h-[520px] sm:h-[550px] rounded-[42px] bg-[#0E0E14]/90 backdrop-blur-2xl border border-white/[0.12] shadow-[0_30px_70px_rgba(0,0,0,0.9),0_0_40px_rgba(249,115,22,0.14)] p-4 sm:p-5 flex flex-col justify-between z-20 shrink-0">
              
              {/* Dynamic Island / Top Speaker Notch */}
              <div className="text-center pt-1 z-30">
                <div className="w-24 h-4 rounded-full bg-[#1A1A24] border border-white/10 mx-auto mb-2 flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-black/90 border border-white/20" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-xs font-bold text-white tracking-wide">
                  StreamForge
                </div>
                <div className="text-[10px] text-[#A39E93] font-mono">
                  Live Analytics
                </div>
              </div>

              {/* Central Guideline */}
              <div className="absolute top-20 bottom-16 left-1/2 -translate-x-1/2 w-0 border-l border-dashed border-white/10 pointer-events-none z-0" />

              {/* 3 FLOATING NOTIFICATION CARDS (Exact match to screenshot) */}
              <div className="relative flex-1 my-3 flex flex-col justify-around z-20">
                
                {/* Notification Card 1: StreamForge 10:24 */}
                <motion.div
                  animate={{ y: [-2, 2, -2] }}
                  transition={{ repeat: Infinity, duration: 5.2, ease: 'easeInOut' }}
                  whileHover={{ scale: 1.02 }}
                  className="relative w-full bg-[#181822]/95 backdrop-blur-xl rounded-2xl p-3.5 border border-white/[0.08] hover:border-orange-500/50 shadow-xl transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <StreamForgeHexagonLogo className="w-4 h-4" />
                      <span className="text-xs font-bold text-white">StreamForge</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#A39E93]">10:24</span>
                  </div>
                  <p className="text-xs text-[#D4CEBF] font-medium leading-relaxed">
                    Processing ride events in real time...
                  </p>
                </motion.div>

                {/* Notification Card 2: Pipeline 10:25 */}
                <motion.div
                  animate={{ y: [2, -2, 2] }}
                  transition={{ repeat: Infinity, duration: 5.8, ease: 'easeInOut', delay: 0.5 }}
                  whileHover={{ scale: 1.02 }}
                  className="relative w-full bg-[#181822]/95 backdrop-blur-xl rounded-2xl p-3.5 border border-white/[0.08] hover:border-orange-500/50 shadow-xl transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">Pipeline</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#A39E93]">10:25</span>
                  </div>
                  <p className="text-xs text-[#D4CEBF] font-medium leading-relaxed">
                    <span className="font-mono text-white font-bold">{throughput.toLocaleString()}</span> events/sec · <span className="font-mono text-white font-bold">{activeRides.toLocaleString()}</span> active rides
                  </p>
                </motion.div>

                {/* Notification Card 3: Analytics 10:26 */}
                <motion.div
                  animate={{ y: [-2, 2, -2] }}
                  transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut', delay: 1 }}
                  whileHover={{ scale: 1.02 }}
                  className="relative w-full bg-[#181822]/95 backdrop-blur-xl rounded-2xl p-3.5 border border-white/[0.08] hover:border-orange-500/50 shadow-xl transition-all"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <StreamForgeHexagonLogo className="w-4 h-4" />
                      <span className="text-xs font-bold text-white">Analytics</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#A39E93]">10:26</span>
                  </div>
                  <p className="text-xs text-[#D4CEBF] font-medium leading-relaxed">
                    Dashboard updated with latest insights.
                  </p>
                </motion.div>

              </div>

              {/* Bottom Phone Bar */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] z-30">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#D4CEBF]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>STREAMING SYNC</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">
                  99.99% Availability
                </span>
              </div>

            </div>

            {/* DEDICATED RIGHT CONNECTOR BRIDGE (Seamless Dotted Bridge, Zero Gap) */}
            <div className="hidden lg:flex items-center justify-center w-12 shrink-0 z-10 pointer-events-none">
              <svg className="w-12 h-28 overflow-visible" viewBox="0 0 48 80" fill="none">
                <path d="M 0 40 H 24 V 16 H 48" stroke="rgba(255, 255, 255, 0.20)" strokeWidth="1.5" strokeDasharray="3 3" />
                <path d="M 0 40 H 48" stroke="rgba(255, 255, 255, 0.20)" strokeWidth="1.5" strokeDasharray="3 3" />
                <motion.circle
                  r="3.5"
                  fill="#10B981"
                  animate={{ cx: [0, 48], cy: [40, 40], opacity: [0, 1, 0] }}
                  transition={{ duration: 1.8, delay: 0.9, repeat: Infinity, ease: 'easeInOut' }}
                />
              </svg>
            </div>

            {/* RIGHT COLUMN: 3 Pill Badges (Live, Events, Analytics) */}
            <div className="w-full lg:w-[190px] flex lg:flex-col items-center lg:items-start justify-center gap-3 z-20 shrink-0">
              
              {/* Badge 1: Live */}
              <div 
                onClick={() => setIsPaused(!isPaused)}
                className="cursor-pointer px-4 py-2 rounded-full bg-[#14141E] hover:bg-[#1A1A28] border border-white/10 flex items-center gap-2 transition-all shadow-md"
              >
                <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-emerald-400'} animate-pulse`} />
                <span className="text-xs font-bold text-white">
                  {isPaused ? 'Paused' : 'Live'}
                </span>
              </div>

              {/* Badges 2 & 3 in a row */}
              <div className="flex items-center gap-2">
                {/* Badge 2: Events */}
                <div className="cursor-pointer px-3.5 py-2 rounded-2xl bg-[#14141E] hover:bg-[#1A1A28] border border-white/10 flex items-center gap-2 transition-all shadow-md">
                  <BarChart2 className="w-3.5 h-3.5 text-white/80" />
                  <span className="text-xs font-semibold text-white">Events</span>
                </div>

                {/* Badge 3: Analytics */}
                <div 
                  onClick={onViewDashboard}
                  className="cursor-pointer px-3.5 py-2 rounded-2xl bg-[#14141E] hover:bg-[#1A1A28] border border-white/10 flex items-center gap-2 transition-all shadow-md group"
                >
                  <Layers className="w-3.5 h-3.5 text-white/80 group-hover:text-orange-400 transition-colors" />
                  <span className="text-xs font-semibold text-white">Analytics</span>
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* View Full Dashboard Modal CTA Button */}
        <div className="flex items-center justify-center my-8">
          <button
            onClick={onViewDashboard}
            className="px-6 py-2.5 rounded-full bg-white hover:bg-[#F3E8D6] text-[#08080A] font-bold text-xs uppercase flex items-center gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Open Interactive Dashboard Console</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#08080A]" />
          </button>
        </div>

        {/* ============================================================== */}
        {/* LIVE EVENT STREAM TICKER & PAYLOAD INSPECTION TABLE            */}
        {/* ============================================================== */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-[#0E0E12] rounded-3xl p-5 sm:p-7 border border-white/[0.08] shadow-2xl mt-10"
        >
          {/* Header Controls Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 mb-4 border-b border-white/[0.06] gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-orange-400">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-[#F5F3EF]">Live Event Stream Ticker</h3>
                  <span className="text-[10px] text-[#A39E93] font-mono">
                    {connectionMode === 'websocket' ? '(WebSocket Connected)' : connectionMode === 'rest' ? '(REST Polling Active)' : '(KRaft Stream Simulation)'}
                  </span>
                </div>
                <p className="text-[11px] text-[#A39E93]">Inspect partition routing, monotonic state, and dead-letter quarantine in real time.</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                  isPaused 
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25' 
                    : 'bg-white/[0.04] text-[#D4CEBF] border-white/10 hover:bg-white/[0.08]'
                }`}
              >
                {isPaused ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Pause className="w-3.5 h-3.5 text-orange-400" />}
                <span>{isPaused ? 'Paused' : 'Live Stream'}</span>
              </button>

              <button
                onClick={() => handleInjectEvent(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-orange-400 bg-white/[0.04] hover:bg-orange-500/15 border border-orange-500/30 flex items-center gap-1.5 transition-colors"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Emit Event</span>
              </button>

              <button
                onClick={() => handleInjectEvent(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-1.5 transition-colors"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Simulate DLQ</span>
              </button>
            </div>
          </div>

          {/* Filtering and Search Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <span className="text-[11px] text-[#A39E93] mr-1 flex items-center gap-1 shrink-0 font-medium">
                <Filter className="w-3 h-3 text-orange-400" /> Filter:
              </span>
              {[
                { key: 'all', label: 'All', count: counts.all },
                { key: 'ride', label: 'Rides', count: counts.ride },
                { key: 'payment', label: 'Payments', count: counts.payment },
                { key: 'login', label: 'Logins', count: counts.login },
                { key: 'dlq', label: 'DLQ / Failed', count: counts.dlq },
              ].map((tab) => {
                const isActive = filterCategory === tab.key
                return (
                  <button
                    key={tab.key}
                    onClick={() => setFilterCategory(tab.key as any)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all shrink-0 flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-white text-[#08080A] font-bold shadow-xs'
                        : 'bg-white/[0.03] text-[#A39E93] hover:text-[#F5F3EF] hover:bg-white/[0.07] border border-white/[0.04]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-[#08080A]/20 text-[#08080A]' : 'bg-white/[0.08] text-[#D4CEBF]'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-[#A39E93] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, partition, type..."
                className="w-full bg-[#14141A] border border-white/[0.08] focus:border-orange-500/50 rounded-lg pl-8 pr-7 py-1 text-xs text-[#F5F3EF] placeholder-[#71717A] outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#A39E93] hover:text-[#F5F3EF]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-[#A39E93] border-b border-white/[0.06]">
                  <th className="pb-2.5 font-mono text-[11px]">Event ID</th>
                  <th className="pb-2.5 text-[11px]">Type</th>
                  <th className="pb-2.5 text-[11px]">Partition</th>
                  <th className="pb-2.5 text-[11px]">Status</th>
                  <th className="pb-2.5 font-mono text-[11px]">Latency</th>
                  <th className="pb-2.5 font-mono text-[11px] text-right">Timestamp</th>
                  <th className="pb-2.5 text-[11px] text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-[#A39E93]">
                      No events match the selected filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((evt) => {
                    const isExpanded = expandedEventId === evt.id
                    const isCopied = copiedId === evt.id

                    return (
                      <React.Fragment key={evt.id}>
                        <tr 
                          onClick={() => setExpandedEventId(isExpanded ? null : evt.id)}
                          className={`text-[#D4CEBF] cursor-pointer transition-colors ${
                            isExpanded ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          <td className="py-2.5 font-mono text-orange-400">
                            <div className="inline-flex items-center gap-1.5 group">
                              <span className="font-semibold">{evt.id}</span>
                              <button
                                onClick={(e) => handleCopyId(evt.id, e)}
                                className="opacity-60 group-hover:opacity-100 hover:text-white p-0.5 rounded transition-opacity"
                              >
                                {isCopied ? (
                                  <span className="text-[10px] text-emerald-400 font-sans font-bold flex items-center gap-0.5">
                                    <Check className="w-3 h-3" /> Copied
                                  </span>
                                ) : (
                                  <Copy className="w-3 h-3 text-[#A39E93]" />
                                )}
                              </button>
                            </div>
                          </td>

                          <td className="py-2.5 font-medium text-white">
                            <span className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.05]">
                              {evt.type}
                            </span>
                          </td>

                          <td className="py-2.5 font-mono text-xs text-[#A39E93]">
                            <span className={evt.partition.includes('DLQ') ? 'text-rose-400 font-bold' : ''}>
                              {evt.partition}
                            </span>
                          </td>

                          <td className="py-2.5">
                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              evt.status === 'Success' 
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' 
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                            }`}>
                              {evt.status}
                            </span>
                          </td>

                          <td className="py-2.5 font-mono text-xs text-[#A39E93]">{evt.latency}</td>
                          <td className="py-2.5 font-mono text-xs text-[#A39E93] text-right">{evt.time}</td>

                          <td className="py-2.5 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedEventId(isExpanded ? null : evt.id)
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-orange-400 hover:text-white transition-colors bg-white/[0.03] hover:bg-white/[0.08] px-2 py-0.5 rounded border border-white/[0.06]"
                            >
                              <Code2 className="w-3 h-3" />
                              <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </td>
                        </tr>

                        {/* Collapsible Envelope Drawer */}
                        <AnimatePresence>
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="p-0 border-t-0">
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden bg-[#0A0A0D] p-3.5 sm:p-4 border border-orange-500/30 my-1 rounded-xl shadow-inner"
                                >
                                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/[0.06]">
                                    <div className="flex items-center gap-2">
                                      <Code2 className="w-3.5 h-3.5 text-orange-400" />
                                      <span className="text-[11px] font-mono font-bold text-[#F5F3EF]">
                                        Telemetry Envelope & Schema Validation
                                      </span>
                                      <span className="text-[10px] text-[#A39E93] font-mono">
                                        Fingerprint: {evt.dedupHash || '0x49e...1b'}
                                      </span>
                                    </div>
                                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                      {evt.status === 'Success' ? 'IDEMPOTENT WRITE CONFIRMED' : 'DEAD LETTER QUEUE QUARANTINED'}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <div>
                                      <div className="text-[10px] uppercase font-bold text-[#A39E93] mb-1">
                                        Parsed Envelope Payload (JSON)
                                      </div>
                                      <pre className="text-[11px] font-mono text-[#D4CEBF] bg-[#14141A] p-2.5 rounded-lg border border-white/[0.06] overflow-x-auto leading-relaxed">
                                        {JSON.stringify(evt.payload || {
                                          event_id: evt.id,
                                          event_type: evt.type,
                                          partition: evt.partition,
                                          recorded_at_utc: `${evt.time} UTC`,
                                          status: evt.status
                                        }, null, 2)}
                                      </pre>
                                    </div>

                                    <div className="flex flex-col justify-between text-xs space-y-2">
                                      <div className="bg-[#14141A] p-2.5 rounded-lg border border-white/[0.06] space-y-1.5">
                                        <div className="text-[10px] uppercase font-bold text-[#A39E93]">
                                          Streaming Guarantee Coordinates
                                        </div>
                                        <div className="flex items-center justify-between text-[11px]">
                                          <span className="text-[#A39E93]">Delivery Semantics:</span>
                                          <span className="font-mono text-[#F5F3EF]">At-least-once with DB Idempotency</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px]">
                                          <span className="text-[#A39E93]">Partition Sharding Key:</span>
                                          <span className="font-mono text-orange-400">murmur2(entity_id)</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px]">
                                          <span className="text-[#A39E93]">Deduplication Window:</span>
                                          <span className="font-mono text-[#F5F3EF]">60-minute sliding Redis/Postgres buffer</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px]">
                                          <span className="text-[#A39E93]">Processing Checkpoint:</span>
                                          <span className="font-mono text-emerald-400">Committed</span>
                                        </div>
                                      </div>

                                      <div className="text-[10px] text-[#A39E93] italic flex items-center justify-between">
                                        <span>Click "Inspect" to collapse view.</span>
                                        <button
                                          onClick={() => handleCopyId(JSON.stringify(evt.payload || evt, null, 2), { stopPropagation: () => {} } as any)}
                                          className="text-orange-400 hover:underline flex items-center gap-1 font-mono text-[10px]"
                                        >
                                          <Copy className="w-2.5 h-2.5" /> Copy Raw JSON
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              </td>
                            </tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>
    </section>
  )
}
