import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { GithubIcon } from './SocialIcons'

interface CtaBannerProps {
  onGetStarted: () => void
}

export const CtaBanner: React.FC<CtaBannerProps> = ({ onGetStarted }) => {
  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 py-1 md:py-1.5">
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="relative bg-[#18181B] rounded-3xl p-6 sm:p-8 md:p-10 text-white overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6"
      >
        {/* Ambient warm orange blur in background */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Left Side: Logo + Title + Subtitle */}
        <div className="flex items-start gap-4 z-10">
          <div className="flex items-end gap-[3px] h-8 shrink-0 pt-1">
            <span className="w-[3px] h-3 rounded-full bg-[#EA580C]" />
            <span className="w-[3px] h-5 rounded-full bg-[#EA580C]" />
            <span className="w-[3px] h-4 rounded-full bg-[#F97316]" />
            <span className="w-[3px] h-7 rounded-full bg-[#EA580C]" />
            <span className="w-[3px] h-4.5 rounded-full bg-[#FB923C]" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight mb-1 text-white">
              Ready to Build Your Real-Time Data Platform?
            </h3>
            <p className="text-xs sm:text-sm text-neutral-400 font-normal">
              Start with StreamForge and turn your streaming data into real business insights.
            </p>
          </div>
        </div>

        {/* Right Side: CTAs */}
        <div className="flex items-center gap-3 z-10 shrink-0 w-full sm:w-auto justify-start sm:justify-end">
          <button
            onClick={onGetStarted}
            className="px-6 py-2.5 rounded-full bg-[#EA580C] hover:bg-[#D9480F] text-white font-semibold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-orange-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Started Now
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs sm:text-sm border border-neutral-700 flex items-center gap-2 transition-all hover:border-neutral-500"
          >
            <GithubIcon className="w-3.5 h-3.5" />
            View on GitHub
          </a>
        </div>
      </motion.div>
    </section>
  )
}
