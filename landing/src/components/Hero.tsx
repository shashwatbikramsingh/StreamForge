import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpRight, Play, Pause, Zap, Activity } from 'lucide-react'
import { StreamForgeHexagonLogo, KafkaLogo, PostgresLogo, DockerLogo } from './SocialIcons'

interface HeroProps {
  onGetStartedClick: () => void
  onExploreClick: () => void
}

export const Hero: React.FC<HeroProps> = ({ onGetStartedClick, onExploreClick }) => {
  const [activeStage, setActiveStage] = useState<number>(0)
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true)
  const [eventRate, setEventRate] = useState<number>(12840)
  const [lastRideId, setLastRideId] = useState<number>(94281)
  const [pulseCount, setPulseCount] = useState<number>(0)
  const [activeTechHover, setActiveTechHover] = useState<string | null>(null)

  // Simulation interval for real-time throughput fluctuation and event wave
  useEffect(() => {
    if (!isLiveStreaming) return
    const interval = setInterval(() => {
      setEventRate(Math.floor(12600 + Math.random() * 600))
      setLastRideId((prev) => prev + Math.floor(1 + Math.random() * 4))
      setActiveStage((prev) => (prev + 1) % 4)
      setPulseCount((prev) => prev + 1)
    }, 2800)
    return () => clearInterval(interval)
  }, [isLiveStreaming])

  // Trigger manual simulated event wave
  const handleTriggerPulse = () => {
    setPulseCount((prev) => prev + 1)
    setActiveStage(0)
    setTimeout(() => setActiveStage(1), 700)
    setTimeout(() => setActiveStage(2), 1400)
    setTimeout(() => setActiveStage(3), 2100)
  }

  const timelineNodes = [
    { time: '09:30', label: 'Event Ingestion', stageIdx: 0, desc: 'Capture from edge drivers & riders' },
    { time: '09:32', label: 'Stream Processing', stageIdx: 1, desc: 'Spark 5m watermark & monotonic dedup' },
    { time: '09:35', label: 'Analytics Update', stageIdx: 2, desc: 'PostgreSQL ACID upsert & WS broadcast' },
  ]

  const techBadges = [
    { 
      name: 'Kafka', 
      icon: KafkaLogo, 
      spec: 'KRaft 4 Partitions', 
      tooltip: 'Single-node KRaft broker with per-ride Murmur2 ordering' 
    },
    { 
      name: 'PostgreSQL', 
      icon: PostgresLogo, 
      spec: 'Idempotent DB', 
      tooltip: 'ON CONFLICT DO NOTHING with daily table partitioning' 
    },
    { 
      name: 'Docker', 
      icon: DockerLogo, 
      spec: 'Compose Swarm', 
      tooltip: 'Automated 4-container production topology with health checks' 
    },
  ]

  return (
    <section className="relative w-full pt-10 pb-16 md:pt-16 md:pb-24 overflow-hidden bg-[#08080A]">
      
      {/* 1. Global Ambient Radial Amber Sunset Glow behind the device */}
      <div 
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/3 w-[650px] sm:w-[850px] md:w-[1050px] h-[550px] sm:h-[700px] md:h-[850px] rounded-full blur-[120px] opacity-40 md:opacity-55"
        style={{
          background: 'radial-gradient(circle, rgba(234, 88, 12, 0.35) 0%, rgba(249, 115, 22, 0.16) 35%, rgba(194, 65, 12, 0.06) 60%, rgba(8, 8, 10, 0) 80%)'
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 2. Editorial Centered Headline matching the uploaded image */}
        <div className="text-center max-w-3xl mx-auto mb-12 md:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="block text-[11px] sm:text-xs font-bold tracking-[0.22em] text-[#A39E93] uppercase mb-4">
              REAL-TIME DATA ENGINEERING PLATFORM
            </span>

            <h1 className="text-3xl sm:text-5xl md:text-[58px] font-extrabold text-[#F5F3EF] tracking-tight leading-[1.08] mb-6">
              Meet StreamForge,<br />
              your real-time data pipeline
            </h1>

            {/* CTA Buttons */}
            <div className="flex items-center justify-center gap-3.5 flex-wrap">
              <button
                onClick={onExploreClick}
                className="px-6 py-2.5 sm:px-7 sm:py-3 rounded-full bg-white hover:bg-[#F3E8D6] text-[#08080A] font-bold text-xs uppercase flex items-center gap-1.5 shadow-lg shadow-white/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Try Live Demo</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#08080A]" />
              </button>

              <button
                onClick={onGetStartedClick}
                className="px-6 py-2.5 sm:px-7 sm:py-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-[#F5F3EF] border border-white/15 font-semibold text-xs uppercase flex items-center gap-1.5 transition-all hover:border-white/30"
              >
                <span>Get Started</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#A39E93]" />
              </button>

              <a
                href="https://github.com/shashwatbikramsingh/StreamForge"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 sm:py-3 text-[#A39E93] hover:text-[#F5F3EF] font-semibold text-xs uppercase flex items-center gap-1.5 transition-all"
              >
                <span>GitHub</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </motion.div>
        </div>

        {/* 3. The Central Animated Interactive Device Showcase */}
        <div className="relative w-full flex items-center justify-center my-4 md:my-8">
          
          <div className="relative w-full max-w-[1100px] flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-4">
            
            {/* LEFT COLUMN: 3 Time Nodes (09:30, 09:32, 09:35) */}
            <div className="w-full lg:w-[240px] flex lg:flex-col items-center lg:items-end justify-center gap-3 sm:gap-4 z-20">
              {timelineNodes.map((node) => {
                const isCurrent = activeStage === node.stageIdx
                return (
                  <motion.div
                    key={node.time}
                    whileHover={{ scale: 1.03, x: 2 }}
                    onClick={() => setActiveStage(node.stageIdx)}
                    className={`cursor-pointer w-full max-w-[200px] p-3 sm:p-3.5 rounded-2xl border transition-all text-left ${
                      isCurrent
                        ? 'bg-[#181822] border-orange-500/60 shadow-[0_0_20px_rgba(234,88,12,0.25)] ring-1 ring-orange-500/30'
                        : 'bg-[#0E0E14]/80 hover:bg-[#14141E] border-white/[0.08] shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-white font-mono">
                        {node.time}
                      </span>
                      {isCurrent && (
                        <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                      )}
                    </div>
                    <span className="text-xs font-semibold text-[#D4CEBF] block">
                      {node.label}
                    </span>
                    <span className="text-[10px] text-[#A39E93] hidden sm:block mt-0.5 truncate">
                      {node.desc}
                    </span>
                  </motion.div>
                )
              })}
            </div>

            {/* SVG Interactive Connector Lines (Desktop visible) */}
            <div className="hidden lg:block absolute inset-0 pointer-events-none z-10">
              <svg className="w-full h-full" viewBox="0 0 1100 640" fill="none">
                {/* Connector from 09:30 node into Card 1 */}
                <path
                  d="M 230 190 H 320"
                  stroke="rgba(255, 255, 255, 0.16)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                {/* Connector from 09:32 node into Card 2 */}
                <path
                  d="M 230 320 H 300 V 270 H 340"
                  stroke="rgba(255, 255, 255, 0.16)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                {/* Connector from 09:35 node into Card 3 */}
                <path
                  d="M 230 440 H 320"
                  stroke="rgba(255, 255, 255, 0.16)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                {/* Animated traveling signal particle on connector */}
                <motion.circle
                  r="3.5"
                  fill="#F97316"
                  key={`pulse-left-${pulseCount}`}
                  animate={{
                    cx: [230, 320],
                    cy: [440, 440],
                    opacity: [0, 1, 0]
                  }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                />

                {/* Connector from Card 3/Phone right edge to Right Tech Stack */}
                <path
                  d="M 720 380 H 830"
                  stroke="rgba(255, 255, 255, 0.16)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
                <motion.circle
                  r="3.5"
                  fill="#F97316"
                  key={`pulse-right-${pulseCount}`}
                  animate={{
                    cx: [720, 830],
                    cy: [380, 380],
                    opacity: [0, 1, 0]
                  }}
                  transition={{ duration: 1.6, delay: 0.8, repeat: Infinity, ease: 'easeInOut' }}
                />
              </svg>
            </div>

            {/* CENTER COLUMN: Central Smartphone Phone Mockup Frame */}
            <div className="relative w-full max-w-[370px] sm:max-w-[400px] h-[580px] sm:h-[620px] rounded-[44px] sm:rounded-[48px] bg-[#0E0E14]/85 backdrop-blur-2xl border border-white/[0.12] shadow-[0_30px_70px_rgba(0,0,0,0.9),0_0_40px_rgba(249,115,22,0.14)] p-4 sm:p-5 flex flex-col justify-between z-20 overflow-visible">
              
              {/* Inner subtle specular sheen border */}
              <div className="absolute inset-0 rounded-[44px] sm:rounded-[48px] border border-white/5 pointer-events-none" />

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
                  Event Pipeline
                </div>
              </div>

              {/* Central Dotted Guideline Track */}
              <div className="absolute top-20 bottom-16 left-1/2 -translate-x-1/2 w-0 border-l border-dashed border-white/10 pointer-events-none z-0" />

              {/* 4 FLOATING NOTIFICATION EVENT CARDS (Matching the Screenshot Layout) */}
              <div className="relative flex-1 my-3 flex flex-col justify-around z-20">
                
                {/* Card 1: Top-Left inside phone */}
                <motion.div
                  animate={{ y: [-3, 3, -3] }}
                  transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
                  whileHover={{ scale: 1.04 }}
                  className={`relative sm:-left-6 w-[88%] sm:w-[84%] bg-[#181822]/90 backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 border transition-all shadow-xl ${
                    activeStage === 0
                      ? 'border-orange-500/70 shadow-[0_0_20px_rgba(234,88,12,0.3)] ring-1 ring-orange-500/30'
                      : 'border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <StreamForgeHexagonLogo className="w-4 h-4" />
                      <span className="text-xs font-bold text-white">StreamForge</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#A39E93]">10:24</span>
                  </div>
                  <p className="text-xs text-[#D4CEBF] font-medium leading-relaxed">
                    Ingesting ride event...
                  </p>
                  <div className="mt-1.5 pt-1.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-[#A39E93]">
                    <span>EVT-{lastRideId}</span>
                    <span className="text-orange-400">Partition P-02</span>
                  </div>
                </motion.div>

                {/* Card 2: Mid-Top-Right inside phone */}
                <motion.div
                  animate={{ y: [3, -3, 3] }}
                  transition={{ repeat: Infinity, duration: 5.5, ease: 'easeInOut', delay: 0.5 }}
                  whileHover={{ scale: 1.04 }}
                  className={`relative self-end sm:-right-6 w-[88%] sm:w-[84%] bg-[#181822]/90 backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 border transition-all shadow-xl ${
                    activeStage === 1
                      ? 'border-orange-500/70 shadow-[0_0_20px_rgba(234,88,12,0.3)] ring-1 ring-orange-500/30'
                      : 'border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center">
                        <Zap className="w-2.5 h-2.5" />
                      </div>
                      <span className="text-xs font-bold text-white">Pipeline</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#A39E93]">10:25</span>
                  </div>
                  <p className="text-xs text-[#D4CEBF] font-medium leading-relaxed">
                    Processing <span className="font-mono text-white font-bold">{eventRate.toLocaleString()}</span> events/sec.
                  </p>
                  <div className="mt-1.5 pt-1.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-[#A39E93]">
                    <span>Spark Micro-Batch</span>
                    <span className="text-emerald-400">0 Lag</span>
                  </div>
                </motion.div>

                {/* Card 3: Mid-Bottom-Left inside phone */}
                <motion.div
                  animate={{ y: [-3, 3, -3] }}
                  transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut', delay: 1 }}
                  whileHover={{ scale: 1.04 }}
                  className={`relative sm:-left-8 w-[92%] sm:w-[88%] bg-[#181822]/90 backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 border transition-all shadow-xl ${
                    activeStage === 2
                      ? 'border-orange-500/70 shadow-[0_0_20px_rgba(234,88,12,0.3)] ring-1 ring-orange-500/30'
                      : 'border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <StreamForgeHexagonLogo className="w-4 h-4" />
                      <span className="text-xs font-bold text-white">StreamForge</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#A39E93]">10:25</span>
                  </div>
                  <p className="text-xs text-[#D4CEBF] font-medium leading-relaxed">
                    Stored in PostgreSQL and updating live analytics.
                  </p>
                  <div className="mt-1.5 pt-1.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-[#A39E93]">
                    <span className="text-emerald-400">Idempotent (ON CONFLICT)</span>
                    <span>1.8ms Commit</span>
                  </div>
                </motion.div>

                {/* Card 4: Bottom-Right inside phone */}
                <motion.div
                  animate={{ y: [3, -3, 3] }}
                  transition={{ repeat: Infinity, duration: 5.2, ease: 'easeInOut', delay: 1.5 }}
                  whileHover={{ scale: 1.04 }}
                  className={`relative self-end sm:-right-4 w-[88%] sm:w-[84%] bg-[#181822]/90 backdrop-blur-xl rounded-2xl p-3 sm:p-3.5 border transition-all shadow-xl ${
                    activeStage === 3
                      ? 'border-orange-500/70 shadow-[0_0_20px_rgba(234,88,12,0.3)] ring-1 ring-orange-500/30'
                      : 'border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-md bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                        <Activity className="w-2.5 h-2.5" />
                      </div>
                      <span className="text-xs font-bold text-white">Analytics</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#A39E93]">10:26</span>
                  </div>
                  <p className="text-xs text-[#D4CEBF] font-medium leading-relaxed">
                    Dashboard refreshed in real time.
                  </p>
                  <div className="mt-1.5 pt-1.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-[#A39E93]">
                    <span>WebSocket Push</span>
                    <span className="text-emerald-400">60 FPS</span>
                  </div>
                </motion.div>

              </div>

              {/* Bottom Phone Bar with Streaming Pill Indicator */}
              <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] z-30">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#D4CEBF]">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>LIVE INGESTION</span>
                </div>
                <span className="text-[10px] font-mono text-orange-400">
                  {eventRate.toLocaleString()} evt/s
                </span>
              </div>

            </div>

            {/* RIGHT COLUMN: Tech Stack Badges (Kafka, PostgreSQL, Docker) */}
            <div className="w-full lg:w-[240px] flex lg:flex-col items-center lg:items-start justify-center gap-3 sm:gap-4 z-20">
              {techBadges.map((badge) => {
                const Icon = badge.icon
                const isHovered = activeTechHover === badge.name
                return (
                  <div key={badge.name} className="relative w-full max-w-[200px]">
                    <motion.div
                      whileHover={{ scale: 1.04, x: -2 }}
                      onMouseEnter={() => setActiveTechHover(badge.name)}
                      onMouseLeave={() => setActiveTechHover(null)}
                      className="cursor-pointer p-3 sm:p-3.5 rounded-2xl bg-[#0E0E14]/80 hover:bg-[#181822] border border-white/[0.08] hover:border-orange-500/40 shadow-md transition-all flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/10 text-orange-400 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs sm:text-sm font-bold text-white block">
                          {badge.name}
                        </span>
                        <span className="text-[10px] font-mono text-[#A39E93]">
                          {badge.spec}
                        </span>
                      </div>
                    </motion.div>

                    {/* Telemetry Tooltip on Hover */}
                    <AnimatePresence>
                      {isHovered && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className="absolute bottom-full left-0 mb-2 w-48 p-2.5 rounded-xl bg-[#14141E] border border-orange-500/30 shadow-xl text-[10px] text-[#D4CEBF] z-30"
                        >
                          <div className="font-bold text-white mb-0.5">{badge.name} Specification</div>
                          <p className="text-[#A39E93]">{badge.tooltip}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>

          </div>

        </div>

        {/* 4. Interactive Simulation Control Toolbar */}
        <div className="flex items-center justify-center gap-3 mt-8">
          <button
            onClick={() => setIsLiveStreaming(!isLiveStreaming)}
            className={`px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all border ${
              isLiveStreaming
                ? 'bg-orange-500/15 text-orange-300 border-orange-500/30 hover:bg-orange-500/25'
                : 'bg-white/[0.04] text-[#D4CEBF] border-white/10 hover:bg-white/[0.08]'
            }`}
          >
            {isLiveStreaming ? <Pause className="w-3.5 h-3.5 text-orange-400" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isLiveStreaming ? 'Pause Animation' : 'Resume Live Stream'}</span>
          </button>

          <button
            onClick={handleTriggerPulse}
            className="px-4 py-2 rounded-full text-xs font-semibold text-white bg-white/[0.04] hover:bg-white/[0.09] border border-white/15 flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
            title="Inject real-time event packet through the pipeline"
          >
            <Zap className="w-3.5 h-3.5 text-orange-400" />
            <span>Emit Test Packet</span>
          </button>
        </div>

        {/* 5. Section Heading Below Device (Matching the Uploaded Screenshot) */}
        <div className="text-center max-w-2xl mx-auto mt-20 pt-10 border-t border-white/[0.06]">
          <span className="block text-[10px] font-bold tracking-[0.2em] text-[#A39E93] uppercase mb-3">
            HOW IT WORKS
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#F5F3EF] tracking-tight mb-3">
            From events to insights, in real time.
          </h2>
          <p className="text-sm sm:text-base text-[#A39E93] leading-relaxed">
            A simple data pipeline to ingest, process, store and analyze live data.
          </p>
        </div>

      </div>
    </section>
  )
}
