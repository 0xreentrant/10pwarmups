import { ANTE_TOP_STAKE, type AnteRound } from "./useAnteRound"

/** Option buttons shared by every variant; the wrapping container owns layout. */
export function AnteOptions({ round }: { round: AnteRound }) {
  const { drill } = round
  return (
    <>
      {drill.options.map((opt, i) => {
        const revealed = drill.phase !== "asking"
        const cls = [
          "ao-option",
          revealed && opt.correct ? "ao-option--truth" : "",
          revealed && drill.picked === i && !opt.correct ? "ao-option--wrong" : "",
        ].filter(Boolean).join(" ")
        return (
          <button
            key={`${drill.moveIdx}-${i}`}
            type="button"
            className={cls}
            disabled={drill.phase !== "asking" || !round.live}
            onClick={() => round.answer(i)}
          >
            {opt.text}
          </button>
        )
      })}
    </>
  )
}

export function AnteCard({ round }: { round: AnteRound }) {
  const pending = Math.max(0, round.drill.total - round.card.length)
  return (
    <div className="ao-card">
      {round.card.map((mark, i) => <span key={i} className={`ao-mark ao-mark--${mark}`} />)}
      {Array.from({ length: pending }, (_, i) => (
        <span key={`pending-${i}`} className="ao-mark ao-mark--pending" />
      ))}
    </div>
  )
}

export function AnteDone({ round, line }: { round: AnteRound; line: string }) {
  const { drill, score, card } = round
  const ceiling = drill.total * ANTE_TOP_STAKE
  const blind = card.filter(m => m === ANTE_TOP_STAKE).length
  return (
    <div>
      <AnteBaseStyles />
      <fieldset>
        <legend>Settle up</legend>
        <p className="ao-total"><strong>{score}</strong><span className="ao-total-of">/{ceiling}</span></p>
        <AnteCard round={round} />
        <p className="text-xs mt-3 mb-1">
          <strong>{blind}</strong> called at full stake · longest run {drill.best} · {drill.misses} dropped.
        </p>
        <p className="text-[11px] text-muted mb-3">{line}</p>
        <button type="button" className="btn btn-primary" onClick={round.restart}>Ante up again</button>
      </fieldset>
    </div>
  )
}

export function AnteBaseStyles() {
  return (
    <style>{`
      .ao-option {
        display: block;
        width: 100%;
        text-align: left;
        font-family: var(--font-family-disp);
        font-weight: 700;
        font-size: 0.9rem;
        letter-spacing: 0.05em;
        text-transform: uppercase;
        color: var(--color-text);
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        padding: 11px 12px;
        transition: border-color 180ms ease-out, background 180ms ease-out, opacity 180ms ease-out;
      }

      .ao-option:disabled {
        cursor: default;
        opacity: 0.42;
        color: var(--color-muted);
        background: color-mix(in srgb, var(--color-surface) 50%, var(--color-bg));
        border-color: var(--color-border-subtle);
      }

      .ao-option:disabled:hover {
        background: color-mix(in srgb, var(--color-surface) 50%, var(--color-bg));
        border-color: var(--color-border-subtle);
      }

      .ao-option--truth {
        border-color: var(--color-green);
        background: color-mix(in srgb, var(--color-green) 22%, var(--color-surface));
      }

      .ao-option--wrong {
        border-color: var(--color-accent);
        background: color-mix(in srgb, var(--color-accent) 22%, var(--color-surface));
        text-decoration: line-through;
      }

      .ao-option--truth:disabled,
      .ao-option--truth:disabled:hover {
        opacity: 1;
        color: var(--color-text);
        border-color: var(--color-green);
        background: color-mix(in srgb, var(--color-green) 22%, var(--color-surface));
      }

      .ao-option--wrong:disabled,
      .ao-option--wrong:disabled:hover {
        opacity: 1;
        color: var(--color-text);
        border-color: var(--color-accent);
        background: color-mix(in srgb, var(--color-accent) 22%, var(--color-surface));
        text-decoration: line-through;
      }

      .ao-card {
        display: flex;
        gap: 3px;
        margin-top: 9px;
      }

      .ao-mark {
        flex: 1;
        height: 7px;
        background: var(--color-border);
      }

      .ao-mark--4 {
        background: #ffd9a0;
        box-shadow: 0 0 8px rgba(255, 170, 60, 0.75);
      }
      .ao-mark--3 { background: #f39c12; }
      .ao-mark--2 { background: var(--color-green); }
      .ao-mark--1 { background: #4a6a52; }
      .ao-mark--miss { background: var(--color-accent); }
      .ao-mark--clock {
        background: repeating-linear-gradient(135deg, #555 0 3px, #2a2a2a 3px 6px);
      }
      .ao-mark--pending { background: var(--color-border-subtle); }

      .ao-total {
        font-family: var(--font-family-disp);
        font-weight: 800;
        font-size: 2.2rem;
        line-height: 1;
      }

      .ao-total-of {
        font-size: 1rem;
        color: var(--color-muted);
      }

      .ao-hud {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        z-index: 5;
        display: flex;
        justify-content: space-between;
        padding: 7px 10px;
        font-size: 10px;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #fff;
        background: linear-gradient(180deg, rgba(0, 0, 0, 0.75), rgba(0, 0, 0, 0));
        pointer-events: none;
      }

      .ao-verdict {
        position: absolute;
        left: 50%;
        top: 44%;
        z-index: 6;
        font-family: var(--font-family-disp);
        font-weight: 800;
        font-size: 2rem;
        line-height: 1;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        white-space: nowrap;
        pointer-events: none;
      }

      .ao-verdict--hit {
        color: #f2fff7;
        text-shadow: 0 0 20px rgba(39, 174, 96, 0.95), 0 0 54px rgba(39, 174, 96, 0.45);
        animation: ao-hit 900ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      .ao-verdict--miss {
        color: #fff0ee;
        text-shadow: 0 0 20px rgba(192, 57, 43, 0.95), 0 0 50px rgba(192, 57, 43, 0.5);
        animation: ao-miss 920ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      @keyframes ao-hit {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(1.8); }
        22% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        100% { opacity: 0; transform: translate(-50%, -50%) scale(1.05); }
      }

      @keyframes ao-miss {
        0% { opacity: 0; transform: translate(-50%, -50%) scale(2.15) rotate(-14deg); }
        16% { opacity: 1; transform: translate(-50%, -50%) scale(0.88) rotate(-8deg); }
        28% { transform: translate(-50%, -50%) scale(1.14) rotate(-3deg); }
        40% { transform: translate(-50%, -50%) scale(0.97) rotate(-5deg); }
        52% { transform: translate(-50%, -50%) scale(1.04) rotate(-4deg); }
        64% { transform: translate(calc(-50% - 7px), -50%) scale(1) rotate(-5deg); }
        76% { transform: translate(calc(-50% + 5px), -50%) scale(1) rotate(-3deg); }
        100% { opacity: 0.94; transform: translate(-50%, -50%) scale(1) rotate(-4deg); }
      }

      @media (prefers-reduced-motion: reduce) {
        .ao-verdict--hit,
        .ao-verdict--miss {
          animation: none;
          opacity: 1;
          transform: translate(-50%, -50%) rotate(-4deg);
        }
      }
    `}</style>
  )
}

export function AnteVerdict({ round, buzzerWord = "Buzzer" }: { round: AnteRound; buzzerWord?: string }) {
  const { drill, paid } = round
  if (drill.phase === "correct") {
    return <span className="ao-verdict ao-verdict--hit" key={`hit-${drill.beat}`} aria-hidden>+{paid ?? 1}</span>
  }
  if (drill.phase === "wrong") {
    return (
      <span className="ao-verdict ao-verdict--miss" key={`miss-${drill.beat}`} aria-hidden>
        {drill.picked === null ? buzzerWord : "Busted"}
      </span>
    )
  }
  return null
}

export function AnteHud({ round }: { round: AnteRound }) {
  const { drill } = round
  return (
    <div className="ao-hud">
      <span>{drill.moveIdx + 1}<span style={{ opacity: 0.5 }}>/{drill.total}</span></span>
      <span aria-label={`Streak: ${drill.streak}`}>{drill.streak} streak</span>
    </div>
  )
}
