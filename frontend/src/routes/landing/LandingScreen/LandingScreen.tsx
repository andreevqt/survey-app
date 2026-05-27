import { LandingNav } from '../LandingNav';
import { LandingHero } from '../LandingHero';
import { LandingTryIt } from '../LandingTryIt';
import { LandingFeatures } from '../LandingFeatures';
import { LandingStats } from '../LandingStats';
import { LandingCTA } from '../LandingCTA';

export function LandingScreen() {
  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @keyframes lrc-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgb(22 163 74 / 0.6); }
          50%      { box-shadow: 0 0 0 6px rgb(22 163 74 / 0); }
        }
        .feature-card { transition: transform 200ms ease, border-color 200ms ease; }
        .feature-card:hover {
          transform: translateY(-2px);
          border-color: var(--indigo-300, #a5b4fc) !important;
        }
        @media (max-width: 880px) {
          .hero-grid, .try-grid { grid-template-columns: 1fr !important; }
          .hero-stack { height: 440px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .feature-card { transition: none; }
          .feature-card:hover { transform: none; }
        }
      `}</style>
      <LandingNav />
      <LandingHero />
      <LandingTryIt />
      <LandingFeatures />
      <LandingStats />
      <LandingCTA />
    </div>
  );
}
