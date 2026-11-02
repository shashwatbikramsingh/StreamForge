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
    <section id="docs" className="w-full px-4 sm:px-6 lg:px-8 py-1 md:py-1.5 scroll-mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left Card: Documentation (5 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-neutral-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] flex flex-col justify-between"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF3EA] border border-[#FED7AA]/70 text-[#9A3412] text-xs font-semibold mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]" />
              Documentation
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold text-[#111827] tracking-tight mb-2">
              Developer Friendly
            </h3>

            <p className="text-xs sm:text-[13px] text-neutral-500 leading-relaxed font-normal mb-6">
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
                  className="bg-neutral-50/70 hover:bg-orange-50/50 rounded-2xl p-3 border border-neutral-100 hover:border-orange-200 transition-all flex flex-col items-start group"
                >
                  <div className="w-8 h-8 rounded-lg bg-white border border-neutral-200/80 flex items-center justify-center text-neutral-700 group-hover:text-[#EA580C] group-hover:border-orange-200 mb-2 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-neutral-900 group-hover:text-[#EA580C] transition-colors">
                    {d.title}
                  </span>
                  <span className="text-[10px] text-neutral-400 mt-0.5">
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
          className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-neutral-100 shadow-[0_8px_30px_rgba(234,88,12,0.04)] flex flex-col justify-between scroll-mt-6"
        >
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF3EA] border border-[#FED7AA]/70 text-[#9A3412] text-xs font-semibold mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C]" />
              Pricing
            </div>

            <h3 className="text-xl sm:text-2xl font-extrabold text-[#111827] tracking-tight mb-2">
              Simple & Transparent Pricing
            </h3>

            <p className="text-xs sm:text-[13px] text-neutral-500 leading-relaxed font-normal mb-6">
              Start for free, scale as you grow.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {pricingTiers.map((tier, i) => (
              <div 
                key={i}
                className={`relative rounded-2xl p-3.5 border flex flex-col justify-between ${
                  tier.popular
                    ? 'bg-orange-50/40 border-[#EA580C] shadow-sm'
                    : 'bg-neutral-50/70 border-neutral-100'
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-[#EA580C] text-white text-[8px] font-bold uppercase tracking-wider">
                    Most Popular
                  </span>
                )}

                <div>
                  <span className="text-[11px] font-semibold text-neutral-500">{tier.name}</span>
                  <div className="flex items-baseline gap-1 my-1">
                    <span className="text-lg font-extrabold text-neutral-900">{tier.price}</span>
                    {tier.period && (
                      <span className="text-[10px] text-neutral-400 font-medium">{tier.period}</span>
                    )}
                  </div>

                  <div className="space-y-1.5 mt-2.5 pt-2 border-t border-neutral-200/60">
                    {tier.features.map((feat, fi) => (
                      <div key={fi} className="flex items-start gap-1.5 text-[9.5px] text-neutral-600">
                        <Check className="w-3 h-3 text-[#EA580C] shrink-0 mt-0.5" />
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
