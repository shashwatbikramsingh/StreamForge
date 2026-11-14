import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Layers, Info, ArrowUpRight, ArrowDownRight, 
  Sparkles, Check, ChevronDown, ChevronUp, Mic, Send, Plus, User
} from 'lucide-react'

// Brand Icons
const SlackIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M6 15a2 2 0 1 1-2-2h2v2z" fill="#E01E5A" />
    <path d="M7 15a2 2 0 1 1 2-2v2H7z" fill="#E01E5A" />
    <path d="M9 6a2 2 0 1 1-2 2V6h2z" fill="#36C5F0" />
    <path d="M9 7a2 2 0 1 1 2 2H9V7z" fill="#36C5F0" />
    <path d="M18 9a2 2 0 1 1 2 2h-2V9z" fill="#2EB67D" />
    <path d="M17 9a2 2 0 1 1-2 2v-2h2z" fill="#2EB67D" />
    <path d="M15 18a2 2 0 1 1 2-2v2h-2z" fill="#ECB22E" />
    <path d="M15 17a2 2 0 1 1-2-2h2v2z" fill="#ECB22E" />
  </svg>
)

const NotionIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <div className={`${className} bg-white rounded flex items-center justify-center font-bold text-black text-[9px] font-serif leading-none`}>
    N
  </div>
)

const DropboxIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="#0061FF">
    <path d="M6 3.5L12 7.5L6 11.5L0 7.5L6 3.5ZM18 3.5L24 7.5L18 11.5L12 7.5L18 3.5ZM0 15.5L6 19.5L12 15.5L6 11.5L0 15.5ZM24 15.5L18 19.5L12 15.5L18 11.5L24 15.5ZM6 21L12 17L18 21L12 24L6 21Z" />
  </svg>
)

export const FeaturesGrid: React.FC = () => {
  // Card 1: Integrations state
  const [integrations, setIntegrations] = useState([
    { name: 'Slack', desc: 'Sent messages & notifications', connected: true, icon: SlackIcon },
    { name: 'Notion', desc: 'Create and update pages', connected: false, icon: NotionIcon },
    { name: 'Dropbox', desc: 'Create and update pages', connected: false, icon: DropboxIcon },
  ])

  // Card 4: Interactive Prompt Intelligence State
  const [activeReasoning, setActiveReasoning] = useState('DeepThink')
  const [isDropdownOpen, setIsDropdownOpen] = useState(true)
  const [promptText, setPromptText] = useState('')

  const toggleConnect = (index: number) => {
    setIntegrations((prev) => 
      prev.map((item, idx) => idx === index ? { ...item, connected: !item.connected } : item)
    )
  }

  const reasoningOptions = [
    { id: 'quick', label: 'Quick answer', icon: '⚡' },
    { id: 'balanced', label: 'Balanced', icon: '⚖' },
    { id: 'deepthink', label: 'DeepThink', icon: '🧠' },
    { id: 'research', label: 'Research', icon: '🔍' },
  ]

  return (
    <section id="features" className="w-full py-16 md:py-24 scroll-mt-12 bg-[#08080A] relative overflow-hidden">
      
      {/* Background ambient lighting */}
      <div 
        className="pointer-events-none absolute top-1/3 left-1/2 -translate-x-1/2 w-[850px] h-[550px] rounded-full blur-[140px] opacity-25"
        style={{
          background: 'radial-gradient(circle, rgba(234, 88, 12, 0.35) 0%, rgba(59, 130, 246, 0.15) 50%, transparent 80%)'
        }}
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* 2x2 Glassmorphism Grid matching Image 2 exactly */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">

          {/* ============================================================== */}
          {/* CARD 1 (Top Left): Visibility Metrics (Slack, Notion, Dropbox) */}
          {/* ============================================================== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl bg-[#0C0C12]/90 border border-white/[0.08] p-5 sm:p-6 flex flex-col justify-between hover:border-white/20 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.7)] group"
          >
            {/* Visual Screen with warm amber flare */}
            <div className="w-full h-[250px] sm:h-[270px] rounded-2xl bg-[#07070A] border border-white/[0.06] relative overflow-hidden flex flex-col justify-center items-center p-4">
              
              {/* Warm Amber Diagonal Light Streak */}
              <div className="absolute -top-12 -left-12 w-72 h-72 rounded-full bg-gradient-to-br from-amber-500/40 via-orange-500/20 to-transparent blur-3xl pointer-events-none" />
              <div className="absolute top-0 left-16 w-20 h-64 -rotate-45 bg-gradient-to-b from-orange-400/30 via-amber-500/10 to-transparent blur-xl pointer-events-none" />

              {/* 3 Integration Rows */}
              <div className="w-full max-w-[320px] space-y-2.5 relative z-10">
                {integrations.map((item, idx) => {
                  const Icon = item.icon
                  return (
                    <div 
                      key={item.name}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#14141E]/80 border border-white/[0.08] backdrop-blur-md transition-all hover:bg-[#181826]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-white leading-tight">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-[#A39E93] leading-tight">
                            {item.desc}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => toggleConnect(idx)}
                        className={`px-3 py-1 rounded-full text-[10.5px] font-semibold transition-all ${
                          item.connected
                            ? 'text-amber-300 bg-amber-500/15 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                            : 'text-[#D4CEBF] bg-white/[0.04] border border-white/10 hover:border-white/20'
                        }`}
                      >
                        {item.connected ? 'Connected' : 'Connect'}
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Label and Description */}
            <div className="mt-5">
              <div className="flex items-center gap-2 mb-1.5">
                <Layers className="w-4 h-4 text-white/90" />
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Visibility Metrics
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-[#A39E93] leading-relaxed">
                Track brand visibility scores across AI platforms and measure share of voice.
              </p>
            </div>
          </motion.div>

          {/* ============================================================== */}
          {/* CARD 2 (Top Right): Competitor Analysis (Marketing Channels)  */}
          {/* ============================================================== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-3xl bg-[#0C0C12]/90 border border-white/[0.08] p-5 sm:p-6 flex flex-col justify-between hover:border-white/20 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.7)] group"
          >
            {/* Visual Screen with cool blue backlight */}
            <div className="w-full h-[250px] sm:h-[270px] rounded-2xl bg-[#07070A] border border-white/[0.06] relative overflow-hidden p-4 flex flex-col justify-center">
              
              {/* Blue Glow Background */}
              <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-gradient-to-bl from-blue-600/30 via-indigo-500/15 to-transparent blur-3xl pointer-events-none" />

              {/* Underlying Marketing Channels Window */}
              <div className="w-full max-w-[320px] mx-auto p-3.5 rounded-2xl bg-[#101018]/90 border border-white/[0.08] backdrop-blur-md relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-[#D4CEBF]">
                    <span>Marketing Channels</span>
                    <Info className="w-3 h-3 text-[#71717A]" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#A39E93] bg-white/[0.04] px-2 py-0.5 rounded-md">Details</span>
                    <div className="flex items-center -space-x-1.5">
                      <div className="w-4 h-4 rounded-full bg-orange-400 border border-black text-[7px] flex items-center justify-center font-bold">A</div>
                      <div className="w-4 h-4 rounded-full bg-blue-400 border border-black text-[7px] flex items-center justify-center font-bold">B</div>
                      <div className="w-4 h-4 rounded-full bg-purple-400 border border-black text-[7px] flex items-center justify-center font-bold">C</div>
                      <span className="text-[8px] text-[#A39E93] pl-2 font-mono">99+</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-white">82%</span>
                  <span className="text-[10px] font-semibold text-emerald-400 flex items-center">
                    +21% vs last week
                  </span>
                </div>

                {/* Mini Table */}
                <div className="text-[10px] space-y-1 text-[#A39E93]">
                  <div className="grid grid-cols-3 border-b border-white/[0.06] pb-1 font-mono text-[9px] uppercase">
                    <span>Channels</span>
                    <span>Metric</span>
                    <span className="text-right">Total</span>
                  </div>
                  <div className="grid grid-cols-3 text-white">
                    <span>Acquisition</span>
                    <span className="font-mono text-[#D4CEBF]">$38.25</span>
                    <span className="text-right text-emerald-400 flex items-center justify-end gap-0.5 font-mono">
                      <ArrowUpRight className="w-2.5 h-2.5" /> +5
                    </span>
                  </div>
                  <div className="grid grid-cols-3 text-white">
                    <span>Conversion</span>
                    <span className="font-mono text-[#D4CEBF]">4.2 days</span>
                    <span className="text-right text-amber-400 flex items-center justify-end gap-0.5 font-mono">
                      <ArrowDownRight className="w-2.5 h-2.5" /> +3
                    </span>
                  </div>
                </div>
              </div>

              {/* Elevated Floating Competitor Rating Card */}
              <motion.div 
                animate={{ y: [-2, 2, -2] }}
                transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
                className="absolute bottom-3 right-3 sm:right-6 p-3 rounded-2xl bg-[#161624]/95 border border-white/20 backdrop-blur-xl shadow-2xl z-20"
              >
                <div className="flex items-center gap-1.5 mb-1 text-[11px] font-bold text-white">
                  <div className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <User className="w-2.5 h-2.5" />
                  </div>
                  <span>Competitor Rating</span>
                </div>
                <div className="text-[9px] uppercase font-mono text-[#A39E93] mb-0.5">
                  TOTAL RATING
                </div>
                <div className="text-xs font-bold text-white flex items-center gap-1">
                  <span className="text-amber-400">★</span>
                  <span>3.8/5</span>
                  <span className="text-[10px] font-normal text-[#A39E93]">(Overall 4.5)</span>
                </div>
              </motion.div>

            </div>

            {/* Label and Description */}
            <div className="mt-5">
              <div className="flex items-center gap-2 mb-1.5">
                <Layers className="w-4 h-4 text-white/90" />
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Competitor Analysis
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-[#A39E93] leading-relaxed">
                Track brand visibility scores across AI platforms and measure share of voice.
              </p>
            </div>
          </motion.div>

          {/* ============================================================== */}
          {/* CARD 3 (Bottom Left): Competitor Analysis (Electric Blue Beam) */}
          {/* ============================================================== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="rounded-3xl bg-[#0C0C12]/90 border border-white/[0.08] p-5 sm:p-6 flex flex-col justify-between hover:border-white/20 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.7)] group"
          >
            {/* Visual Screen with intense electric blue lightning streak */}
            <div className="w-full h-[250px] sm:h-[270px] rounded-2xl bg-[#07070A] border border-white/[0.06] relative overflow-hidden flex flex-col justify-center items-center p-4">
              
              {/* Diagonal Electric Blue Beam */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                <div className="w-48 h-80 -rotate-45 bg-gradient-to-b from-blue-400/40 via-cyan-400/25 to-transparent blur-2xl opacity-90" />
                <div className="w-16 h-96 -rotate-45 bg-white/25 blur-lg" />
              </div>

              {/* Faded Background Text Rows */}
              <div className="w-full max-w-[320px] space-y-4 opacity-25 select-none text-[11px] font-medium text-[#D4CEBF] relative z-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="truncate">Your competitor announced a 45M seed..</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="truncate">Track AI citations and measure brand visibility..</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="truncate">Customers reached out within six months..</span>
                </div>
              </div>

              {/* Elevated Floating Foreground Glass Pill */}
              <motion.div 
                animate={{ y: [-2, 2, -2] }}
                transition={{ repeat: Infinity, duration: 4.8, ease: 'easeInOut' }}
                className="absolute z-20 px-4 py-3 rounded-2xl bg-[#12121C]/90 border border-white/20 backdrop-blur-xl shadow-[0_15px_35px_rgba(0,0,0,0.8),0_0_20px_rgba(59,130,246,0.2)] flex items-center gap-2.5 max-w-[320px] w-[90%]"
              >
                <Sparkles className="w-4 h-4 text-white shrink-0" />
                <span className="text-xs font-semibold text-white truncate">
                  Investors are flipping through your deck faster....
                </span>
              </motion.div>

            </div>

            {/* Label and Description */}
            <div className="mt-5">
              <div className="flex items-center gap-2 mb-1.5">
                <Layers className="w-4 h-4 text-white/90" />
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Competitor Analysis
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-[#A39E93] leading-relaxed">
                Track brand visibility scores across AI platforms and measure share of voice.
              </p>
            </div>
          </motion.div>

          {/* ============================================================== */}
          {/* CARD 4 (Bottom Right): Prompt Intelligence (Interactive AI)   */}
          {/* ============================================================== */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="rounded-3xl bg-[#0C0C12]/90 border border-white/[0.08] p-5 sm:p-6 flex flex-col justify-between hover:border-white/20 transition-all shadow-[0_20px_50px_rgba(0,0,0,0.7)] group"
          >
            {/* Visual Screen with Horizon Glow & Interactive Prompt Bar */}
            <div className="w-full h-[250px] sm:h-[270px] rounded-2xl bg-[#07070A] border border-white/[0.06] relative overflow-hidden flex flex-col justify-center items-center p-4">
              
              {/* Dual Horizon Glow (Warm Amber on left, Electric Blue on right) */}
              <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-44 h-44 rounded-full bg-orange-500/25 blur-3xl pointer-events-none" />
              <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-44 h-44 rounded-full bg-blue-500/25 blur-3xl pointer-events-none" />
              
              {/* Subtle digital dot matrix grid background */}
              <div 
                className="absolute inset-0 opacity-[0.05] pointer-events-none"
                style={{
                  backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                  backgroundSize: '16px 16px'
                }}
              />

              {/* Main Prompt Bar Container */}
              <div className="w-full max-w-[320px] rounded-2xl bg-[#12121A]/95 border border-white/15 p-3 backdrop-blur-xl shadow-2xl relative z-10">
                
                {/* Input Text Area */}
                <div className="mb-2.5">
                  <input
                    type="text"
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    placeholder="Ask anything..."
                    className="w-full bg-transparent text-xs text-white placeholder-[#71717A] focus:outline-none font-sans"
                  />
                </div>

                {/* Bottom Toolbar matching screenshot */}
                <div className="flex items-center justify-between pt-1 border-t border-white/[0.06]">
                  <div className="flex items-center gap-1.5">
                    {/* + Button */}
                    <button className="w-5 h-5 rounded-md bg-white/[0.06] hover:bg-white/[0.12] text-white flex items-center justify-center transition-all">
                      <Plus className="w-3 h-3 text-[#A39E93]" />
                    </button>

                    {/* Mode selector */}
                    <div className="px-2 py-0.5 rounded-md text-[10px] text-[#A39E93] bg-white/[0.04] flex items-center gap-1">
                      <span>Normal</span>
                      <ChevronDown className="w-2.5 h-2.5" />
                    </div>

                    {/* DeepThink Active Selector */}
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="px-2 py-0.5 rounded-md text-[10px] font-semibold text-white bg-indigo-500/20 border border-indigo-500/40 flex items-center gap-1 shadow-sm"
                    >
                      <span>{activeReasoning}</span>
                      {isDropdownOpen ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Voice Icon */}
                    <button className="px-1.5 py-0.5 rounded-md text-[10px] text-[#A39E93] hover:text-white flex items-center gap-1">
                      <Mic className="w-2.5 h-2.5" />
                      <span>Voice</span>
                    </button>

                    {/* Send Button */}
                    <button className="w-6 h-6 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-all shadow-md">
                      <Send className="w-3 h-3 translate-x-[1px]" />
                    </button>
                  </div>
                </div>

                {/* Open Dropdown Menu Anchored Below DeepThink */}
                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 5 }}
                      className="absolute left-16 top-full mt-1.5 w-36 p-1.5 rounded-xl bg-[#181826] border border-white/15 shadow-2xl z-30 space-y-0.5 text-[10.5px]"
                    >
                      {reasoningOptions.map((opt) => {
                        const isSelected = activeReasoning === opt.label
                        return (
                          <div
                            key={opt.id}
                            onClick={() => {
                              setActiveReasoning(opt.label)
                              setIsDropdownOpen(false)
                            }}
                            className={`px-2 py-1.5 rounded-lg flex items-center justify-between cursor-pointer transition-all ${
                              isSelected ? 'bg-indigo-600/30 text-white font-semibold' : 'text-[#A39E93] hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <span>{opt.icon}</span>
                              <span>{opt.label}</span>
                            </div>
                            {isSelected && <Check className="w-3 h-3 text-indigo-400" />}
                          </div>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

            </div>

            {/* Label and Description */}
            <div className="mt-5">
              <div className="flex items-center gap-2 mb-1.5">
                <Layers className="w-4 h-4 text-white/90" />
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Prompt Intelligence
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-[#A39E93] leading-relaxed">
                Discover high-value prompts to target and optimize your AI search strategy.
              </p>
            </div>
          </motion.div>

        </div>

      </div>
    </section>
  )
}
