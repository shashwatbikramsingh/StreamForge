import React from 'react'
import { motion } from 'framer-motion'
import { FileCode, BookOpen, Layers, Check } from 'lucide-react'
import { GithubIcon } from './SocialIcons'

export const DocsAndPricing: React.FC = () => {
  const docCards = [
    { title: 'GitHub', sub: 'Source Code & Issues', icon: GithubIcon, href: 'https://github.com/shashwatbikramsingh/StreamForge' },
    { title: 'API Docs', sub: 'Endpoints & Schemas', icon: FileCode, href: '#api' },
    { title: 'Setup Guide', sub: 'Docker & KRaft Cluster', icon: BookOpen, href: '#setup' },
    { title: 'Architecture', sub: 'ADRs & Technical Decisions', icon: Layers, href: '#architecture' },
  ]

  const pricingTiers = [
    {
      name: 'Starter',
      price: 'Free',
      period: '',
      popular: false,
      features: [
        'Up to 50K events/day',
        'Core pipeline (Kafka + Spark)',
        'Local or cloud deployment',
      ],
    },
    {
      name: 'Pro',
      price: '$29',
      period: '/month',
      popular: true,
      features: [
        'Up to 10M events/day',
        'Real-time streaming analytics',
        'Data quality & DLQ monitoring',
      ],
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      popular: false,
      features: [
        'Unlimited event throughput',
        'High availability & 99.99% SLAs',
        'Dedicated 24/7 engineer support',
      ],
    },
  ]

  return (
    <section id="docs" className="w-full py-12 md:py-20 scroll-mt-12 border-t border-white/[0.04]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

          {/* Left Card: Documentation (5 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-5 bg-[#0E0E12] rounded-3xl p-7 sm:p-9 border border-white/[0.08] shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#D4CEBF] text-[10px] font-bold tracking-widest uppercase mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E7D7BE]" />
                <span>DEVELOPER REFERENCE</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#F5F3EF] tracking-tight mb-3">
                Developer Friendly
              </h3>

              <p className="text-sm text-[#A39E93] leading-relaxed font-normal mb-8">
                Get started quickly with clear documentation, complete architecture records, and step-by-step installation guides.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              {docCards.map((d, i) => {
                const Icon = d.icon
                return (
                  <a
                    key={i}
                    href={d.href}
                    target={d.href.startsWith('http') ? '_blank' : undefined}
                    rel={d.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="bg-white/[0.02] hover:bg-white/[0.06] rounded-2xl p-4 border border-white/[0.06] hover:border-[#E7D7BE]/40 transition-all flex flex-col items-start group shadow-sm"
                  >
                    <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#E7D7BE] group-hover:scale-105 mb-2.5 transition-all">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs sm:text-sm font-bold text-[#F5F3EF] group-hover:text-[#E7D7BE] transition-colors">
                      {d.title}
                    </span>
                    <span className="text-[11px] text-[#A39E93] mt-0.5">
                      {d.sub}
                    </span>
                  </a>
                )
              })}
            </div>
          </motion.div>

          {/* Right Card: Pricing (7 cols) */}
          <motion.div
            id="pricing"
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-7 bg-[#0E0E12] rounded-3xl p-7 sm:p-9 border border-white/[0.08] shadow-xl flex flex-col justify-between scroll-mt-12"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#D4CEBF] text-[10px] font-bold tracking-widest uppercase mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E7D7BE]" />
                <span>TRANSPARENT TIERS</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-[#F5F3EF] tracking-tight mb-3">
                Simple & Transparent Pricing
              </h3>

              <p className="text-sm text-[#A39E93] leading-relaxed font-normal mb-8">
                Start prototyping for free on local Docker or Kubernetes, scale to millions of continuous events with dedicated infrastructure.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {pricingTiers.map((tier, i) => (
                <div
                  key={i}
                  className={`relative rounded-2xl p-4 sm:p-5 border flex flex-col justify-between transition-all ${
                    tier.popular
                      ? 'bg-[#14141A] border-[#E7D7BE] shadow-[0_0_25px_rgba(231,215,190,0.12)]'
                      : 'bg-white/[0.02] border-white/[0.06] hover:border-white/15'
                  }`}
                >
                  {tier.popular && (
                    <span className="absolute -top-3 right-4 px-2.5 py-0.5 rounded-full bg-[#E7D7BE] text-[#08080A] text-[9px] font-bold uppercase tracking-wider">
                      Most Popular
                    </span>
                  )}

                  <div>
                    <span className="text-xs font-semibold text-[#A39E93]">{tier.name}</span>
                    <div className="flex items-baseline gap-1 my-2">
                      <span className="text-2xl font-extrabold text-[#F5F3EF]">{tier.price}</span>
                      {tier.period && (
                        <span className="text-xs text-[#A39E93] font-medium">{tier.period}</span>
                      )}
                    </div>

                    <div className="space-y-2 mt-4 pt-3 border-t border-white/[0.06]">
                      {tier.features.map((feat, fi) => (
                        <div key={fi} className="flex items-start gap-2 text-xs text-[#D4CEBF]">
                          <Check className="w-3.5 h-3.5 text-[#E7D7BE] shrink-0 mt-0.5" />
                          <span className="leading-tight">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
