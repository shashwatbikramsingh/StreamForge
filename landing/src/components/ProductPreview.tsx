import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowRight, Activity, Search, Copy, Check, 
  Pause, Play, PlusCircle, ChevronDown, ChevronUp, 
  Code2, Filter, AlertOctagon, X
} from 'lucide-react'
import { DashboardMockup } from './DashboardMockup'

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
      payload: { ride_id: 'rd_7721', start_time: '2026-11-13T10:59:15Z', vehicle_fleet_id: 'v_901' }
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

  // Helper to generate a realistic synthetic event
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

  // WebSocket & Polling setup
  useEffect(() => {
    let isMounted = true
    let ws: WebSocket | null = null
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    const wsUrl = apiUrl.replace(/^http/, 'ws') + '/ws/events'

    // 1. Attempt WebSocket connection
    try {
      ws = new WebSocket(wsUrl)
      ws.onopen = () => {
        if (isMounted) {
          setConnectionMode('websocket')
        }
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
          // ignore parse errors
        }
      }
      ws.onerror = () => {
        if (isMounted && connectionMode === 'websocket') {
          setConnectionMode('simulated')
        }
      }
      ws.onclose = () => {
        if (isMounted && connectionMode === 'websocket') {
          setConnectionMode('simulated')
        }
      }
    } catch {
      // WebSocket initialization failure
    }

    // 2. Fallback polling & local event generator loop
    const fallbackInterval = setInterval(async () => {
      if (!isMounted || isPaused) return
      if (ws && ws.readyState === WebSocket.OPEN) return // WebSocket is healthy

      // Try REST
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
        // Backend offline, fallback to simulation
      }

      // Pure client-side simulation fallback
      setConnectionMode('simulated')
      const newEvt = createSyntheticEvent()
      setEvents((prev) => [newEvt, ...prev.slice(0, 11)])
    }, 2800)

    return () => {
      isMounted = false
      if (ws) {
        ws.close()
      }
      clearInterval(fallbackInterval)
    }
  }, [isPaused])

  // Filtered events calculation
  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      // Category match
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

      // Search match
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

  // Counts for pills
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
    <section id="product" className="w-full py-12 md:py-20 scroll-mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#D4CEBF] text-[10px] font-bold tracking-widest uppercase mb-3.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E7D7BE]" />
            <span>PLATFORM TELEMETRY</span>
          </div>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#F5F3EF] tracking-tight mb-4">
            Explore the Platform
          </h2>

          <p className="text-sm sm:text-base text-[#A39E93] leading-relaxed max-w-2xl mx-auto mb-6">
            A powerful, real-time dashboard to monitor events, pipeline health, and business metrics across your streaming architecture.
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onViewDashboard}
              className="px-6 py-2.5 rounded-full bg-[#E7D7BE] hover:bg-[#F3E8D6] text-[#08080A] font-bold text-xs uppercase flex items-center gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              View Full Dashboard
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Dashboard Mockup Console */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="w-full mb-8"
        >
          <DashboardMockup />
        </motion.div>

        {/* Live Recent Events Stream Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-[#0E0E12] rounded-2xl p-5 sm:p-6 border border-white/[0.08] shadow-lg"
        >
          {/* Header Controls Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 mb-4 border-b border-white/[0.06] gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="w-7 h-7 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#E7D7BE]">
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
              {/* Stream state toggle button */}
              <button
                onClick={() => setIsPaused(!isPaused)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
                  isPaused 
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 hover:bg-amber-500/25' 
                    : 'bg-white/[0.04] text-[#D4CEBF] border-white/10 hover:bg-white/[0.08]'
                }`}
                title={isPaused ? "Resume live streaming" : "Pause stream for closer inspection"}
              >
                {isPaused ? <Play className="w-3.5 h-3.5 text-amber-400" /> : <Pause className="w-3.5 h-3.5 text-[#E7D7BE]" />}
                <span>{isPaused ? 'Paused' : 'Live Stream'}</span>
              </button>

              {/* Inject Test Event Button */}
              <button
                onClick={() => handleInjectEvent(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#E7D7BE] bg-white/[0.04] hover:bg-[#E7D7BE]/15 border border-[#E7D7BE]/30 flex items-center gap-1.5 transition-colors"
                title="Inject synthetic ride or payment event"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Emit Event</span>
              </button>

              {/* Inject DLQ event button */}
              <button
                onClick={() => handleInjectEvent(true)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-1.5 transition-colors"
                title="Inject malformed event to trigger DLQ isolation"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                <span>Simulate DLQ</span>
              </button>

              {/* Status Indicator Pill */}
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06] ml-auto lg:ml-0">
                <span className={`w-2 h-2 rounded-full ${
                  isPaused ? 'bg-amber-400' : connectionMode === 'websocket' ? 'bg-cyan-400' : connectionMode === 'rest' ? 'bg-emerald-400' : 'bg-[#E7D7BE]'
                } ${isPaused ? '' : 'animate-pulse'}`} />
                <span className="text-[10px] font-mono font-medium text-[#D4CEBF] uppercase">
                  {isPaused ? 'INSPECTION FROZEN' : connectionMode === 'websocket' ? 'WEBSOCKET FEED' : connectionMode === 'rest' ? 'FASTAPI REST' : 'INGESTION ACTIVE'}
                </span>
              </div>
            </div>
          </div>

          {/* Filtering and Search Controls Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <span className="text-[11px] text-[#A39E93] mr-1 flex items-center gap-1 shrink-0 font-medium">
                <Filter className="w-3 h-3 text-[#E7D7BE]" /> Filter:
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
                        ? 'bg-[#E7D7BE] text-[#08080A] font-bold shadow-xs'
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

            {/* Instant Search Bar */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-[#A39E93] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ID, partition, type..."
                className="w-full bg-[#14141A] border border-white/[0.08] focus:border-[#E7D7BE]/50 rounded-lg pl-8 pr-7 py-1 text-xs text-[#F5F3EF] placeholder-[#71717A] outline-none transition-colors"
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
                          <td className="py-2.5 font-mono text-[#E7D7BE]">
                            <div className="inline-flex items-center gap-1.5 group">
                              <span className="font-semibold">{evt.id}</span>
                              <button
                                onClick={(e) => handleCopyId(evt.id, e)}
                                className="opacity-60 group-hover:opacity-100 hover:text-white p-0.5 rounded transition-opacity"
                                title="Copy event ID"
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
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#E7D7BE] hover:text-white transition-colors bg-white/[0.03] hover:bg-white/[0.08] px-2 py-0.5 rounded border border-white/[0.06]"
                            >
                              <Code2 className="w-3 h-3" />
                              <span>{isExpanded ? 'Hide' : 'Inspect'}</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </td>
                        </tr>

                        {/* Expandable JSON Schema / Envelope inspection row */}
                        <AnimatePresence>
                          {isExpanded && (
                            <tr>
                              <td colSpan={7} className="p-0 border-t-0">
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden bg-[#0A0A0D] p-3.5 sm:p-4 border border-[#E7D7BE]/30 my-1 rounded-xl shadow-inner"
                                >
                                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/[0.06]">
                                    <div className="flex items-center gap-2">
                                      <Code2 className="w-3.5 h-3.5 text-[#E7D7BE]" />
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
                                          <span className="font-mono text-[#E7D7BE]">murmur2(entity_id)</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px]">
                                          <span className="text-[#A39E93]">Deduplication Window:</span>
                                          <span className="font-mono text-[#F5F3EF]">60-minute sliding Redis/Postgres buffer</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px]">
                                          <span className="text-[#A39E93]">Processing Checkpoint:</span>
                                          <span className="font-mono text-emerald-400">Committed (Offset #{Math.floor(100000 + Math.random() * 500000)})</span>
                                        </div>
                                      </div>

                                      <div className="text-[10px] text-[#A39E93] italic flex items-center justify-between">
                                        <span>Click "Inspect" or row again to collapse view.</span>
                                        <button
                                          onClick={() => handleCopyId(JSON.stringify(evt.payload || evt, null, 2), { stopPropagation: () => {} } as any)}
                                          className="text-[#E7D7BE] hover:underline flex items-center gap-1 font-mono text-[10px]"
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
