import React from 'react'
import { GithubIcon, LinkedinIcon, XTwitterIcon } from './SocialIcons'

export const Footer: React.FC = () => {
  const links = [
    { label: 'Product', href: '#product' },
    { label: 'Features', href: '#features' },
    { label: 'Architecture', href: '#architecture' },
    { label: 'Use Cases', href: '#use-cases' },
    { label: 'Docs', href: '#docs' },
    { label: 'Pricing', href: '#pricing' },
  ]

  return (
    <footer className="border-t border-neutral-200/60 w-full px-4 sm:px-6 lg:px-8 py-3.5 mt-2">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* Left: StreamForge Logo */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-end gap-[3px] h-5">
            <span className="w-[3px] h-2.5 rounded-full bg-[#EA580C]" />
            <span className="w-[3px] h-4 rounded-full bg-[#EA580C]" />
            <span className="w-[3px] h-3 rounded-full bg-[#F97316]" />
            <span className="w-[3px] h-5 rounded-full bg-[#EA580C]" />
            <span className="w-[3px] h-3.5 rounded-full bg-[#FB923C]" />
          </div>
          <span className="text-base font-bold text-[#111827] tracking-tight">
            StreamForge
          </span>
        </div>

        {/* Center: Navigation Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-neutral-600">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="hover:text-neutral-900 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right: Social Icons */}
        <div className="flex items-center gap-4 text-neutral-500">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-900 transition-colors p-1"
            aria-label="GitHub"
          >
            <GithubIcon className="w-4 h-4" />
          </a>
          <a
            href="https://linkedin.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-900 transition-colors p-1"
            aria-label="LinkedIn"
          >
            <LinkedinIcon className="w-4 h-4" />
          </a>
          <a
            href="https://twitter.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-neutral-900 transition-colors p-1"
            aria-label="X / Twitter"
          >
            <XTwitterIcon className="w-4 h-4" />
          </a>
        </div>

      </div>

      <div className="mt-6 pt-4 border-t border-neutral-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-400 gap-2">
        <span>© {new Date().getFullYear()} StreamForge. All rights reserved.</span>
        <span>Built with Apache Kafka, Spark, PostgreSQL, FastAPI & React.</span>
      </div>
    </footer>
  )
}
