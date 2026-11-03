import React from 'react'

export const BackgroundGradients: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-20 select-none bg-[#08080A]">
      {/* Top center subtle champagne ambient haze */}
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[550px] rounded-full blur-[140px] opacity-25 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(231, 215, 190, 0.35) 0%, rgba(234, 88, 12, 0.12) 45%, transparent 75%)'
        }}
      />

      {/* Mid-left dark ember glow */}
      <div
        className="absolute top-[35%] -left-48 w-[650px] h-[650px] rounded-full blur-[160px] opacity-15 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(234, 88, 12, 0.28) 0%, transparent 70%)'
        }}
      />

      {/* Mid-right champagne highlight glow */}
      <div
        className="absolute top-[58%] -right-48 w-[700px] h-[700px] rounded-full blur-[170px] opacity-15 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(231, 215, 190, 0.25) 0%, transparent 70%)'
        }}
      />

      {/* Subtle fine grid texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.6) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }}
      />
    </div>
  )
}
