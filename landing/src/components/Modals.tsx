import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, ArrowRight, ShieldCheck, Database, Cpu, Terminal, Play } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
}

export const ArchitectureModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-2xl bg-[#0E0E12] rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto z-10 text-[#F5F3EF]"
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#E7D7BE]/10 border border-[#E7D7BE]/20 text-[#E7D7BE] flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#F5F3EF] tracking-tight">StreamForge Architecture Blueprint</h3>
                  <p className="text-xs text-[#A39E93]">Baseline MVP Architecture & Delivery Semantics</p>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="Close Architecture Modal"
                className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-5 text-sm text-[#D4CEBF]">
              <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/[0.07]">
                <h4 className="font-semibold text-white mb-1.5 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  At-Least-Once Delivery & Idempotent Persistence
                </h4>
                <p className="text-xs text-[#A39E93] leading-relaxed">
                  Events are partitioned across Kafka by <code className="bg-white/10 text-[#E7D7BE] px-1 py-0.5 rounded text-[11px] font-mono">ride_id</code> to guarantee chronological per-ride ordering. PostgreSQL enforces deduplication via a unique constraint on <code className="bg-white/10 text-[#E7D7BE] px-1 py-0.5 rounded text-[11px] font-mono">event_id</code> (<code className="bg-white/10 text-[#E7D7BE] px-1 py-0.5 rounded text-[11px] font-mono">ON CONFLICT DO NOTHING</code>).
                </p>
              </div>

              <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/[0.07]">
                <h4 className="font-semibold text-white mb-1.5 flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#EA580C]" />
                  Durable Dead-Letter Queue (DLQ) Strategy
                </h4>
                <p className="text-xs text-[#A39E93] leading-relaxed">
                  PostgreSQL <code className="bg-white/10 text-[#E7D7BE] px-1 py-0.5 rounded text-[11px] font-mono">dead_letter_events</code> is the primary and sole durable DLQ. Offsets in Kafka are committed manually <strong className="text-white">only after</strong> the database transaction is fully durable.
                </p>
              </div>

              <div className="bg-white/[0.03] rounded-2xl p-4 border border-white/[0.07]">
                <h4 className="font-semibold text-white mb-1.5 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#E7D7BE]" />
                  Three-Timestamp Pipeline Telemetry
                </h4>
                <p className="text-xs text-[#A39E93] leading-relaxed">
                  Separates domain event time (<code className="bg-white/10 text-[#E7D7BE] px-1 py-0.5 rounded text-[11px] font-mono">occurred_at</code>), producer emission (<code className="bg-white/10 text-[#E7D7BE] px-1 py-0.5 rounded text-[11px] font-mono">produced_at</code>), and ingestion time (<code className="bg-white/10 text-[#E7D7BE] px-1 py-0.5 rounded text-[11px] font-mono">ingested_at</code>). End-to-end ingestion latency is computed with millisecond precision without fabricating uninstrumented metrics.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[0.08] flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-full text-xs font-semibold tracking-wide transition-all"
              >
                Close Blueprint
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export const GetStartedModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setSubmitted(true)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1, y: 0 }}
            className="relative w-full max-w-md bg-[#0E0E12] rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 z-10 text-[#F5F3EF]"
          >
            <button
              onClick={onClose}
              aria-label="Close Get Started Modal"
              className="absolute top-5 right-5 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {!submitted ? (
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#E7D7BE]/10 border border-[#E7D7BE]/20 text-[#E7D7BE] flex items-center justify-center mb-4">
                  <Play className="w-5 h-5 fill-[#E7D7BE] ml-0.5" />
                </div>
                <h3 className="text-xl font-bold text-white mb-1 tracking-tight">Launch StreamForge Cluster</h3>
                <p className="text-xs text-[#A39E93] mb-6 leading-relaxed">
                  Get instant local Docker Compose configurations, synthetic generator scripts, and full telemetry access.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#D4CEBF] mb-1.5 uppercase tracking-wider">Work Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="engineer@company.com"
                      required
                      className="w-full px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/15 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-[#E7D7BE]/30 focus:border-[#E7D7BE] transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-full bg-[#E7D7BE] hover:bg-[#F3E8D7] text-[#08080A] font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg shadow-black/40 transition-all hover:scale-[1.01]"
                  >
                    Deploy Playground Environment
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <p className="text-[10px] text-white/40 text-center mt-4">
                  Synthetic test data only · Open-source Apache 2.0 license
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">Access Granted</h3>
                <p className="text-xs text-[#A39E93] leading-relaxed mb-6">
                  We've sent the setup instructions and Compose bundle to <strong className="text-white">{email}</strong>.
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-[#E7D7BE] hover:bg-[#F3E8D7] text-[#08080A] rounded-full text-xs font-semibold uppercase tracking-wider transition-all"
                >
                  Done
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export const ExploreModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1, y: 0 }}
            className="relative w-full max-w-xl bg-[#0E0E12] rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 z-10 text-[#F5F3EF]"
          >
            <button
              onClick={onClose}
              aria-label="Close Explore Modal"
              className="absolute top-5 right-5 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-[#EA580C]/10 border border-[#EA580C]/20 text-[#EA580C] flex items-center justify-center">
                <Play className="w-4 h-4 fill-[#EA580C] ml-0.5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white tracking-tight">Interactive Platform Walkthrough</h3>
                <p className="text-xs text-[#A39E93]">Explore the real-time engine in motion</p>
              </div>
            </div>

            <div className="aspect-video bg-[#08080A] rounded-2xl flex flex-col items-center justify-center text-white p-6 relative overflow-hidden group mb-5 border border-white/10">
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              <div className="w-14 h-14 rounded-full bg-[#E7D7BE]/20 border border-[#E7D7BE]/40 backdrop-blur-md flex items-center justify-center cursor-pointer group-hover:scale-110 group-hover:bg-[#E7D7BE] group-hover:text-[#08080A] transition-all text-[#E7D7BE]">
                <Play className="w-6 h-6 fill-current ml-0.5" />
              </div>
              <span className="text-xs text-[#D4CEBF] mt-3 font-medium">Watch: StreamForge 2-Minute Demo</span>
            </div>

            <div className="text-xs text-[#A39E93] leading-relaxed mb-6">
              Learn how StreamForge handles out-of-order synthetic events, enforces monotonic ride state transitions, commits Kafka offsets safely, and powers real-time Streamlit analytics without data loss.
            </div>

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-full text-xs font-semibold uppercase tracking-wider transition-all"
              >
                Close Walkthrough
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}


