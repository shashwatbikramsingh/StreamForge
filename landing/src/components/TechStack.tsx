import React from 'react'
import { motion } from 'framer-motion'

// Authentic SVG icons for the 7 technologies
const PythonIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 110 110">
    <path fill="#387EB8" d="M54.5 10.4c-24 0-22.5 10.4-22.5 10.4l.03 10.8h22.8v3.3H23.1s-14.8 1.7-14.8 21.6c0 19.9 12.9 20.8 12.9 20.8h7.7v-10.8s-.4-12.9 12.7-12.9h22s12.2-.2 12.2-11.9v-20.2s1.7-10.8-21.3-10.8zM42.1 17.2c2.2 0 4 1.8 4 4s-1.8 4-4 4-4-1.8-4-4 1.8-4 4-4z" />
    <path fill="#FFE052" d="M55.5 99.6c24 0 22.5-10.4 22.5-10.4l-.03-10.8H55.2v-3.3h31.7s14.8-1.7 14.8-21.6c0-19.9-12.9-20.8-12.9-20.8h-7.7v10.8s.4 12.9-12.7 12.9h-22s-12.2.2-12.2 11.9v20.2s-1.7 10.8 21.3 10.8zm12.4-6.8c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z" />
  </svg>
)

const KafkaIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 100 100">
    <circle cx="26" cy="50" r="11" fill="#F5F3EF" />
    <circle cx="74" cy="24" r="9" fill="#F5F3EF" />
    <circle cx="74" cy="76" r="9" fill="#F5F3EF" />
    <path d="M26 50 L74 24" stroke="#F5F3EF" strokeWidth="5" strokeLinecap="round" />
    <path d="M26 50 L74 76" stroke="#F5F3EF" strokeWidth="5" strokeLinecap="round" />
  </svg>
)

const SparkIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 100 100">
    <path fill="#E25A1C" d="M50 8 L59 34 L86 34 L64 51 L72 78 L50 61 L28 78 L36 51 L14 34 L41 34 Z" />
    <circle cx="50" cy="48" r="9" fill="#FBBF24" />
  </svg>
)

const PostgresIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 100 100">
    <path fill="#336791" d="M50 14 C28 14 18 28 18 46 C18 64 26 80 39 86 C41 83 42 78 42 74 C37 72 33 67 33 59 C33 49 41 44 50 44 C59 44 67 49 67 59 C67 67 63 72 58 74 C58 78 59 83 61 86 C74 80 82 64 82 46 C82 28 72 14 50 14 Z" />
    <circle cx="41" cy="40" r="3" fill="#FFFFFF" />
    <circle cx="59" cy="40" r="3" fill="#FFFFFF" />
  </svg>
)

const FastAPIIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="46" fill="#059669" />
    <path d="M52 18 L26 54 L48 54 L44 82 L74 46 L52 46 Z" fill="#FFFFFF" />
  </svg>
)

const DockerIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 100 100">
    <path fill="#0284C7" d="M88 48 C82 48 76 52 74 58 C68 56 60 58 56 62 C34 62 24 72 20 84 C42 86 64 86 86 74 C90 68 94 56 88 48 Z" />
    <rect x="24" y="44" width="7" height="6" rx="1" fill="#0284C7" />
    <rect x="33" y="44" width="7" height="6" rx="1" fill="#0284C7" />
    <rect x="42" y="44" width="7" height="6" rx="1" fill="#0284C7" />
    <rect x="33" y="36" width="7" height="6" rx="1" fill="#0284C7" />
    <rect x="42" y="36" width="7" height="6" rx="1" fill="#0284C7" />
    <rect x="51" y="36" width="7" height="6" rx="1" fill="#0284C7" />
    <rect x="51" y="44" width="7" height="6" rx="1" fill="#0284C7" />
  </svg>
)

const ReactIcon = () => (
  <svg className="w-6 h-6" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="8" fill="#06B6D4" />
    <ellipse cx="50" cy="50" rx="38" ry="14" fill="none" stroke="#06B6D4" strokeWidth="3" transform="rotate(0 50 50)" />
    <ellipse cx="50" cy="50" rx="38" ry="14" fill="none" stroke="#06B6D4" strokeWidth="3" transform="rotate(60 50 50)" />
    <ellipse cx="50" cy="50" rx="38" ry="14" fill="none" stroke="#06B6D4" strokeWidth="3" transform="rotate(120 50 50)" />
  </svg>
)

export const TechStack: React.FC = () => {
  const technologies = [
    { name: 'Python', icon: PythonIcon },
    { name: 'Kafka', icon: KafkaIcon },
    { name: 'Spark', icon: SparkIcon },
    { name: 'PostgreSQL', icon: PostgresIcon },
    { name: 'FastAPI', icon: FastAPIIcon },
    { name: 'Docker', icon: DockerIcon },
    { name: 'React', icon: ReactIcon },
  ]

  return (
    <section className="w-full px-4 sm:px-6 lg:px-8 py-2 md:py-3">
      {/* Centered Pill Badge */}
      <div className="flex justify-center mb-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[#D4CEBF] text-[10px] font-bold tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-[#E7D7BE]" />
          <span>POWERED BY MODERN DATA INFRASTRUCTURE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left Heading & Copy */}
        <div className="lg:col-span-4 text-left">
          <h2 className="text-xl sm:text-2xl font-extrabold text-[#F5F3EF] tracking-tight mb-1.5">
            Our Technology Stack
          </h2>
          <p className="text-xs sm:text-[13px] text-[#A39E93] leading-relaxed font-normal">
            A reliable, scalable, and modern data engineering stack built for real-time event processing.
          </p>
        </div>

        {/* Right 7 Tech Cards Row in Dark Obsidian Glass */}
        <div className="lg:col-span-8 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
          <div className="flex items-center justify-between gap-2.5 min-w-[540px]">
            {technologies.map((tech, idx) => {
              const Icon = tech.icon
              return (
                <motion.div
                  key={tech.name}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  whileHover={{ y: -2, scale: 1.02 }}
                  className="flex-1 bg-[#0E0E12]/90 rounded-2xl p-3 sm:p-3.5 border border-white/[0.08] hover:border-[#E7D7BE]/40 hover:bg-[#14141A] transition-all flex flex-col items-center justify-center text-center cursor-default group shadow-sm"
                >
                  <div className="w-8 h-8 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                    <Icon />
                  </div>
                  <span className="text-[11px] font-bold text-[#E4DFD5] group-hover:text-[#E7D7BE] transition-colors">
                    {tech.name}
                  </span>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
