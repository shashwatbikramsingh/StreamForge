import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  TrendingUp, Zap, CheckCircle2, AlertCircle, 
  ArrowUpRight, ArrowDownRight, Search, Bell, 
  HelpCircle, ChevronDown, LayoutDashboard, 
  Compass, GitBranch, ShieldCheck, AlertOctagon, 
  BarChart2, Sparkles, Settings, RotateCcw, Server
} from 'lucide-react'

export const DashboardMockup: React.FC = () => {
  const [totalEvents, setTotalEvents] = useState(128420)
  const [processingRate, setProcessingRate] = useState(842)
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)
  const [timeWindow, setTimeWindow] = useState<'Last 1 Hour' | 'Last 24 Hours'>('Last 1 Hour')
  const [dlqResolved, setDlqResolved] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')

  // Live real-time stream simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setTotalEvents((prev) => prev + Math.floor(Math.random() * 8) + 1)
      setProcessingRate(Math.floor(830 + Math.random() * 25))
    }, 1400)
    return () => clearInterval(interval)
  }, [])

  const chartPoints = timeWindow === 'Last 1 Hour'
    ? [
        { x: 25, y: 104, label: '10:00', val: '18.4K' },
        { x: 90, y: 76, label: '10:15', val: '24.1K' },
        { x: 165, y: 52, label: '10:30', val: '32.3K' },
        { x: 245, y: 40, label: '10:45', val: '37.0K' },
        { x: 310, y: 46, label: '11:00', val: '34.5K' },
      ]
    : [
        { x: 25, y: 112, label: '00:00', val: '142K' },
        { x: 90, y: 88, label: '06:00', val: '295K' },
        { x: 165, y: 46, label: '12:00', val: '510K' },
        { x: 245, y: 34, label: '18:00', val: '640K' },
        { x: 310, y: 54, label: '23:59', val: '490K' },
      ]

  const pathD = timeWindow === 'Last 1 Hour'
    ? 'M 25,104 C 55,104 65,76 90,76 C 115,76 135,92 165,52 C 195,28 215,58 245,40 C 275,26 290,46 310,46'
    : 'M 25,112 C 55,112 65,88 90,88 C 115,88 135,72 165,46 C 195,22 215,48 245,34 C 275,20 290,54 310,54'
  const areaD = `${pathD} L 310,135 L 25,135 Z`

  const menuItems = [
    { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'Event Explorer', label: 'Event Explorer', icon: Compass },
    { id: 'Pipeline Monitor', label: 'Pipeline Monitor', icon: GitBranch },
    { id: 'Data Quality', label: 'Data Quality', icon: ShieldCheck },
    { id: 'Dead Letter Queue', label: 'Dead Letter Queue', icon: AlertOctagon },
    { id: 'Analytics & Reports', label: 'Analytics & Reports', icon: BarChart2 },
    { id: 'AI Insights', label: 'AI Insights', icon: Sparkles },
  ]

  const dlqItems = [
    {
      id: 'dlq-94821a',
      topic: 'ride-events [P-02:184920]',
      error: 'SchemaValidationError: Missing required field schema_version',
      payload: '{"event_id": "99f2c...", "event_type": "MALFORMED_CORRUPTED_EVENT"}',
    },
    {
      id: 'dlq-73109b',
      topic: 'ride-events [P-00:184889]',
      error: 'JSONDecodeError: Unterminated object payload at char 42',
      payload: '{"ride_id": "22a1b...", "fare_amount": null',
    },
  ]

  const pipelineNodes = [
    { name: 'Event Generator (Python)', lag: '0ms', rate: '850 evt/s', status: 'Healthy' },
    { name: 'Kafka Broker (KRaft)', lag: '4.8ms', rate: '850 evt/s', status: 'Healthy' },
    { name: 'Stream Validator & Spark', lag: '12.4ms', rate: '845 evt/s', status: 'Healthy' },
    { name: 'PostgreSQL 16 (Idempotent)', lag: '8.1ms', rate: '842 evt/s', status: 'Healthy' },
  ]

  const qualityRules = [
    { rule: 'UUIDv4 Event & Ride Identifiers', passRate: '100.0%', status: 'Enforced' },
    { rule: 'ISO-8601 UTC Three-Timestamp Ordering', passRate: '99.8%', status: 'Enforced' },
    { rule: 'ON CONFLICT (event_id) Deduplication', passRate: '100.0%', status: 'Active' },
    { rule: 'Monotonic Ride State Rank Guard (1→4)', passRate: '98.7%', status: 'Active' },
  ]

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative group w-full"
    >
      {/* Outer ambient dark glow */}
      <div className="absolute -inset-2 bg-gradient-to-r from-[#E7D7BE]/10 via-[#EA580C]/10 to-[#E7D7BE]/10 rounded-[32px] blur-2xl opacity-60 pointer-events-none -z-10" />

      {/* Main Container Card in Deep Obsidian Glass */}
      <div className="bg-[#0E0E12]/95 backdrop-blur-2xl rounded-[26px] p-4 sm:p-5 shadow-[0_24px_60px_-15px_rgba(0,0,0,0.85)] border border-white/[0.08] transition-all duration-300">
        
        {/* Mockup Header Navigation */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08] gap-3">
          {/* Mini Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="relative w-4 h-4 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full border border-[#E7D7BE]/50" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#E7D7BE]" />
            </div>
            <span className="text-[13px] font-bold text-[#F5F3EF] tracking-tight">StreamForge</span>
          </div>

          {/* Interactive Search Bar matching dark theme */}
          <div className="flex-1 max-w-[300px] hidden sm:flex items-center gap-2 bg-white/[0.03] border border-white/10 focus-within:border-[#E7D7BE]/50 rounded-full px-3 py-1.5 text-neutral-400 text-xs transition-colors">
            <Search className="w-3.5 h-3.5 text-[#A39E93] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events, pipelines, or metrics..."
              aria-label="Search telemetry dashboard"
              className="w-full bg-transparent text-[11px] text-[#F5F3EF] placeholder-[#7A756D] focus:outline-none"
            />
          </div>

          {/* Action Icons & Avatar */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              aria-label="Notifications"
              onClick={() => setActiveTab('Dead Letter Queue')}
              className="p-1 text-[#A39E93] hover:text-[#F5F3EF] transition-colors relative"
              title="Inspect DLQ alerts"
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-[#EA580C]" />
            </button>
            <button
              aria-label="Help"
              onClick={() => setActiveTab('Data Quality')}
              className="p-1 text-[#A39E93] hover:text-[#F5F3EF] transition-colors"
              title="View Data Quality Contracts"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
            <div className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-white/20 bg-neutral-800 shrink-0">
              <img 
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80" 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Mockup Body: Sidebar + Main Stage */}
        <div className="flex flex-col sm:flex-row gap-3 pt-3.5">
          
          {/* Left Sidebar */}
          <div className="w-full sm:w-[155px] lg:w-[165px] shrink-0 flex flex-col justify-between pr-0 sm:pr-2 border-b sm:border-b-0 sm:border-r border-white/[0.08] pb-3 sm:pb-0">
            <div className="space-y-2.5">
              <div className="text-[9px] font-bold tracking-widest uppercase text-[#7A756D] px-1.5">
                Main Menu
              </div>
              <nav className="space-y-0.5">
                {menuItems.map((item) => {
                  const Icon = item.icon
                  const isActive = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left text-xs transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#E7D7BE] text-[#08080A] font-bold shadow-xs'
                          : 'text-[#A39E93] hover:bg-white/[0.04] hover:text-[#F5F3EF]'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[#08080A]' : 'text-[#7A756D]'}`} />
                      <span className="text-[10.5px] whitespace-nowrap">{item.label}</span>
                    </button>
                  )
                })}
              </nav>

              <div className="pt-1">
                <div className="text-[9px] font-bold tracking-widest uppercase text-[#7A756D] px-1.5 mb-1">
                  System
                </div>
                <button
                  onClick={() => setActiveTab('Settings')}
                  className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left text-xs transition-all cursor-pointer ${
                    activeTab === 'Settings'
                      ? 'bg-[#E7D7BE] text-[#08080A] font-bold shadow-xs'
                      : 'text-[#A39E93] hover:bg-white/[0.04] hover:text-[#F5F3EF]'
                  }`}
                >
                  <Settings className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'Settings' ? 'text-[#08080A]' : 'text-[#7A756D]'}`} />
                  <span className="text-[10.5px] whitespace-nowrap">Settings</span>
                </button>
              </div>
            </div>

            {/* User Profile Pill at Bottom of Sidebar */}
            <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center gap-2 px-1">
              <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-neutral-800 ring-1 ring-white/20">
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80" 
                  alt="Shashwat B. Singh" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-[#F5F3EF] truncate">Shashwat B. Singh</div>
                <div className="text-[8.5px] text-[#A39E93] truncate">Data Engineer</div>
              </div>
            </div>
          </div>

          {/* Main Stage Content */}
          <div className="flex-1 min-w-0 flex flex-col gap-2.5">
            
            {/* Header: Title + Live Status Pill */}
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-bold text-[#F5F3EF]">{activeTab}</h4>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </div>
            </div>

            {/* 4 Metric KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
              <div className="bg-[#14141A] rounded-xl p-2 sm:p-2.5 border border-white/[0.06] shadow-sm">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-3.5 h-3.5 rounded-full bg-[#E7D7BE]/15 flex items-center justify-center text-[#E7D7BE]">
                    <TrendingUp className="w-2 h-2" />
                  </div>
                  <span className="text-[9.5px] font-medium text-[#A39E93] whitespace-nowrap">Total Events</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#F5F3EF] tracking-tight tabular-nums">
                  {(totalEvents / 1000).toFixed(1)}K
                </div>
                <div className="flex items-center gap-0.5 text-[8.5px] font-semibold text-emerald-400 mt-0.5">
                  <ArrowUpRight className="w-2.5 h-2.5" />
                  +12.6%
                </div>
              </div>

              <div className="bg-[#14141A] rounded-xl p-2 sm:p-2.5 border border-white/[0.06] shadow-sm">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-3.5 h-3.5 rounded-full bg-amber-500/15 flex items-center justify-center text-amber-400">
                    <Zap className="w-2 h-2" />
                  </div>
                  <span className="text-[9.5px] font-medium text-[#A39E93] whitespace-nowrap">Processing Rate</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#F5F3EF] tracking-tight tabular-nums">
                  {processingRate} <span className="text-[9.5px] font-normal text-[#A39E93]">/s</span>
                </div>
                <div className="flex items-center gap-0.5 text-[8.5px] font-semibold text-emerald-400 mt-0.5">
                  <ArrowUpRight className="w-2.5 h-2.5" />
                  +18.3%
                </div>
              </div>

              <div className="bg-[#14141A] rounded-xl p-2 sm:p-2.5 border border-white/[0.06] shadow-sm">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <CheckCircle2 className="w-2 h-2" />
                  </div>
                  <span className="text-[9.5px] font-medium text-[#A39E93] whitespace-nowrap">Success Rate</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#F5F3EF] tracking-tight tabular-nums">
                  98.7%
                </div>
                <div className="flex items-center gap-0.5 text-[8.5px] font-semibold text-emerald-400 mt-0.5">
                  <ArrowUpRight className="w-2.5 h-2.5" />
                  +0.9%
                </div>
              </div>

              <div className="bg-[#14141A] rounded-xl p-2 sm:p-2.5 border border-white/[0.06] shadow-sm">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-3.5 h-3.5 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-400">
                    <AlertCircle className="w-2 h-2" />
                  </div>
                  <span className="text-[9.5px] font-medium text-[#A39E93] whitespace-nowrap">Failed Events</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-[#F5F3EF] tracking-tight tabular-nums">
                  1.3%
                </div>
                <div className="flex items-center gap-0.5 text-[8.5px] font-semibold text-rose-400 mt-0.5">
                  <ArrowDownRight className="w-2.5 h-2.5" />
                  -0.9%
                </div>
              </div>
            </div>

            {/* Dynamic Tab Content */}
            {activeTab === 'Dead Letter Queue' ? (
              <div className="bg-[#14141A] rounded-xl p-3 border border-white/[0.06] space-y-2.5">
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="font-bold text-[#F5F3EF]">Quarantined Payloads (`dead_letter_queue`)</span>
                  <span className="text-rose-400 font-mono text-[9.5px]">2 Unresolved</span>
                </div>
                {dlqItems.map((item) => {
                  const isResolved = !!dlqResolved[item.id]
                  return (
                    <div key={item.id} className="p-2.5 rounded-lg bg-[#0E0E12] border border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 text-[10px]">
                          <span className="font-mono text-[#E7D7BE]">{item.id}</span>
                          <span className="text-[#7A756D]">•</span>
                          <span className="font-mono text-[#A39E93] truncate">{item.topic}</span>
                        </div>
                        <div className="text-[10px] text-rose-300 font-medium">{item.error}</div>
                        <code className="block text-[9px] text-[#7A756D] font-mono truncate">{item.payload}</code>
                      </div>
                      <button
                        onClick={() => setDlqResolved((prev) => ({ ...prev, [item.id]: true }))}
                        disabled={isResolved}
                        className={`shrink-0 px-2.5 py-1 rounded-full text-[9.5px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          isResolved
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 cursor-default'
                            : 'bg-[#E7D7BE] hover:bg-[#F3E8D6] text-[#08080A]'
                        }`}
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        {isResolved ? 'Requeued' : 'Replay Event'}
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : activeTab === 'Pipeline Monitor' ? (
              <div className="bg-[#14141A] rounded-xl p-3 border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between text-[10.5px] mb-1">
                  <span className="font-bold text-[#F5F3EF]">Active Cluster Topology (`KRAFT-PROD-01`)</span>
                  <span className="text-emerald-400 font-mono text-[9.5px]">4/4 Nodes Online</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {pipelineNodes.map((node) => (
                    <div key={node.name} className="p-2.5 rounded-lg bg-[#0E0E12] border border-white/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Server className="w-3.5 h-3.5 text-[#E7D7BE]" />
                        <div>
                          <div className="text-[10px] font-semibold text-[#F5F3EF]">{node.name}</div>
                          <div className="text-[9px] text-[#A39E93] font-mono">{node.rate}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[9.5px] font-mono text-emerald-400 block">{node.status}</span>
                        <span className="text-[8.5px] text-[#7A756D] font-mono">Lag: {node.lag}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : activeTab === 'Data Quality' ? (
              <div className="bg-[#14141A] rounded-xl p-3 border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between text-[10.5px] mb-1">
                  <span className="font-bold text-[#F5F3EF]">Active Data Contract Guardrails</span>
                  <span className="text-[#E7D7BE] font-mono text-[9.5px]">Schema v1</span>
                </div>
                <div className="space-y-1.5">
                  {qualityRules.map((item) => (
                    <div key={item.rule} className="px-2.5 py-2 rounded-lg bg-[#0E0E12] border border-white/[0.06] flex items-center justify-between text-[10px]">
                      <span className="text-[#D4CEBF] font-medium">{item.rule}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#E7D7BE]">{item.passRate}</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[8.5px] font-bold">
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Default Analytics View: Area Chart + Health Donut */
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mt-0.5">
                
                {/* Event Volume Chart (7 cols) */}
                <div className="sm:col-span-7 bg-[#14141A] rounded-xl p-2.5 border border-white/[0.06] shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10.5px] font-bold text-[#F5F3EF]">Event Volume (Real-Time)</span>
                    <button
                      onClick={() => setTimeWindow((w) => (w === 'Last 1 Hour' ? 'Last 24 Hours' : 'Last 1 Hour'))}
                      className="flex items-center gap-1 text-[9.5px] text-[#D4CEBF] hover:text-[#E7D7BE] bg-white/[0.04] hover:bg-white/[0.08] px-2 py-0.5 rounded-full border border-white/10 transition-colors cursor-pointer"
                    >
                      {timeWindow}
                      <ChevronDown className="w-2.5 h-2.5 text-[#7A756D]" />
                    </button>
                  </div>

                  {/* SVG Area Chart with glowing champagne gradient */}
                  <div className="relative w-full h-[115px] pt-1">
                    <div className="absolute left-0 top-0 bottom-4 flex flex-col justify-between text-[7.5px] text-[#7A756D] font-mono select-none">
                      <span>40K</span>
                      <span>30K</span>
                      <span>20K</span>
                      <span>10K</span>
                      <span>0</span>
                    </div>

                    <svg viewBox="0 0 320 145" className="w-full h-full pl-5 overflow-visible">
                      <defs>
                        <linearGradient id="eventGoldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#E7D7BE" stopOpacity="0.45" />
                          <stop offset="65%" stopColor="#EA580C" stopOpacity="0.15" />
                          <stop offset="100%" stopColor="#14141A" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      <path d={areaD} fill="url(#eventGoldGrad)" />

                      <path
                        d={pathD}
                        fill="none"
                        stroke="#E7D7BE"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {chartPoints.map((pt, i) => (
                        <g key={i}>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={hoveredPoint === i ? 4.5 : 3}
                            fill="#08080A"
                            stroke="#E7D7BE"
                            strokeWidth="2"
                            className="cursor-pointer transition-all duration-150"
                            onMouseEnter={() => setHoveredPoint(i)}
                            onMouseLeave={() => setHoveredPoint(null)}
                          />
                        </g>
                      ))}
                    </svg>

                    {hoveredPoint !== null && chartPoints[hoveredPoint] && (
                      <div 
                        className="absolute bg-[#08080A]/95 text-[#F5F3EF] px-2 py-1 rounded-md text-[9px] border border-white/20 shadow-lg pointer-events-none -translate-x-1/2 -translate-y-8"
                        style={{
                          left: `${(chartPoints[hoveredPoint].x / 320) * 100}%`,
                          top: `${(chartPoints[hoveredPoint].y / 145) * 100}%`
                        }}
                      >
                        <div className="font-bold">{chartPoints[hoveredPoint].val}</div>
                        <div className="text-[7.5px] text-[#A39E93]">{chartPoints[hoveredPoint].label}</div>
                      </div>
                    )}

                    <div className="flex justify-between pl-5 text-[7.5px] text-[#7A756D] font-mono mt-1 select-none">
                      {chartPoints.map((pt) => (
                        <span key={pt.label}>{pt.label}</span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Pipeline Health Donut (5 cols) */}
                <div className="sm:col-span-5 bg-[#14141A] rounded-xl p-2.5 border border-white/[0.06] shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10.5px] font-bold text-[#F5F3EF]">Pipeline Health</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 py-1">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 flex items-center justify-center">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="14.5" fill="none" stroke="#22222A" strokeWidth="3.5" />
                        <circle
                          cx="18"
                          cy="18"
                          r="14.5"
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="3.5"
                          strokeDasharray="89, 100"
                          strokeLinecap="round"
                        />
                        <circle
                          cx="18"
                          cy="18"
                          r="14.5"
                          fill="none"
                          stroke="#EF4444"
                          strokeWidth="3.5"
                          strokeDasharray="2, 100"
                          strokeDashoffset="-91"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-[11px] font-extrabold text-[#F5F3EF] leading-none">98.7%</span>
                        <span className="text-[7.5px] font-bold text-emerald-400 mt-0.5">Healthy</span>
                      </div>
                    </div>

                    <div className="space-y-1 text-[9.5px]">
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-1.5 text-[#A39E93]">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span>Running</span>
                        </div>
                        <span className="font-bold text-[#F5F3EF]">4</span>
                      </div>

                      <div className="flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-1.5 text-[#A39E93]">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                          <span>Degraded</span>
                        </div>
                        <span className="font-bold text-[#F5F3EF]">0</span>
                      </div>

                      <div className="flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-1.5 text-[#A39E93]">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                          <span>Failed</span>
                        </div>
                        <span className="font-bold text-[#F5F3EF]">1</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-white/[0.06] flex items-center justify-between text-[8.5px] text-[#7A756D]">
                    <span>KRaft Partition: 0</span>
                    <span className="text-[#E7D7BE]">Latency: 14ms</span>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>

      </div>
    </motion.div>
  )
}
