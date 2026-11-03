import React, { useEffect, useRef } from 'react'

export const ParticleTerrain: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId: number
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth)
    let height = (canvas.height = canvas.parentElement?.clientHeight || 550)

    const handleResize = () => {
      if (!canvas) return
      width = canvas.width = canvas.parentElement?.clientWidth || window.innerWidth
      height = canvas.height = canvas.parentElement?.clientHeight || 550
    }

    window.addEventListener('resize', handleResize)

    // Grid configuration for 3D perspective terrain
    const cols = 75
    const rows = 45
    let time = 0
    let mouseX = 0
    let mouseY = 0
    let targetMouseX = 0
    let targetMouseY = 0

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left) / width - 0.5
      const y = (e.clientY - rect.top) / height - 0.5
      targetMouseX = x * 80
      targetMouseY = y * 40
    }

    window.addEventListener('mousemove', handleMouseMove)

    const render = () => {
      time += 0.015
      mouseX += (targetMouseX - mouseX) * 0.05
      mouseY += (targetMouseY - mouseY) * 0.05

      ctx.clearRect(0, 0, width, height)

      // Dynamic 3D perspective camera coordinates
      const fov = 340
      const originX = width / 2 + mouseX
      const originY = height * 0.42 + mouseY

      for (let r = 0; r < rows; r++) {
        const z = (r + 1) * 16 // Distance into screen

        // Projected scale factor for perspective
        const scale = fov / (fov + z)
        const alpha = Math.min(1, Math.max(0, (r / rows) * 1.2)) * (1 - r / (rows + 15))

        for (let c = 0; c < cols; c++) {
          const xWorld = (c - cols / 2) * 26

          // Multi-frequency wave calculation creating rich mountain peaks and valleys
          const wave1 = Math.sin(c * 0.14 + time * 1.2) * Math.cos(r * 0.12 + time * 0.8) * 45
          const wave2 = Math.sin(c * 0.08 - time * 0.6) * Math.sin(r * 0.15 + time * 1.0) * 35
          const wave3 = Math.cos((c + r) * 0.06 + time * 0.9) * 25

          // Peak elevation shaping: higher in middle-back, tapering to sides
          const centerWeight = Math.sin((c / cols) * Math.PI) * Math.sin((r / rows) * Math.PI)
          const yWorld = 40 - (wave1 + wave2 + wave3) * centerWeight * 1.5

          // 3D to 2D projection
          const screenX = originX + xWorld * scale
          const screenY = originY + (yWorld + z * 0.32) * scale

          // Dot size scaling with perspective
          const dotRadius = Math.max(0.6, 2.2 * scale)

          // Shading: highlights on crests, deeper gold in valleys
          const elevationNorm = (wave1 + wave2 + wave3) / 105 // -1 to 1
          const rCol = Math.round(231 + elevationNorm * 24)
          const gCol = Math.round(215 + elevationNorm * 20)
          const bCol = Math.round(190 + elevationNorm * 15)

          ctx.beginPath()
          ctx.arc(screenX, screenY, dotRadius, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${rCol}, ${gCol}, ${bCol}, ${Math.max(0.08, alpha * 0.85)})`
          ctx.fill()
        }
      }

      animationFrameId = requestAnimationFrame(render)
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  return (
    <div className="absolute inset-x-0 bottom-0 top-[15%] pointer-events-none overflow-hidden select-none -z-10">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full opacity-90 transition-opacity duration-1000"
      />
      {/* Subtle bottom gradient to feather into the next section */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#08080A] via-[#08080A]/60 to-transparent pointer-events-none" />
      {/* Top subtle vignette */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#08080A] via-[#08080A]/40 to-transparent pointer-events-none" />
    </div>
  )
}

