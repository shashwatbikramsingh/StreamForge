import React from 'react'

export const GithubIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
  </svg>
)

export const LinkedinIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.65 1.65 0 1 0 0-3.3 1.65 1.65 0 0 0 0 3.3m1.4 9.74V10.13H5.06v8.37h2.8z" />
  </svg>
)

export const XTwitterIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

export const StreamForgeHexagonLogo: React.FC<{ className?: string }> = ({ className = 'w-6 h-6' }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none">
    {/* Isometric 3D Hexagon from the design mockup */}
    <path d="M24 4 L42 14.5 L24 25 L6 14.5 Z" fill="#FB923C" />
    <path d="M42 14.5 L42 34.5 L24 45 L24 25 Z" fill="#C2410C" />
    <path d="M6 14.5 L24 25 L24 45 L6 34.5 Z" fill="#EA580C" />
    {/* Inner faceted cut-out */}
    <path d="M24 15 L32 19.8 L24 24.6 L16 19.8 Z" fill="#08080A" opacity="0.9" />
    <path d="M32 19.8 L32 28.5 L24 33.3 L24 24.6 Z" fill="#0E0E14" opacity="0.8" />
    <path d="M16 19.8 L24 24.6 L24 33.3 L16 28.5 Z" fill="#14141A" opacity="0.85" />
  </svg>
)

export const KafkaLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 100 100" fill="currentColor">
    <circle cx="26" cy="50" r="11" fill="currentColor" />
    <circle cx="74" cy="24" r="9" fill="currentColor" />
    <circle cx="74" cy="76" r="9" fill="currentColor" />
    <path d="M26 50 L74 24" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    <path d="M26 50 L74 76" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
  </svg>
)

export const PostgresLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
  </svg>
)

export const DockerLogo: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.98 11.08h2.04v2.04h-2.04zm-2.55 0h2.04v2.04h-2.04zm-2.55 0h2.04v2.04H8.88zm-2.55 0h2.04v2.04H6.33zm5.1-2.55h2.04v2.04h-2.04zm-2.55 0h2.04v2.04H8.88zm-2.55 0h2.04v2.04H6.33zm5.1-2.55h2.04v2.04h-2.04zm-2.55 0h2.04v2.04H8.88zM22.5 13.5c-.38-.28-1.54-.36-2.39.24-.13-1.02-.77-1.92-1.72-2.32l-.44-.19-.3.37c-.63.78-.96 1.77-.96 2.78 0 .43.06.86.19 1.28H1.5c-.28 0-.5.22-.5.5 0 2.22.9 4.3 2.5 5.8 1.55 1.45 3.63 2.25 5.8 2.25 6.06 0 11.16-4.5 12.06-10.5.56-.05 1.14-.14 1.64-.42l.5-.29-.5-.4z"/>
  </svg>
)

