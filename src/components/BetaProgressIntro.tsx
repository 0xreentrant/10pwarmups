interface BetaProgressIntroProps {
  onComplete: () => void
}

export default function BetaProgressIntro({ onComplete }: BetaProgressIntroProps) {
  return (
    <>
      <BetaProgressIntroStyles />
      <div className="bt-progress-intro" role="dialog" aria-label="Learn the warmups">
        <span className="bt-progress-intro-stamp">Learn the warmups</span>
        <p className="bt-progress-intro-body">
          Track your progress learning the warmups. Review first, then use training mode to test your preparation.
        </p>
        <p className="bt-progress-intro-flow">Review → Train</p>
        <button type="button" className="bt-progress-intro-ok" onClick={onComplete}>
          OK
        </button>
      </div>
    </>
  )
}

function BetaProgressIntroStyles() {
  return (
    <style>{`
      .bt-progress-intro {
        position: fixed;
        inset: 0;
        z-index: 50;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 16px;
        padding: 24px 20px;
        text-align: center;
        background: rgba(4, 4, 6, 0.88);
        animation: bt-progress-intro-in 280ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      .bt-progress-intro-stamp {
        font-family: var(--font-family-disp);
        font-weight: 800;
        font-size: clamp(2rem, 10vw, 2.75rem);
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #fff;
        border: 3px solid #fff;
        padding: 8px 16px;
        transform: rotate(-3deg);
        line-height: 1;
        animation: bt-progress-intro-stamp-in 320ms cubic-bezier(0.16, 1, 0.3, 1) both;
      }

      .bt-progress-intro-body {
        margin: 0;
        max-width: 32ch;
        font-family: var(--font-family-body);
        font-size: 15px;
        line-height: 1.45;
        color: rgba(232, 232, 232, 0.92);
      }

      .bt-progress-intro-flow {
        margin: 0;
        font-family: var(--font-family-disp);
        font-weight: 700;
        font-size: 0.82rem;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--color-accent);
      }

      .bt-progress-intro-ok {
        margin-top: 8px;
        font-family: var(--font-family-disp);
        font-weight: 800;
        font-size: 1rem;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--color-text-on-accent);
        background: var(--color-accent);
        border: 1px solid var(--color-accent);
        padding: 12px 32px;
        line-height: 1;
      }

      .bt-progress-intro-ok:focus-visible {
        outline: 2px solid #fff;
        outline-offset: 3px;
      }

      @keyframes bt-progress-intro-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes bt-progress-intro-stamp-in {
        from { opacity: 0; transform: translateY(8px) rotate(-3deg); }
        to { opacity: 1; transform: rotate(-3deg); }
      }

      @media (prefers-reduced-motion: reduce) {
        .bt-progress-intro,
        .bt-progress-intro-stamp { animation: none; }
      }
    `}</style>
  )
}
