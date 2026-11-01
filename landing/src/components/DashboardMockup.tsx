import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Search, Bell, HelpCircle, LayoutDashboard, Compass, 
  GitBranch, ShieldCheck, AlertOctagon, BarChart2, 
  Sparkles, Settings, ArrowUpRight, ArrowDownRight,
  TrendingUp, Zap, CheckCircle2, AlertCircle, ChevronDown
} from 'lucide-react'

export const DashboardMockup: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [isSimulating] = useState(true)
  const [totalEvents, setTotalEvents] = useState(128400)
  const [processingRate, setProcessingRate] = useState(842)
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)

  // Simulation timer for realistic micro-updates
  useEffect(() => {
    if (!isSimulating) return
    const interval = setInterval(() => {
      setTotalEvents((prev) => prev + Math.floor(Math.random() * 6) + 2)
      setProcessingRate((prev) => {
        const delta = Math.floor(Math.random() * 7) - 3
        return Math.min(855, Math.max(830, prev + delta))
      })
    }, 2200)
    return () => clearInterval(interval)
  }, [isSimulating])

  // Chart coordinates precisely tuned to reference screenshot:
  // Starts ~14K, peaks at ~24K (10:15), dips to ~19K, peaks at ~32K (10:35), dips to ~26K, peaks at ~37K (10:50), ends at ~34K (11:00)
  const chartPoints = [
    { x: 25, y: 104, label: '10:00', val: '14.2K' },
    { x: 90, y: 76, label: '10:15', val: '24.1K' },
    { x: 165, y: 52, label: '10:30', val: '32.3K' },
    { x: 245, y: 40, label: '10:45', val: '37.0K' },
    { x: 310, y: 46, label: '11:00', val: '34.5K' },
  ]

  // Smooth SVG cubic bezier path matching reference peaks
  const pathD = "M 25,104 C 55,104 65,76 90,76 C 115,76 135,92 165,52 C 195,28 215,58 245,40 C 275,26 290,46 310,46"
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative group w-full"
    >
      {/* Outer ambient soft shadow behind card */}
      <div className="absolute -inset-2 bg-gradient-to-r from-orange-200/30 via-amber-100/40 to-orange-200/30 rounded-[32px] blur-2xl opacity-60 pointer-events-none -z-10" />

      {/* Main Container Card */}
      <div className="bg-white rounded-[26px] p-4 sm:p-5 shadow-[0_20px_50px_-15px_rgba(234,88,12,0.1),0_4px_16px_-4px_rgba(0,0,0,0.03)] border border-neutral-100/90 transition-all duration-300">
        
        {/* Mockup Header Navigation */}
        <div className="flex items-center justify-between pb-3.5 border-b border-neutral-100 gap-3">
          {/* Mini Logo */}
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-end gap-[2px] h-4">
              <span className="w-[2.5px] h-2.5 rounded-full bg-[#EA580C]" />
              <span className="w-[2.5px] h-3.5 rounded-full bg-[#EA580C]" />
              <span className="w-[2.5px] h-2 rounded-full bg-[#F97316]" />
              <span className="w-[2.5px] h-4 rounded-full bg-[#EA580C]" />
              <span className="w-[2.5px] h-2.5 rounded-full bg-[#FB923C]" />
            </div>
            <span className="text-[13px] font-bold text-neutral-900 tracking-tight">StreamForge</span>
          </div>

          {/* Search Bar matching screenshot */}
          <div className="flex-1 max-w-[280px] hidden sm:flex items-center gap-2 bg-neutral-50 border border-neutral-200/60 rounded-full px-3 py-1.5 text-neutral-400 text-xs">
            <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <span className="truncate text-[11px] text-neutral-400">Search events, pipelines, or metrics...</span>
          </div>

          {/* Action Icons & Avatar */}
          <div className="flex items-center gap-2 shrink-0">
            <button className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors">
              <Bell className="w-3.5 h-3.5" />
            </button>
            <button className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors">
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
            <div className="w-6 h-6 rounded-full overflow-hidden ring-1 ring-neutral-200 bg-neutral-100 shrink-0">
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
          
          {/* Left Sidebar: Roomy width so items never truncate */}
          <div className="w-full sm:w-[155px] lg:w-[165px] shrink-0 flex flex-col justify-between pr-0 sm:pr-2 border-b sm:border-b-0 sm:border-r border-neutral-100 pb-3 sm:pb-0">
            <div className="space-y-2.5">
              <div className="text-[9.5px] font-bold tracking-wider uppercase text-neutral-400 px-1.5">
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
                      className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left text-xs transition-all ${
                        isActive
                          ? 'bg-[#18181B] text-white font-medium shadow-2xs'
                          : 'text-neutral-600 hover:bg-neutral-100/70 hover:text-neutral-900'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-neutral-400'}`} />
                      <span className="text-[10.5px] whitespace-nowrap font-medium">{item.label}</span>
                    </button>
                  )
                })}
              </nav>

              <div className="pt-1">
                <div className="text-[9.5px] font-bold tracking-wider uppercase text-neutral-400 px-1.5 mb-1">
                  System
                </div>
                <button
                  onClick={() => setActiveTab('Settings')}
                  className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left text-xs text-neutral-600 hover:bg-neutral-100/70 transition-all ${
                    activeTab === 'Settings' ? 'bg-[#18181B] text-white' : ''
                  }`}
                >
                  <Settings className="w-3.5 h-3.5 text-neutral-400" />
                  <span className="text-[10.5px] whitespace-nowrap font-medium">Settings</span>
                </button>
              </div>
            </div>

            {/* User Profile Pill at Bottom of Sidebar */}
            <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center gap-2 px-1">
              <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-neutral-200 ring-1 ring-neutral-200">
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=80&h=80&q=80" 
                  alt="Shashwat B. Singh" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-neutral-800 truncate">Shashwat B. Singh</div>
                <div className="text-[8.5px] text-neutral-400 truncate">Data Engineer</div>
              </div>
            </div>
          </div>

          {/* Main Stage Content: Expansive flex-1 container */}
          <div className="flex-1 min-w-0 flex flex-col gap-2.5">
            
            {/* Header: Title + Live Status Pill */}
            <div className="flex items-center justify-between">
              <h4 className="text-xs sm:text-sm font-bold text-neutral-900">{activeTab}</h4>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </div>
            </div>

            {/* 4 Metric KPI Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
              
              {/* Card 1: Total Events */}
              <div className="bg-white rounded-xl p-2 sm:p-2.5 border border-neutral-100 shadow-[0_2px_6px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-3.5 h-3.5 rounded-full bg-orange-100/80 flex items-center justify-center text-[#EA580C]">
                    <TrendingUp className="w-2 h-2" />
                  </div>
                  <span className="text-[9.5px] font-medium text-neutral-500 whitespace-nowrap">Total Events</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-neutral-900 tracking-tight">
                  {(totalEvents / 1000).toFixed(1)}K
                </div>
                <div className="flex items-center gap-0.5 text-[8.5px] font-semibold text-emerald-600 mt-0.5">
                  <ArrowUpRight className="w-2.5 h-2.5" />
                  +12.6%
                </div>
              </div>

              {/* Card 2: Processing Rate */}
              <div className="bg-white rounded-xl p-2 sm:p-2.5 border border-neutral-100 shadow-[0_2px_6px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-3.5 h-3.5 rounded-full bg-amber-100/80 flex items-center justify-center text-amber-700">
                    <Zap className="w-2 h-2" />
                  </div>
                  <span className="text-[9.5px] font-medium text-neutral-500 whitespace-nowrap">Processing Rate</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-neutral-900 tracking-tight">
                  {processingRate} <span className="text-[9.5px] font-normal text-neutral-400">/s</span>
                </div>
                <div className="flex items-center gap-0.5 text-[8.5px] font-semibold text-emerald-600 mt-0.5">
                  <ArrowUpRight className="w-2.5 h-2.5" />
                  +18.3%
                </div>
              </div>

              {/* Card 3: Success Rate */}
              <div className="bg-white rounded-xl p-2 sm:p-2.5 border border-neutral-100 shadow-[0_2px_6px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-100/80 flex items-center justify-center text-emerald-700">
                    <CheckCircle2 className="w-2 h-2" />
                  </div>
                  <span className="text-[9.5px] font-medium text-neutral-500 whitespace-nowrap">Success Rate</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-neutral-900 tracking-tight">
                  98.7%
                </div>
                <div className="flex items-center gap-0.5 text-[8.5px] font-semibold text-emerald-600 mt-0.5">
                  <ArrowUpRight className="w-2.5 h-2.5" />
                  +0.9%
                </div>
              </div>

              {/* Card 4: Failed Events */}
              <div className="bg-white rounded-xl p-2 sm:p-2.5 border border-neutral-100 shadow-[0_2px_6px_rgba(0,0,0,0.02)]">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-3.5 h-3.5 rounded-full bg-rose-100/80 flex items-center justify-center text-rose-700">
                    <AlertCircle className="w-2 h-2" />
                  </div>
                  <span className="text-[9.5px] font-medium text-neutral-500 whitespace-nowrap">Failed Events</span>
                </div>
                <div className="text-xs sm:text-sm font-bold text-neutral-900 tracking-tight">
                  1.3%
                </div>
                <div className="flex items-center gap-0.5 text-[8.5px] font-semibold text-rose-500 mt-0.5">
                  <ArrowDownRight className="w-2.5 h-2.5" />
                  -0.9%
                </div>
              </div>

            </div>

            {/* Bottom Row: Area Chart Card & Donut Health Card */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mt-0.5">
              
              {/* Event Volume Chart (7.2 cols) */}
              <div className="sm:col-span-7 bg-white rounded-xl p-2.5 border border-neutral-100 shadow-[0_2px_6px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10.5px] font-bold text-neutral-800">Event Volume (Real-Time)</span>
                  <div className="flex items-center gap-1 text-[9.5px] text-neutral-500 bg-white px-2 py-0.5 rounded-full border border-neutral-200/70 shadow-2xs">
                    Last 1 Hour
                    <ChevronDown className="w-2.5 h-2.5 text-neutral-400" />
                  </div>
                </div>

                {/* SVG Area Chart */}
                <div className="relative w-full h-[115px] pt-1">
                  {/* Grid Y-ticks */}
                  <div className="absolute left-0 top-0 bottom-4 flex flex-col justify-between text-[7.5px] text-neutral-400 font-mono select-none">
                    <span>40K</span>
                    <span>30K</span>
                    <span>20K</span>
                    <span>10K</span>
                    <span>0</span>
                  </div>

                  {/* SVG Chart Graphic */}
                  <svg viewBox="0 0 320 145" className="w-full h-full pl-5 overflow-visible">
                    <defs>
                      <linearGradient id="eventOrangeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#FFA25B" stopOpacity="0.55" />
                        <stop offset="65%" stopColor="#FED7AA" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Area fill */}
                    <path
                      d={areaD}
                      fill="url(#eventOrangeGrad)"
                    />

                    {/* Glowing orange stroke line */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="#EA580C"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Interactive Points */}
                    {chartPoints.map((pt, i) => (
                      <g key={i}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={hoveredPoint === i ? 4.5 : 3}
                          fill="#FFFFFF"
                          stroke="#EA580C"
                          strokeWidth="2"
                          className="cursor-pointer transition-all duration-150"
                          onMouseEnter={() => setHoveredPoint(i)}
                          onMouseLeave={() => setHoveredPoint(null)}
                        />
                      </g>
                    ))}
                  </svg>

                  {/* Tooltip on Hover */}
                  {hoveredPoint !== null && (
                    <div 
                      className="absolute bg-neutral-900 text-white text-[9.5px] font-medium px-1.5 py-0.5 rounded shadow-lg -translate-x-1/2 pointer-events-none"
                      style={{
                        left: `${(chartPoints[hoveredPoint].x / 320) * 100}%`,
                        top: `${chartPoints[hoveredPoint].y - 22}px`,
                      }}
                    >
                      {chartPoints[hoveredPoint].val}
                    </div>
                  )}

                  {/* X Axis Ticks */}
                  <div className="flex justify-between pl-5 text-[7.5px] text-neutral-400 font-mono mt-0.5">
                    {chartPoints.map((pt) => (
                      <span key={pt.label}>{pt.label}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Pipeline Health Donut Card (4.8 cols) */}
              <div className="sm:col-span-5 bg-white rounded-xl p-2.5 border border-neutral-100 shadow-[0_2px_6px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                <span className="text-[10.5px] font-bold text-neutral-800 mb-1">Pipeline Health</span>

                <div className="flex items-center justify-around gap-1.5 my-auto">
                  {/* Circular SVG Donut Gauge matching screenshot */}
                  <div className="relative w-16 h-16 sm:w-18 sm:h-18 shrink-0 flex items-center justify-center">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                      {/* Background track */}
                      <circle
                        cx="18"
                        cy="18"
                        r="14.5"
                        fill="none"
                        stroke="#F3F4F6"
                        strokeWidth="3.5"
                      />
                      {/* Emerald Success Segment (98.7%) */}
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
                      {/* Red Failed Segment (1.3%) */}
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
                    {/* Centered Percentage */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                      <span className="text-[11px] font-extrabold text-neutral-900 leading-none">98.7%</span>
                      <span className="text-[7.5px] font-bold text-emerald-600 mt-0.5">Healthy</span>
                    </div>
                  </div>

                  {/* Status legend on the right matching screenshot */}
                  <div className="space-y-1 text-[9.5px]">
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-1.5 text-neutral-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>Running</span>
                      </div>
                      <span className="font-bold text-neutral-800">4</span>
                    </div>

                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-1.5 text-neutral-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span>Degraded</span>
                      </div>
                      <span className="font-bold text-neutral-800">0</span>
                    </div>

                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-1.5 text-neutral-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        <span>Failed</span>
                      </div>
                      <span className="font-bold text-neutral-800">1</span>
                    </div>
                  </div>
                </div>

                <div className="h-0.5" />
              </div>

            </div>

          </div>

        </div>

      </div>
    </motion.div>
  )
}
