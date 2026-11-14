import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Server, Bot, ArrowRight, Zap } from 'lucide-react'
import { StreamForgeHexagonLogo } from './SocialIcons'

interface SystemArchitectureProps {
  onViewArchitecture: () => void
}

export const SystemArchitecture: React.FC<SystemArchitectureProps> = ({ onViewArchitecture }) => {
  const [activeTab, setActiveTab] = useState<'price' | 'anomaly' | 'clickstream'>('price')
  const [selectedNode, setSelectedNode] = useState<string | null>('transform')
  const [signalTick, setSignalTick] = useState(0)

  // Continuous traveling packet animation tick
  useEffect(() => {
    const timer = setInterval(() => {
      setSignalTick((prev) => prev + 1)
    }, 2400)
    return () => clearInterval(timer)
  }, [])

  const tabConfig = {
    price: {
      name: 'PRICE RECOMMENDATION',
      sourceLabel: 'Ride & Fare Events',
      cdcLabel: 'Change data capture',
      aiUpLabel: 'Generate pricing vectors',
      aiDownLabel: 'Dynamic surge multipliers',
      webAppTitle: 'Driver Dispatch UI',
      webAppSubtitle: 'Updated in 3.2ms',
      dashMetric: '18.4K/s',
      dashLabel: 'Fare Adjustments',
      codeSnippet: `# Dynamic Pricing Pipeline (.py)
@pipeline.transformation
def calculate_surge_vector(event: RideEvent) -> EnrichedFare:
    historical_density = state_store.get(event.zone_id)
    ai_predicted_factor = ml_client.predict(historical_density)
    return EnrichedFare(
        ride_id=event.ride_id,
        base_fare=event.fare,
        surge_multiplier=max(1.0, ai_predicted_factor),
        timestamp_utc=event.occurred_at
    )`,
      telemetry: { throughput: '18,500 evt/s', latency: '2.8ms', guarantee: 'At-Least-Once' }
    },
    anomaly: {
      name: 'ANOMALY DETECTION',
      sourceLabel: 'Hardware Telemetry',
      cdcLabel: 'High-frequency pings',
      aiUpLabel: 'Extract vector embedding',
      aiDownLabel: 'Z-Score anomaly alert',
      webAppTitle: 'Security NOC Console',
      webAppSubtitle: '0 False Positives',
      dashMetric: '0.01%',
      dashLabel: 'Anomaly Rate',
      codeSnippet: `# Anomaly Detection Pipeline (.py)
@pipeline.transformation
def detect_telemetry_spike(event: SensorEvent) -> AnomalyVerdict:
    sliding_mean = state_store.rolling_mean(event.sensor_id, window="5m")
    z_score = abs(event.reading - sliding_mean) / state_store.std_dev(event.sensor_id)
    if z_score > 3.5:
        quarantine_queue.push(event, reason="Z-Score Threshold Exceeded")
    return AnomalyVerdict(sensor_id=event.sensor_id, is_clean=(z_score <= 3.5))`,
      telemetry: { throughput: '45,000 evt/s', latency: '1.4ms', guarantee: 'DLQ Quarantine' }
    },
    clickstream: {
      name: 'CLICKSTREAM DASHBOARD',
      sourceLabel: 'Web & App Events',
      cdcLabel: 'Kafka event stream',
      aiUpLabel: 'Session intent scoring',
      aiDownLabel: 'Cohort attribution',
      webAppTitle: 'User Experience App',
      webAppSubtitle: 'Real-time sync',
      dashMetric: '42.8K/s',
      dashLabel: 'Live Page Views',
      codeSnippet: `# Clickstream Attribution Pipeline (.py)
@pipeline.transformation
def aggregate_user_session(event: ClickEvent) -> SessionState:
    session = session_store.get_or_create(event.session_id)
    session.append_step(event.action_type)
    session.recalculate_funnel_progress()
    return session_store.commit(session)`,
      telemetry: { throughput: '32,000 evt/s', latency: '3.1ms', guarantee: 'Idempotent DB' }
    }
  }

  const currentTab = tabConfig[activeTab]

  return (
    <section id="architecture" className="w-full py-16 md:py-24 scroll-mt-12 bg-[#08080A] relative overflow-hidden">
      
      {/* Upper-Right Warm Ambient Flare matching the reference image */}
      <div 
        className="pointer-events-none absolute -top-24 -right-24 w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] rounded-full blur-[130px] opacity-40 md:opacity-55"
        style={{
          background: 'radial-gradient(circle, rgba(234, 88, 12, 0.45) 0%, rgba(249, 115, 22, 0.20) 40%, rgba(8, 8, 10, 0) 75%)'
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header matching the reference screenshot */}
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 mb-3.5 group cursor-default">
            <StreamForgeHexagonLogo className="w-6 h-6" />
            <span className="text-lg font-bold tracking-tight text-white font-sans">
              StreamForge
            </span>
          </div>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-[#F5F3EF] tracking-tight leading-[1.08] mb-4">
            Python-based<br />
            data streaming pipelines
          </h2>

          <p className="text-sm sm:text-base text-[#A39E93] leading-relaxed max-w-2xl mx-auto">
            Design, transform, and evaluate real-time data flows with native Python logic, AI inference bridges, and sub-5ms operational sink connectors.
          </p>
        </div>

        {/* The Wide Interactive Pipeline Studio Canvas */}
        <div className="relative w-full rounded-3xl bg-[#0B0B12]/90 backdrop-blur-2xl border border-white/[0.12] shadow-[0_25px_70px_rgba(0,0,0,0.8),0_0_50px_rgba(249,115,22,0.12)] p-4 sm:p-6 md:p-8 overflow-hidden">
          
          {/* Subtle inner grid texture */}
          <div 
            className="absolute inset-0 opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '24px 24px'
            }}
          />

          {/* Top Scenario Tabs Bar */}
          <div className="flex items-center gap-6 sm:gap-8 pb-4 mb-6 md:mb-8 border-b border-white/[0.08] overflow-x-auto scrollbar-none relative z-10">
            {[
              { id: 'price', label: 'PRICE RECOMMENDATION' },
              { id: 'anomaly', label: 'ANOMALY DETECTION' },
              { id: 'clickstream', label: 'CLICKSTREAM DASHBOARD' },
            ].map((tab) => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative pb-2 text-[11px] sm:text-xs font-bold tracking-wider uppercase transition-colors shrink-0 ${
                    isActive ? 'text-white' : 'text-[#71717A] hover:text-[#D4CEBF]'
                  }`}
                >
                  <span>{tab.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeStudioTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-400 to-amber-300 shadow-[0_0_12px_rgba(249,115,22,0.8)]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              )
            })}
          </div>

          {/* Topology Interactive Studio Diagram */}
          <div className="relative w-full min-h-[420px] md:min-h-[460px] flex items-center justify-between overflow-x-auto pb-4 scrollbar-none">
            <div className="relative min-w-[920px] w-full flex items-center justify-between gap-4 py-6">

              {/* 1. LEFT SOURCE NODE (Debezium / Kafka Ingestion) */}
              <div 
                onClick={() => setSelectedNode('source')}
                className={`w-[170px] shrink-0 p-4 rounded-2xl border transition-all cursor-pointer ${
                  selectedNode === 'source'
                    ? 'bg-[#14141E] border-orange-500/60 shadow-[0_0_20px_rgba(234,88,12,0.2)]'
                    : 'bg-[#0E0E14]/80 hover:bg-[#14141A] border-white/[0.08]'
                }`}
              >
                {/* Server drive representation with LED grid */}
                <div className="h-20 w-full rounded-xl bg-[#08080C] border border-white/[0.06] p-2.5 flex flex-col justify-between mb-3 relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <Server className="w-4 h-4 text-orange-400" />
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  {/* Subtle drive LED lines */}
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-orange-400"
                        animate={{ width: ['20%', '80%', '40%'] }}
                        transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                      />
                    </div>
                    <div className="h-1.5 w-3/4 bg-white/[0.06] rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-cyan-400"
                        animate={{ width: ['40%', '90%', '60%'] }}
                        transition={{ repeat: Infinity, duration: 2.8, ease: 'easeInOut' }}
                      />
                    </div>
                  </div>
                </div>

                <div className="text-xs font-bold text-white mb-0.5">
                  Debezium CDC
                </div>
                <div className="text-[10px] text-[#A39E93] font-mono">
                  {currentTab.sourceLabel}
                </div>
              </div>

              {/* Dotted Connecting Wire: Change Data Capture */}
              <div className="relative flex-1 flex flex-col items-center justify-center px-1">
                <span className="text-[10px] font-mono text-[#A39E93] mb-1 truncate">
                  {currentTab.cdcLabel}
                </span>
                <div className="w-full relative flex items-center">
                  <div className="w-full border-t border-dashed border-white/20" />
                  {/* Animated Traveling Packet */}
                  <motion.div 
                    key={`signal-cdc-${signalTick}`}
                    className="absolute w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_8px_#F97316]"
                    animate={{ left: ['0%', '100%'], opacity: [0, 1, 0] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              </div>

              {/* 2. CENTER STREAMFORGE ENCLOSURE */}
              <div className="relative w-[480px] shrink-0 rounded-3xl bg-[#0F0F18]/90 border border-white/[0.12] p-5 shadow-2xl">
                
                {/* Top OpenAI / AI Inference Bridge Node */}
                <div className="flex justify-center -mt-10 mb-4">
                  <div 
                    onClick={() => setSelectedNode('ai')}
                    className={`cursor-pointer px-4 py-2 rounded-2xl border transition-all flex items-center gap-2 shadow-lg ${
                      selectedNode === 'ai'
                        ? 'bg-[#1A1A28] border-orange-500/60 ring-1 ring-orange-500/30'
                        : 'bg-[#12121C] hover:bg-[#181824] border-white/10'
                    }`}
                  >
                    <Bot className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white">AI Inference Engine</span>
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                      GPT-4 / ML
                    </span>
                  </div>
                </div>

                {/* Bidirectional Telemetry Arrows to AI */}
                <div className="grid grid-cols-2 gap-2 text-[9.5px] font-mono text-[#A39E93] text-center mb-3">
                  <div className="flex items-center justify-center gap-1">
                    <span>↑ {currentTab.aiUpLabel}</span>
                  </div>
                  <div className="flex items-center justify-center gap-1 text-orange-400">
                    <span>↓ {currentTab.aiDownLabel}</span>
                  </div>
                </div>

                {/* 3 Inline Pipeline Nodes inside StreamForge */}
                <div className="flex items-center justify-between gap-3">
                  
                  {/* Node A: Integration Sources */}
                  <div 
                    onClick={() => setSelectedNode('sources')}
                    className={`flex-1 p-3 rounded-xl border text-center cursor-pointer transition-all ${
                      selectedNode === 'sources'
                        ? 'bg-[#181824] border-orange-500/50'
                        : 'bg-[#09090E] border-white/[0.06] hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="text-[11px] font-semibold text-white block">
                      Integration
                    </span>
                    <span className="text-[9px] text-[#A39E93] font-mono">
                      sources
                    </span>
                  </div>

                  {/* Wire */}
                  <div className="w-6 border-t border-dashed border-white/20 shrink-0" />

                  {/* Node B: Central Python Data Transformation (.py) with Floating Shapes */}
                  <div 
                    onClick={() => setSelectedNode('transform')}
                    className={`relative w-[190px] p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      selectedNode === 'transform'
                        ? 'bg-[#141420] border-orange-500/70 shadow-[0_0_25px_rgba(234,88,12,0.3)] ring-1 ring-orange-500/30'
                        : 'bg-[#08080D] border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Python .py badge */}
                    <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-[#1A1A28] border border-orange-500/40 text-[9px] font-mono font-bold text-orange-400">
                      .py
                    </span>

                    {/* Interactive Animated Transformation Sandbox with Floating Shapes */}
                    <div className="h-16 w-full rounded-xl bg-[#040408] border border-white/[0.05] relative overflow-hidden flex items-center justify-around p-2 mb-2">
                      {/* Floating Orange Sphere 1 */}
                      <motion.div
                        className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-orange-600 to-amber-400 shadow-[0_0_8px_#F97316]"
                        animate={{ y: [-4, 4, -4], x: [-2, 2, -2] }}
                        transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
                      />
                      {/* Floating Gray Geometry 2 */}
                      <motion.div
                        className="w-4 h-3 rounded-md bg-white/20 border border-white/30"
                        animate={{ rotate: [0, 90, 180, 270, 360], y: [3, -3, 3] }}
                        transition={{ repeat: Infinity, duration: 6, ease: 'linear' }}
                      />
                      {/* Floating Orange Sphere 3 */}
                      <motion.div
                        className="w-4 h-4 rounded-full bg-orange-500 shadow-[0_0_10px_#EA580C]"
                        animate={{ y: [4, -4, 4], x: [2, -2, 2] }}
                        transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 0.5 }}
                      />
                      {/* Floating Hexagon 4 */}
                      <motion.div
                        className="w-3.5 h-3.5 rounded-xs bg-white/10 border border-white/20"
                        animate={{ scale: [1, 1.2, 1], rotate: [0, -45, 0] }}
                        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                      />
                    </div>

                    <div className="text-center">
                      <span className="text-[11px] font-bold text-white block">
                        Data transformation
                      </span>
                      <span className="text-[9px] text-[#A39E93] font-mono">
                        Native Python 3.11
                      </span>
                    </div>
                  </div>

                  {/* Wire */}
                  <div className="w-6 border-t border-dashed border-white/20 shrink-0" />

                  {/* Node C: Sink Connector */}
                  <div 
                    onClick={() => setSelectedNode('sink')}
                    className={`flex-1 p-3 rounded-xl border text-center cursor-pointer transition-all ${
                      selectedNode === 'sink'
                        ? 'bg-[#181824] border-orange-500/50'
                        : 'bg-[#09090E] border-white/[0.06] hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="text-[11px] font-semibold text-white block">
                      Sink
                    </span>
                    <span className="text-[9px] text-[#A39E93] font-mono">
                      connector
                    </span>
                  </div>

                </div>

                {/* Bottom Bar inside StreamForge container */}
                <div className="flex items-center justify-between pt-3 mt-3 border-t border-white/[0.06]">
                  <div className="flex items-center gap-1.5 text-xs text-[#D4CEBF] font-semibold">
                    <StreamForgeHexagonLogo className="w-4 h-4" />
                    <span>StreamForge Engine</span>
                  </div>
                  <button 
                    onClick={onViewArchitecture}
                    className="text-xs text-orange-400 hover:text-white flex items-center gap-1 font-semibold transition-colors"
                  >
                    <span>Read more</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>

              </div>

              {/* Dotted Branching Wires to Web App & Dashboard */}
              <div className="relative flex-1 flex flex-col items-center justify-center px-1">
                <span className="text-[10px] font-mono text-[#A39E93] mb-1">
                  Notify / Stream
                </span>
                <div className="w-full relative flex items-center">
                  <div className="w-full border-t border-dashed border-white/20" />
                  <motion.div 
                    key={`signal-sink-${signalTick}`}
                    className="absolute w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#06B6D4]"
                    animate={{ left: ['0%', '100%'], opacity: [0, 1, 0] }}
                    transition={{ duration: 1.6, delay: 0.6, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
              </div>

              {/* 3. RIGHT DELIVERY NODES (Web App & Analytics Dashboard) */}
              <div className="w-[180px] shrink-0 space-y-3">
                
                {/* Branch 1: Web App Console */}
                <div 
                  onClick={() => setSelectedNode('webapp')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    selectedNode === 'webapp'
                      ? 'bg-[#14141E] border-orange-500/60 shadow-[0_0_15px_rgba(234,88,12,0.2)]'
                      : 'bg-[#0E0E14]/80 hover:bg-[#14141A] border-white/[0.08]'
                  }`}
                >
                  <div className="h-14 w-full rounded-xl bg-[#08080C] border border-white/[0.06] p-2 flex flex-col justify-between mb-2">
                    <div className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>
                    <span className="font-mono text-[9px] text-[#A39E93]">
                      &gt; emit_ws(event)
                    </span>
                  </div>
                  <span className="text-xs font-bold text-white block">
                    {currentTab.webAppTitle}
                  </span>
                  <span className="text-[10px] text-[#A39E93] font-mono">
                    {currentTab.webAppSubtitle}
                  </span>
                </div>

                {/* Branch 2: Analytics Dashboard */}
                <div 
                  onClick={() => setSelectedNode('dash')}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                    selectedNode === 'dash'
                      ? 'bg-[#14141E] border-orange-500/60 shadow-[0_0_15px_rgba(234,88,12,0.2)]'
                      : 'bg-[#0E0E14]/80 hover:bg-[#14141A] border-white/[0.08]'
                  }`}
                >
                  <div className="h-14 w-full rounded-xl bg-[#08080C] border border-white/[0.06] p-2 flex items-center justify-between mb-2">
                    <div>
                      <span className="text-[9px] text-[#A39E93] font-mono block">Throughput</span>
                      <span className="text-xs font-bold font-mono text-white">{currentTab.dashMetric}</span>
                    </div>
                    <div className="w-7 h-7 rounded-full border-2 border-orange-400 border-t-transparent animate-spin" />
                  </div>
                  <span className="text-xs font-bold text-white block">
                    Dashboard
                  </span>
                  <span className="text-[10px] text-[#A39E93] font-mono">
                    {currentTab.dashLabel}
                  </span>
                </div>

              </div>

            </div>
          </div>

          {/* Interactive Inspection Drawer for the Selected Node */}
          <div className="mt-6 pt-5 border-t border-white/[0.08] relative z-10">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    Live Pipeline Contract: {currentTab.name}
                  </h4>
                  <span className="text-[10px] font-mono text-[#A39E93]">
                    Latency: {currentTab.telemetry.latency} • Peak: {currentTab.telemetry.throughput} • Semantics: {currentTab.telemetry.guarantee}
                  </span>
                </div>
              </div>

              <button
                onClick={onViewArchitecture}
                className="px-4 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/15 text-xs font-semibold text-white flex items-center gap-1.5 transition-all"
              >
                <span>View Full Architecture Modal</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Syntax Highlighted Python Transformation Snippet */}
            <pre className="text-xs font-mono text-[#D4CEBF] bg-[#07070B] p-4 rounded-xl border border-white/[0.06] overflow-x-auto leading-relaxed">
              {currentTab.codeSnippet}
            </pre>
          </div>

        </div>

      </div>
    </section>
  )
}
