import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Menu, X } from 'lucide-react'
import { GithubIcon } from './SocialIcons'

interface NavbarProps {
  onGetStartedClick: () => void
  onExploreClick: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ onGetStartedClick, onExploreClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { label: 'PLATFORM', href: '#product' },
    { label: 'FEATURES', href: '#features' },
    { label: 'ARCHITECTURE', href: '#architecture' },
    { label: 'USE CASES', href: '#use-cases' },
    { label: 'DOCS', href: '#docs' },
    { label: 'PRICING', href: '#pricing' },
  ]

  return (
    <header className="sticky top-0 z-50 w-full px-4 sm:px-6 lg:px-8 py-3.5 bg-[#08080A]/85 backdrop-blur-xl border-b border-white/[0.08] transition-all">
      <nav className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Left: Brand Logo matching the Dribbble shot's luxury concentric spiral mark */}
        <a href="#" className="flex items-center gap-3 group">
          <div className="relative w-7 h-7 flex items-center justify-center">
            {/* Concentric rings */}
            <span className="absolute inset-0 rounded-full border border-[#E7D7BE]/40 group-hover:border-[#E7D7BE] transition-colors" />
            <span className="absolute inset-1 rounded-full border border-[#E7D7BE]/70 group-hover:scale-105 transition-transform" />
            <motion.span 
              className="w-1.5 h-1.5 rounded-full bg-[#E7D7BE]"
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
            />
          </div>
          <span className="text-[17px] font-bold tracking-tight text-[#F5F3EF] group-hover:text-[#E7D7BE] transition-colors">
            StreamForge
          </span>
        </a>

        {/* Center: Desktop Nav Links (tracked, uppercase, elegant) */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[11.5px] font-semibold tracking-widest text-[#A39E93] hover:text-[#F5F3EF] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right: Actions matching the Dribbble shot */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="https://github.com/shashwatbikramsingh/StreamForge"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-[#A39E93] hover:text-[#F5F3EF] transition-colors rounded-full hover:bg-white/5"
            aria-label="View on GitHub"
            title="View GitHub Repository"
          >
            <GithubIcon className="w-4 h-4" />
          </a>
          
          {/* Outline Button: VIEW DEMO */}
          <button
            onClick={onExploreClick}
            className="px-5 py-2 text-[11px] font-bold tracking-wider text-[#E4DFD5] bg-white/[0.03] hover:bg-white/[0.08] border border-white/15 rounded-full transition-all uppercase shadow-2xs hover:border-white/30 active:scale-[0.98]"
          >
            VIEW DEMO
          </button>

          {/* Champagne Solid Button: REQUEST A DIAGNOSTIC / GET STARTED */}
          <button
            onClick={onGetStartedClick}
            className="px-5 py-2 text-[11px] font-bold tracking-wider text-[#08080A] bg-[#E7D7BE] hover:bg-[#F3E8D6] rounded-full flex items-center gap-1.5 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98] uppercase"
          >
            GET STARTED
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden items-center gap-2">
          <a
            href="https://github.com/shashwatbikramsingh/StreamForge"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-[#A39E93] hover:text-white"
          >
            <GithubIcon className="w-4 h-4" />
          </a>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#A39E93] hover:text-[#F5F3EF] focus:outline-none"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </nav>

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden mt-3 pt-3 border-t border-white/10 flex flex-col gap-3 pb-2"
          >
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-xs font-semibold tracking-wider text-[#A39E93] hover:text-[#E7D7BE] py-1 transition-colors"
              >
                {link.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  onExploreClick()
                }}
                className="w-full py-2.5 rounded-full border border-white/20 text-[#E4DFD5] text-xs font-bold tracking-wider uppercase"
              >
                VIEW DEMO
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  onGetStartedClick()
                }}
                className="w-full py-2.5 rounded-full bg-[#E7D7BE] text-[#08080A] text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-1.5"
              >
                GET STARTED
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
