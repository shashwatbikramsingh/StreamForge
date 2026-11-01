import React from 'react'

export const BackgroundGradients: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10 select-none">
      {/* Top right organic curved warm wave (visible in reference screenshot) */}
      <svg 
        className="absolute -top-16 -right-20 w-[600px] h-[600px] lg:w-[750px] lg:h-[750px] opacity-80"
        viewBox="0 0 600 600" 
        fill="none"
      >
        <path 
          d="M250,0 C420,0 600,180 600,380 C600,480 520,580 400,560 C260,540 320,380 220,320 C120,260 0,320 0,180 C0,60 120,0 250,0 Z" 
          fill="url(#topRightPeach)" 
        />
        <defs>
          <linearGradient id="topRightPeach" x1="600" y1="0" x2="100" y2="500" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FEE6D5" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#FFF1E6" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FFF9F5" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Middle-left organic curved warm wave (visible in reference screenshot) */}
      <svg 
        className="absolute top-[32%] -left-28 w-[500px] h-[650px] opacity-75"
        viewBox="0 0 500 650" 
        fill="none"
      >
        <path 
          d="M0,80 C180,60 260,180 240,320 C220,460 120,540 0,600 Z" 
          fill="url(#midLeftPeach)" 
        />
        <defs>
          <linearGradient id="midLeftPeach" x1="0" y1="200" x2="300" y2="400" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FEE4D1" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#FFF2E8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FFFDF9" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Bottom-right organic curved warm wave (visible in reference screenshot) */}
      <svg 
        className="absolute -bottom-24 -right-24 w-[580px] h-[580px] opacity-80"
        viewBox="0 0 580 580" 
        fill="none"
      >
        <path 
          d="M580,200 C580,380 440,580 260,580 C120,580 180,420 280,340 C380,260 480,240 580,200 Z" 
          fill="url(#bottomRightPeach)" 
        />
        <defs>
          <linearGradient id="bottomRightPeach" x1="580" y1="580" x2="200" y2="200" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FEE6D6" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#FFF3EA" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#FFFDF9" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Bottom-left soft warm accent */}
      <div 
        className="absolute -bottom-10 left-[5%] w-[400px] h-[400px] rounded-full blur-[80px] opacity-40"
        style={{
          background: 'radial-gradient(circle, rgba(254, 215, 170, 0.4) 0%, transparent 70%)'
        }}
      />
    </div>
  )
}
