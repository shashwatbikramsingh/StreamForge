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
            className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-neutral-100 max-h-[90vh] overflow-y-auto z-10"
          >
            <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#EA580C] flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">StreamForge Architecture Blueprint</h3>
                  <p className="text-xs text-neutral-500">Baseline MVP Architecture & Delivery Semantics</p>
                </div>
              </div>
              <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4 text-sm text-neutral-600">
              <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/60">
                <h4 className="font-bold text-neutral-900 mb-1 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  At-Least-Once Delivery & Idempotent Persistence
                </h4>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Events are partitioned across Kafka by <code className="bg-neutral-200 px-1 py-0.5 rounded text-[11px]">ride_id</code> to guarantee chronological per-ride ordering. PostgreSQL enforces deduplication via a unique constraint on <code className="bg-neutral-200 px-1 py-0.5 rounded text-[11px]">event_id</code> (<code className="bg-neutral-200 px-1 py-0.5 rounded text-[11px]">ON CONFLICT DO NOTHING</code>).
                </p>
              </div>

              <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/60">
                <h4 className="font-bold text-neutral-900 mb-1 flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#EA580C]" />
                  Durable Dead-Letter Queue (DLQ) Strategy
                </h4>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  PostgreSQL <code className="bg-neutral-200 px-1 py-0.5 rounded text-[11px]">dead_letter_events</code> is the primary and sole durable DLQ. Offsets in Kafka are committed manually <strong>only after</strong> the database transaction is fully durable.
                </p>
              </div>

              <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/60">
                <h4 className="font-bold text-neutral-900 mb-1 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-neutral-700" />
                  Three-Timestamp Pipeline Telemetry
                </h4>
                <p className="text-xs text-neutral-600 leading-relaxed">
                  Separates domain event time (<code className="bg-neutral-200 px-1 py-0.5 rounded text-[11px]">occurred_at</code>), producer emission (<code className="bg-neutral-200 px-1 py-0.5 rounded text-[11px]">produced_at</code>), and ingestion time (<code className="bg-neutral-200 px-1 py-0.5 rounded text-[11px]">ingested_at</code>). End-to-end ingestion latency is computed with millisecond precision without fabricating uninstrumented metrics.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold"
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
            className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-neutral-100 z-10"
          >
            <button onClick={onClose} className="absolute top-5 right-5 p-1 text-neutral-400 hover:text-neutral-700">
              <X className="w-5 h-5" />
            </button>

            {!submitted ? (
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#FFF3EB] border border-[#FED7AA] text-[#EA580C] flex items-center justify-center mb-4">
                  <Play className="w-5 h-5 fill-[#EA580C] ml-0.5" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-1">Launch StreamForge Cluster</h3>
                <p className="text-xs text-neutral-500 mb-6">
                  Get instant local Docker Compose configurations, synthetic generator scripts, and full telemetry access.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Work Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="engineer@company.com"
                      required
                      className="w-full px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-neutral-900/10 transition-all hover:scale-[1.01]"
                  >
                    Deploy Playground Environment
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                <p className="text-[10px] text-neutral-400 text-center mt-4">
                  Synthetic test data only · Open-source Apache 2.0 license
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 mb-2">Access Granted!</h3>
                <p className="text-xs text-neutral-600 leading-relaxed mb-6">
                  We've sent the setup instructions and Compose bundle to <strong className="text-neutral-900">{email}</strong>.
                </p>
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold"
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
            className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-xl bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-neutral-100 z-10"
          >
            <button onClick={onClose} className="absolute top-5 right-5 p-1 text-neutral-400 hover:text-neutral-700">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#EA580C] flex items-center justify-center">
                <Play className="w-4 h-4 fill-[#EA580C] ml-0.5" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900">Interactive Platform Walkthrough</h3>
            </div>

            <div className="aspect-video bg-neutral-950 rounded-2xl flex flex-col items-center justify-center text-white p-6 relative overflow-hidden group mb-4">
              <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/80 via-transparent to-transparent pointer-events-none" />
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center cursor-pointer group-hover:scale-110 transition-transform">
                <Play className="w-6 h-6 fill-white ml-0.5" />
              </div>
              <span className="text-xs text-neutral-300 mt-3 font-medium">Watch: StreamForge 2-Minute Demo</span>
            </div>

            <div className="text-xs text-neutral-500 leading-relaxed mb-4">
              Learn how StreamForge handles out-of-order synthetic events, enforces monotonic ride state transitions, commits Kafka offsets safely, and powers real-time Streamlit analytics without data loss.
            </div>

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-full text-xs font-semibold"
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

