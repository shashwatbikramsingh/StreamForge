import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { GithubIcon } from './SocialIcons'

interface CtaBannerProps {
  onGetStarted: () => void
}

export const CtaBanner: React.FC<CtaBannerProps> = ({ onGetStarted }) => {
  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 py-3 md:py-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative bg-[#0E0E12] rounded-3xl p-6 sm:p-8 md:p-10 text-white overflow-hidden shadow-2xl border border-white/[0.08] flex flex-col md:flex-row items-center justify-between gap-6"
      >
        {/* Ambient champagne/ember blur in background */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-[#E7D7BE]/15 to-[#EA580C]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Left Side: Logo + Title + Subtitle */}
        <div className="flex items-start gap-4 z-10">
          <div className="relative w-8 h-8 rounded-full border border-[#E7D7BE]/40 flex items-center justify-center shrink-0 mt-1">
            <span className="w-3.5 h-3.5 rounded-full border border-[#E7D7BE]/70" />
            <span className="absolute w-1.5 h-1.5 rounded-full bg-[#E7D7BE]" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-1 text-[#F5F3EF]">
              Ready to Build Your Real-Time Data Platform?
            </h3>
            <p className="text-xs sm:text-sm text-[#A39E93] font-normal">
              Start with StreamForge and turn your streaming data into real business insights.
            </p>
          </div>
        </div>

        {/* Right Side: CTAs */}
        <div className="flex items-center gap-3 z-10 shrink-0 w-full sm:w-auto justify-start sm:justify-end">
          <button
            onClick={onGetStarted}
            className="px-6 py-2.5 rounded-full bg-[#E7D7BE] hover:bg-[#F3E8D6] text-[#08080A] font-bold text-xs uppercase flex items-center gap-2 shadow-md shadow-[#E7D7BE]/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Started Now
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <a
            href="https://github.com/shashwatbikramsingh/StreamForge"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-[#E4DFD5] font-bold text-xs uppercase border border-white/15 flex items-center gap-2 transition-all hover:border-white/30"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            View on GitHub
          </a>
        </div>
      </motion.div>
    </section>
  )
}
