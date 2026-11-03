import React from 'react'
import { GithubIcon, LinkedinIcon, XTwitterIcon } from './SocialIcons'

export const Footer: React.FC = () => {
  const links = [
    { label: 'PLATFORM', href: '#product' },
    { label: 'FEATURES', href: '#features' },
    { label: 'ARCHITECTURE', href: '#architecture' },
    { label: 'USE CASES', href: '#use-cases' },
    { label: 'DOCS', href: '#docs' },
    { label: 'PRICING', href: '#pricing' },
  ]

  return (
    <footer className="border-t border-white/[0.08] w-full py-12 bg-[#08080A]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          
          {/* Left: StreamForge Logo */}
          <div className="flex items-center gap-3">
            <div className="relative w-7 h-7 rounded-full border border-[#E7D7BE]/40 flex items-center justify-center">
              <span className="w-3 h-3 rounded-full border border-[#E7D7BE]/70" />
              <span className="absolute w-1.5 h-1.5 rounded-full bg-[#E7D7BE]" />
            </div>
            <span className="text-base font-bold text-[#F5F3EF] tracking-tight">
              StreamForge
            </span>
          </div>

          {/* Center: Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs font-semibold tracking-widest text-[#A39E93]">
            {links.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="hover:text-[#F5F3EF] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right: Social Icons */}
          <div className="flex items-center gap-4 text-[#A39E93]">
            <a
              href="https://github.com/shashwatbikramsingh/StreamForge"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#E7D7BE] transition-colors p-1"
              aria-label="GitHub"
            >
              <GithubIcon className="w-4 h-4" />
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#E7D7BE] transition-colors p-1"
              aria-label="LinkedIn"
            >
              <LinkedinIcon className="w-4 h-4" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#E7D7BE] transition-colors p-1"
              aria-label="X / Twitter"
            >
              <XTwitterIcon className="w-4 h-4" />
            </a>
          </div>

        </div>

        <div className="mt-8 pt-6 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between text-xs text-[#7A756D] gap-2">
          <span>© {new Date().getFullYear()} StreamForge. All rights reserved.</span>
          <span>Built with Apache Kafka, Spark, PostgreSQL, FastAPI & React.</span>
        </div>
      </div>
    </footer>
  )
}
