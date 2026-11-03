import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { GithubIcon } from './SocialIcons'

interface CtaBannerProps {
  onGetStarted: () => void
}

export const CtaBanner: React.FC<CtaBannerProps> = ({ onGetStarted }) => {
  return (
    <section className="w-full py-14 md:py-24 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative bg-[#0E0E12] rounded-3xl p-8 sm:p-10 md:p-12 text-white overflow-hidden shadow-2xl border border-white/[0.08] flex flex-col md:flex-row items-center justify-between gap-8"
        >
          {/* Ambient champagne/ember blur in background */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#E7D7BE]/15 to-[#EA580C]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Left Side: Logo + Title + Subtitle */}
          <div className="flex items-start gap-4 z-10">
            <div className="relative w-9 h-9 rounded-full border border-[#E7D7BE]/40 flex items-center justify-center shrink-0 mt-1">
              <span className="w-4 h-4 rounded-full border border-[#E7D7BE]/70" />
              <span className="absolute w-1.5 h-1.5 rounded-full bg-[#E7D7BE]" />
            </div>
            <div>
              <h3 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 text-[#F5F3EF]">
                Ready to Build Your Real-Time Data Platform?
              </h3>
              <p className="text-sm text-[#A39E93] font-normal max-w-xl">
                Start with StreamForge and turn your raw streaming events into dependable, real-time business insights.
              </p>
            </div>
          </div>

          {/* Right Side: CTAs */}
          <div className="flex items-center gap-3.5 z-10 shrink-0 w-full sm:w-auto justify-start sm:justify-end">
            <button
              onClick={onGetStarted}
              className="px-7 py-3 rounded-full bg-[#E7D7BE] hover:bg-[#F3E8D6] text-[#08080A] font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-md shadow-[#E7D7BE]/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Get Started Now
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <a
              href="https://github.com/shashwatbikramsingh/StreamForge"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-[#E4DFD5] font-bold text-xs uppercase tracking-wider border border-white/15 flex items-center gap-2 transition-all hover:border-white/30"
            >
              <GithubIcon className="w-4 h-4" />
              View on GitHub
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
