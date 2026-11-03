import { useState } from 'react'
import { BackgroundGradients } from './components/BackgroundGradients'
import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { TechStack } from './components/TechStack'
import { ProblemSolution } from './components/ProblemSolution'
import { FeaturesGrid } from './components/FeaturesGrid'
import { HowItWorks } from './components/HowItWorks'
import { SystemArchitecture } from './components/SystemArchitecture'
import { ProductPreview } from './components/ProductPreview'
import { UseCasesAndReliability } from './components/UseCasesAndReliability'
import { DocsAndPricing } from './components/DocsAndPricing'
import { CtaBanner } from './components/CtaBanner'
import { Footer } from './components/Footer'
import { ArchitectureModal, GetStartedModal, ExploreModal } from './components/Modals'

export function App() {
  const [architectureModalOpen, setArchitectureModalOpen] = useState(false)
  const [getStartedModalOpen, setGetStartedModalOpen] = useState(false)
  const [exploreModalOpen, setExploreModalOpen] = useState(false)

  return (
    <div className="relative min-h-screen bg-[#08080A] text-[#F5F3EF] overflow-x-hidden selection:bg-[#E7D7BE] selection:text-[#08080A] w-full">
      {/* Background Organic Ambient Warm Blobs */}
      <BackgroundGradients />

      {/* 1. Navigation Bar */}
      <Navbar 
        onGetStartedClick={() => setGetStartedModalOpen(true)}
        onExploreClick={() => setExploreModalOpen(true)}
      />

      {/* Main Landing Page Flow */}
      <main className="flex flex-col w-full">
        {/* 2. Hero Section with Live 3D Particle Waveform & Telemetry */}
        <Hero 
          onGetStartedClick={() => setGetStartedModalOpen(true)}
          onExploreClick={() => setExploreModalOpen(true)}
        />

        {/* 3. Technology Stack (7 modern technologies) */}
        <TechStack />

        {/* 4. Problem vs Solution Comparison */}
        <ProblemSolution />

        {/* 5. Complete 8-card Features Grid */}
        <FeaturesGrid />

        {/* 6. How It Works (From Event to Insight 4-stage flow) */}
        <HowItWorks />

        {/* 7. System Architecture (Event Sources -> StreamForge Pipeline) */}
        <SystemArchitecture 
          onViewArchitecture={() => setArchitectureModalOpen(true)}
        />

        {/* 8. Interactive Product Preview & Live Recent Events Table */}
        <ProductPreview 
          onViewDashboard={() => setExploreModalOpen(true)}
        />

        {/* 9. Real-World Use Cases & Built for Production Reliability */}
        <UseCasesAndReliability />

        {/* 10. Developer Friendly Docs & Transparent Pricing Tiers */}
        <DocsAndPricing />

        {/* 11. Pre-Footer Dark CTA Banner */}
        <CtaBanner 
          onGetStarted={() => setGetStartedModalOpen(true)}
        />
      </main>

      {/* 12. Footer with Logo, Navigation Links, and Socials */}
      <Footer />

      {/* Interactive Modals */}
      <ArchitectureModal 
        isOpen={architectureModalOpen}
        onClose={() => setArchitectureModalOpen(false)}
      />
      <GetStartedModal 
        isOpen={getStartedModalOpen}
        onClose={() => setGetStartedModalOpen(false)}
      />
      <ExploreModal 
        isOpen={exploreModalOpen}
        onClose={() => setExploreModalOpen(false)}
      />
    </div>
  )
}

export default App
