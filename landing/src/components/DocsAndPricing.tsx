import React from 'react'
import { motion } from 'framer-motion'
import { FileCode, BookOpen, Layers, Check } from 'lucide-react'
import { GithubIcon } from './SocialIcons'

export const DocsAndPricing: React.FC = () => {
  const docCards = [
    { title: 'GitHub', sub: 'Source Code', icon: GithubIcon, href: 'https://github.com/shashwatbikramsingh/StreamForge' },
    { title: 'API Docs', sub: 'Endpoints & Usage', icon: FileCode, href: '#api' },
    { title: 'Setup Guide', sub: 'Install & Run', icon: BookOpen, href: '#setup' },
    { title: 'Architecture', sub: 'Design & Decisions', icon: Layers, href: '#architecture' },
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
        'Real-time analytics',
        'Data quality & monitoring',
      ],
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      popular: false,
      features: [
        'Unlimited event throughput',
        'High availability & SLAs',
        'Dedicated support',
      ],
    },
  ]

  return (
    <section id="docs" className="w-full px-4 sm:px-6 lg:px-8 py-2 md:py-3 scroll-mt-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Card: Documentation (5 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-5 bg-[#0E0E12]/90 rounded-3xl p-6 sm:p-7 border border-white/[0.08] shadow-xl flex flex-col justify-between"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#D4CEBF] text-[10px] font-bold tracking-widest uppercase mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E7D7BE]" />
              <span>Developer Reference</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold text-[#F5F3EF] tracking-tight mb-2">
              Developer Friendly
            </h3>

            <p className="text-xs sm:text-[13px] text-[#A39E93] leading-relaxed font-normal mb-6">
              Get started quickly with clear docs, architecture, and guides.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {docCards.map((d, i) => {
              const Icon = d.icon
              return (
                <a
                  key={i}
                  href={d.href}
                  className="bg-white/[0.02] hover:bg-white/[0.06] rounded-2xl p-3.5 border border-white/[0.06] hover:border-[#E7D7BE]/40 transition-all flex flex-col items-start group shadow-2xs"
                >
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#E7D7BE] group-hover:scale-105 mb-2 transition-all">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-[#F5F3EF] group-hover:text-[#E7D7BE] transition-colors">
                    {d.title}
                  </span>
                  <span className="text-[10px] text-[#A39E93] mt-0.5">
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
          className="lg:col-span-7 bg-[#0E0E12]/90 rounded-3xl p-6 sm:p-7 border border-white/[0.08] shadow-xl flex flex-col justify-between scroll-mt-12"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#D4CEBF] text-[10px] font-bold tracking-widest uppercase mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E7D7BE]" />
              <span>Transparent Tiers</span>
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold text-[#F5F3EF] tracking-tight mb-2">
              Simple & Transparent Pricing
            </h3>

            <p className="text-xs sm:text-[13px] text-[#A39E93] leading-relaxed font-normal mb-6">
              Start for free, scale as you grow.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {pricingTiers.map((tier, i) => (
              <div 
                key={i}
                className={`relative rounded-2xl p-3.5 border flex flex-col justify-between ${
                  tier.popular
                    ? 'bg-[#14141A] border-[#E7D7BE] shadow-[0_0_20px_rgba(231,215,190,0.12)]'
                    : 'bg-white/[0.02] border-white/[0.06]'
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-[#E7D7BE] text-[#08080A] text-[8px] font-bold uppercase tracking-wider">
                    Most Popular
                  </span>
                )}

                <div>
                  <span className="text-[11px] font-semibold text-[#A39E93]">{tier.name}</span>
                  <div className="flex items-baseline gap-1 my-1">
                    <span className="text-lg font-extrabold text-[#F5F3EF]">{tier.price}</span>
                    {tier.period && (
                      <span className="text-[10px] text-[#A39E93] font-medium">{tier.period}</span>
                    )}
                  </div>

                  <div className="space-y-1.5 mt-2.5 pt-2 border-t border-white/[0.06]">
                    {tier.features.map((feat, fi) => (
                      <div key={fi} className="flex items-start gap-1.5 text-[9.5px] text-[#D4CEBF]">
                        <Check className="w-3 h-3 text-[#E7D7BE] shrink-0 mt-0.5" />
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
    </section>
  )
}
