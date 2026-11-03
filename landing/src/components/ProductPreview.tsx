import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Activity } from 'lucide-react'
import { DashboardMockup } from './DashboardMockup'

interface ProductPreviewProps {
  onViewDashboard: () => void
}

export const ProductPreview: React.FC<ProductPreviewProps> = ({ onViewDashboard }) => {
  const [events, setEvents] = useState([
    { id: 'EVT-94281', type: 'ride_booked', status: 'Success', time: '11:00:24', partition: 'P-02', latency: '4.2ms' },
    { id: 'EVT-94280', type: 'payment', status: 'Success', time: '10:59:58', partition: 'P-01', latency: '3.8ms' },
    { id: 'EVT-94289', type: 'user_login', status: 'Success', time: '10:59:47', partition: 'P-03', latency: '5.1ms' },
    { id: 'EVT-94288', type: 'ride_completed', status: 'Failed', time: '10:59:32', partition: 'P-00 (DLQ)', latency: '12.4ms' },
  ])

  // Live event ticker simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const types = ['ride_booked', 'payment', 'ride_completed', 'user_login']
      const randomType = types[Math.floor(Math.random() * types.length)]
      const isFailed = Math.random() < 0.12
      const now = new Date()
      const timeStr = now.toTimeString().split(' ')[0]
      const newEvt = {
        id: `EVT-${Math.floor(10000 + Math.random() * 90000)}`,
        type: randomType,
        status: isFailed ? 'Failed' : 'Success',
        time: timeStr,
        partition: isFailed ? 'P-00 (DLQ)' : `P-0${Math.floor(Math.random() * 4)}`,
        latency: `${(3 + Math.random() * 6).toFixed(1)}ms`,
      }
      setEvents((prev) => [newEvt, ...prev.slice(0, 3)])
    }, 2800)
    return () => clearInterval(interval)
  }, [])

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
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#E7D7BE]" />
              <h3 className="text-sm font-bold text-[#F5F3EF]">Live Event Stream Ticker</h3>
              <span className="text-[10px] text-[#A39E93] font-mono ml-2">(Auto-updating)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-mono text-[#D4CEBF]">INGESTION ACTIVE</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-[#A39E93] border-b border-white/[0.06]">
                  <th className="pb-2 font-mono text-[11px]">Event ID</th>
                  <th className="pb-2 text-[11px]">Type</th>
                  <th className="pb-2 text-[11px]">Partition</th>
                  <th className="pb-2 text-[11px]">Status</th>
                  <th className="pb-2 font-mono text-[11px]">Latency</th>
                  <th className="pb-2 font-mono text-[11px] text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {events.map((evt) => (
                  <tr key={evt.id} className="text-[#D4CEBF] hover:bg-white/[0.02] transition-colors">
                    <td className="py-2.5 font-mono text-[#E7D7BE]">{evt.id}</td>
                    <td className="py-2.5 font-medium text-white">{evt.type}</td>
                    <td className="py-2.5 font-mono text-xs text-[#A39E93]">{evt.partition}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

      </div>
    </section>
  )
}
