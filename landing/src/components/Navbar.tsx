import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import { GithubIcon, StreamForgeHexagonLogo } from './SocialIcons'

interface NavbarProps {
  onGetStartedClick: () => void
  onExploreClick: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ onGetStartedClick, onExploreClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('')
  const [isScrolled, setIsScrolled] = useState(false)

  const navLinks = [
    { label: 'Features', href: '#features', id: 'features' },
    { label: 'Architecture', href: '#architecture', id: 'architecture' },
    { label: 'Use Cases', href: '#use-cases', id: 'use-cases' },
  ]

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)

      const scrollPosition = window.scrollY + 140
      const sectionElements = navLinks.map((link) => ({
        id: link.id,
        el: document.getElementById(link.id),
      }))

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const item = sectionElements[i]
        if (item.el) {
          const top = item.el.offsetTop
          if (scrollPosition >= top) {
            setActiveSection(item.id)
            return
          }
        }
      }

      if (window.scrollY < 200) {
        setActiveSection('')
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`sticky top-0 z-50 w-full px-4 sm:px-6 lg:px-8 py-3.5 transition-all duration-200 ${
      isScrolled 
        ? 'bg-[#08080A]/90 backdrop-blur-xl border-b border-white/[0.1] shadow-[0_4px_24px_rgba(0,0,0,0.5)]' 
        : 'bg-[#08080A]/75 backdrop-blur-md border-b border-white/[0.06]'
    }`}>
      <nav className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Left: Brand Logo matching the screenshot's 3D isometric orange hexagon */}
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="relative w-7 h-7 flex items-center justify-center transition-transform group-hover:scale-105">
            <StreamForgeHexagonLogo className="w-6 h-6" />
          </div>
          <span className="text-[17px] font-bold tracking-tight text-[#F5F3EF] group-hover:text-white transition-colors">
            StreamForge
          </span>
        </a>

        {/* Center: Desktop Nav Links (Features, Architecture, Use Cases) */}
        <div className="hidden md:flex items-center gap-7 lg:gap-9">
          {navLinks.map((link) => {
            const isActive = activeSection === link.id
            return (
              <a
                key={link.label}
                href={link.href}
                className={`relative py-1 text-[13px] font-medium transition-colors ${
                  isActive ? 'text-white font-semibold' : 'text-[#A39E93] hover:text-[#F5F3EF]'
                }`}
              >
                <span>{link.label}</span>
                {isActive && (
                  <motion.span 
                    layoutId="activeNavIndicator"
                    className="absolute -bottom-1 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-400 to-amber-300 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.6)]"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </a>
            )
          })}
        </div>

        {/* Right: Actions matching the screenshot */}
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
          
          {/* Get Started Pill Button with ArrowUpRight */}
          <button
            onClick={onGetStartedClick}
            className="px-5 py-2 text-xs font-semibold text-[#F5F3EF] bg-white/[0.04] hover:bg-white/[0.09] border border-white/15 rounded-full flex items-center gap-1.5 transition-all shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          >
            <span>Get Started</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-white/80" />
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
            {navLinks.map((link) => {
              const isActive = activeSection === link.id
              return (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`text-sm font-medium py-1.5 transition-colors flex items-center justify-between ${
                    isActive ? 'text-white font-semibold' : 'text-[#A39E93] hover:text-white'
                  }`}
                >
                  <span>{link.label}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
                </a>
              )
            })}
            <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  onExploreClick()
                }}
                className="w-full py-2.5 rounded-full border border-white/20 text-[#E4DFD5] text-xs font-semibold"
              >
                Try Live Demo
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false)
                  onGetStartedClick()
                }}
                className="w-full py-2.5 rounded-full bg-white text-black text-xs font-bold flex items-center justify-center gap-1.5"
              >
                Get Started
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
