import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Menu, X } from 'lucide-react'
import { GithubIcon } from './SocialIcons'

interface NavbarProps {
  onGetStartedClick: () => void
  onExploreClick: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ onGetStartedClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navLinks = [
    { label: 'Home', href: '#' },
    { label: 'Product', href: '#product' },
    { label: 'Features', href: '#features' },
    { label: 'Architecture', href: '#architecture' },
    { label: 'Use Cases', href: '#use-cases' },
    { label: 'Docs', href: '#docs' },
    { label: 'Pricing', href: '#pricing' },
  ]

  return (
    <header className="relative z-40 w-full px-4 sm:px-6 lg:px-8 py-2.5 md:py-3">
      <nav className="flex items-center justify-between">
        {/* Logo: 5 vertical rounded bars + StreamForge */}
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="flex items-end gap-[3px] h-6 px-0.5">
            {[12, 22, 15, 26, 17].map((height, i) => (
              <motion.span
                key={i}
                className="w-[3px] rounded-full bg-[#EA580C]"
                initial={{ height: `${height}px` }}
                animate={{
                  height: [
                    `${height}px`,
                    `${Math.max(8, (height * 1.25) % 27)}px`,
                    `${height}px`,
                  ],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 2.2 + i * 0.3,
                  ease: 'easeInOut',
                }}
              />
            ))}
          </div>
          <span className="text-[20px] font-bold tracking-tight text-[#111827] group-hover:text-[#EA580C] transition-colors">
            StreamForge
          </span>
        </a>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-7 lg:gap-9">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[14px] font-medium text-neutral-600 hover:text-[#111827] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right Buttons: GitHub, Login & Get Started → */}
        <div className="hidden md:flex items-center gap-2.5">
          <a
            href="https://github.com/shashwatbikramsingh/StreamForge"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 text-neutral-600 hover:text-neutral-900 transition-colors rounded-full hover:bg-neutral-100/70"
            aria-label="View on GitHub"
            title="View GitHub Repository"
          >
            <GithubIcon className="w-4 h-4" />
          </a>
          <button
            onClick={onGetStartedClick}
            className="px-5 py-2 text-xs sm:text-sm font-medium text-neutral-800 bg-white/70 hover:bg-white border border-neutral-300/80 rounded-full transition-all shadow-2xs hover:shadow-xs"
          >
            Login
          </button>
          <button
            onClick={onGetStartedClick}
            className="px-5 py-2 text-xs sm:text-sm font-semibold text-white bg-[#18181B] hover:bg-neutral-800 rounded-full flex items-center gap-1.5 transition-all shadow-xs hover:scale-[1.02] active:scale-[0.98]"
          >
            Get Started
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex md:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-neutral-700 hover:text-neutral-900 focus:outline-none"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="md:hidden absolute top-full left-6 right-6 mt-2 bg-white/95 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-neutral-200/80 z-50"
          >
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-base font-medium text-neutral-800 hover:text-[#EA580C] transition-colors py-1"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-4 border-t border-neutral-100 flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    onGetStartedClick()
                  }}
                  className="w-full py-2.5 text-sm font-medium text-neutral-800 bg-neutral-100 rounded-full text-center"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false)
                    onGetStartedClick()
                  }}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-[#18181B] rounded-full flex items-center justify-center gap-2"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
