import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface ProductPreviewProps {
  onViewDashboard: () => void
}

export const ProductPreview: React.FC<ProductPreviewProps> = ({ onViewDashboard }) => {
  const [events, setEvents] = useState([
    { id: 'EVT-94281', type: 'ride_booked', status: 'Success', time: '11:00:24' },
    { id: 'EVT-94280', type: 'payment', status: 'Success', time: '10:59:58' },
    { id: 'EVT-94289', type: 'user_login', status: 'Success', time: '10:59:47' },
    { id: 'EVT-94288', type: 'ride_completed', status: 'Failed', time: '10:59:32' },
  ])

  // Live event ticker
  useEffect(() => {
    const interval = setInterval(() => {
      const types = ['ride_booked', 'payment', 'ride_completed', 'user_login']
      const randomType = types[Math.floor(Math.random() * types.length)]
      const isFailed = Math.random() < 0.15
      const now = new Date()
      const timeStr = now.toTimeString().split(' ')[0]
      const newEvt = {
        id: `EVT-${Math.floor(10000 + Math.random() * 90000)}`,
        type: randomType,
        status: isFailed ? 'Failed' : 'Success',
        time: timeStr,
      }
      setEvents((prev) => [newEvt, ...prev.slice(0, 3)])
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section id="product" className="w-full px-4 sm:px-6 lg:px-8 py-1 md:py-1.5">
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Heading & Button */}
        <div className="lg:col-span-3 flex flex-col items-start pr-0 lg:pr-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF3EA] border border-[#FED7AA]/70 text-[#9A3412] text-xs font-semibold mb-3.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]" />
            Product Preview
          </div>

          <h3 className="text-2xl sm:text-[26px] font-extrabold text-[#111827] tracking-tight mb-2">
            Explore the Platform
          </h3>

          <p className="text-xs sm:text-[13px] text-neutral-500 leading-relaxed font-normal mb-6">
            A powerful, real-time dashboard to monitor events, pipeline health, and business metrics.
          </p>

          <button
            onClick={onViewDashboard}
            className="px-5 py-2.5 rounded-full bg-[#18181B] hover:bg-neutral-800 text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            View Dashboard
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Column: Dashboard Preview Panel */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="lg:col-span-9 bg-white rounded-3xl p-4 sm:p-6 border border-neutral-100 shadow-[0_12px_36px_rgba(234,88,12,0.05)] w-full"
        >
          
          {/* 4 KPIs Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <div className="p-2 sm:p-2.5 rounded-xl bg-neutral-50/70 border border-neutral-100">
              <span className="block text-[9.5px] text-neutral-400 font-medium mb-0.5">Total Events</span>
              <div className="text-sm sm:text-base font-bold text-neutral-900">128.4K</div>
              <div className="flex items-center gap-0.5 text-[8.5px] font-semibold text-emerald-600 mt-0.5">
                <ArrowUpRight className="w-2.5 h-2.5" /> +12.6%
              </div>
            </div>

            <div className="p-2 sm:p-2.5 rounded-xl bg-neutral-50/70 border border-neutral-100">
              <span className="block text-[9.5px] text-neutral-400 font-medium mb-0.5">Processing Rate</span>
              <div className="text-sm sm:text-base font-bold text-neutral-900">842 /s</div>
              <div className="flex items-center gap-0.5 text-[8.5px] font-semibold text-emerald-600 mt-0.5">
                <ArrowUpRight className="w-2.5 h-2.5" /> +18.3%
              </div>
            </div>

            <div className="p-2 sm:p-2.5 rounded-xl bg-neutral-50/70 border border-neutral-100">
              <span className="block text-[9.5px] text-neutral-400 font-medium mb-0.5">Success Rate</span>
              <div className="text-sm sm:text-base font-bold text-neutral-900">98.7%</div>
              <div className="flex items-center gap-0.5 text-[8.5px] font-semibold text-emerald-600 mt-0.5">
                <ArrowUpRight className="w-2.5 h-2.5" /> +0.9%
              </div>
            </div>

            <div className="p-2 sm:p-2.5 rounded-xl bg-neutral-50/70 border border-neutral-100">
              <span className="block text-[9.5px] text-neutral-400 font-medium mb-0.5">Failed Events</span>
              <div className="text-sm sm:text-base font-bold text-neutral-900">1.3%</div>
              <div className="flex items-center gap-0.5 text-[8.5px] font-semibold text-rose-500 mt-0.5">
                <ArrowDownRight className="w-2.5 h-2.5" /> -0.9%
              </div>
            </div>
          </div>

          {/* 3 Widgets Grid: Chart + Donut Distribution + Live Table */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            
            {/* Widget 1: Event Volume Chart (4 cols) */}
            <div className="md:col-span-4 p-3 rounded-2xl bg-neutral-50/60 border border-neutral-100 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-neutral-800 mb-2">Event Volume</span>
              <div className="relative h-[95px] w-full">
                <svg viewBox="0 0 200 90" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="previewGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#EA580C" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path 
                    d="M 10,75 C 40,75 50,55 70,55 C 90,55 105,35 125,35 C 145,35 160,20 190,25 L 190,85 L 10,85 Z" 
                    fill="url(#previewGrad)" 
                  />
                  <path 
                    d="M 10,75 C 40,75 50,55 70,55 C 90,55 105,35 125,35 C 145,35 160,20 190,25" 
                    fill="none" 
                    stroke="#EA580C" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                  />
                </svg>
              </div>
            </div>

            {/* Widget 2: Event Distribution Donut (4 cols) */}
            <div className="md:col-span-4 p-3 rounded-2xl bg-neutral-50/60 border border-neutral-100 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-neutral-800 mb-1">Event Distribution</span>
              <div className="flex items-center justify-around gap-2 my-auto">
                <div className="relative w-15 h-15 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="14.5" fill="none" stroke="#F3F4F6" strokeWidth="3.5" />
                    <circle cx="18" cy="18" r="14.5" fill="none" stroke="#10B981" strokeWidth="3.5" strokeDasharray="62, 100" strokeLinecap="round" />
                    <circle cx="18" cy="18" r="14.5" fill="none" stroke="#059669" strokeWidth="3.5" strokeDasharray="24, 100" strokeDashoffset="-63" />
                    <circle cx="18" cy="18" r="14.5" fill="none" stroke="#EA580C" strokeWidth="3.5" strokeDasharray="10, 100" strokeDashoffset="-88" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[9.5px] font-extrabold text-neutral-900 leading-none">128.4K</span>
                    <span className="text-[7px] text-neutral-400">Total</span>
                  </div>
                </div>

                <div className="space-y-1 text-[8.5px]">
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Ride Booking 62%</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-700" />
                    <span>User Activity 24%</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]" />
                    <span>Payments 10%</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-neutral-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span>Others 4%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Widget 3: Recent Events Table (4 cols) */}
            <div className="md:col-span-4 p-3 rounded-2xl bg-neutral-50/60 border border-neutral-100 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-neutral-800 mb-1.5">Recent Events</span>
              <div className="overflow-x-auto">
                <table className="w-full text-[8.5px] text-left">
                  <thead>
                    <tr className="text-neutral-400 border-b border-neutral-200/60 pb-1">
                      <th className="font-semibold pb-1">Event ID</th>
                      <th className="font-semibold pb-1">Type</th>
                      <th className="font-semibold pb-1">Status</th>
                      <th className="font-semibold pb-1 text-right">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100/70">
                    {events.map((evt) => (
                      <tr key={evt.id} className="py-1">
                        <td className="py-1 font-mono text-neutral-700">{evt.id}</td>
                        <td className="py-1 text-neutral-600 truncate max-w-[50px]">{evt.type}</td>
                        <td className="py-1">
                          <span className={`px-1.5 py-0.2 rounded-full font-semibold ${
                            evt.status === 'Success' 
                              ? 'bg-emerald-50 text-emerald-700' 
                              : 'bg-rose-50 text-rose-600'
                          }`}>
                            {evt.status}
                          </span>
                        </td>
                        <td className="py-1 font-mono text-neutral-400 text-right">{evt.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </motion.div>

      </div>

    </section>
  )
}
