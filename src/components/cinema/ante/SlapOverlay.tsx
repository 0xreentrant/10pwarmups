import type { Deck } from "../../../types/domain"
import type { AnteRound } from "./useAnteRound"

export interface TappedCtx {
  round: AnteRound
  deck: Deck
  prevStreak: number
}

function missedMove(ctx: TappedCtx) {
  return ctx.round.drill.move.text
}

export function SlapOverlay(ctx: TappedCtx) {
  const { drill } = ctx.round
  return (
    <div className="tp-veil tp-veil--slap">
      <p className="tp-head tp-head--stamp">Tapped out</p>
      <p className="tp-cost">
        It was <strong>{missedMove(ctx)}</strong>.
        {ctx.prevStreak > 0 ? <> That tap ate a {ctx.prevStreak}-streak.</> : null}
      </p>
      <p className="tp-note">best run {drill.best} · streak {ctx.prevStreak}</p>
      <button type="button" className="tp-action" onClick={ctx.round.next}>
        Slap in - keep rolling
      </button>
    </div>
  )
}

export function TappedStyles() {
  return (
    <style>{`
      .tp-veil {
        position: absolute;
        inset: 0;
        z-index: 7;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 10px;
        padding: 18px 16px;
        text-align: center;
        background: rgba(4, 4, 6, 0.88);
        animation: tp-veil-in 260ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      .tp-veil--slap {
        justify-content: center;
        padding: 18px 16px;
        gap: 12px;
        background:
          linear-gradient(180deg, rgba(4, 4, 6, 0.55) 0%, rgba(4, 4, 6, 0.28) 48%, rgba(4, 4, 6, 0.72) 100%);
        animation: tp-veil-slap-in 380ms cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes tp-veil-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes tp-veil-slap-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .tp-head {
        font-family: var(--font-family-disp);
        font-weight: 800;
        font-size: 1.7rem;
        line-height: 1;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #fff0ee;
        text-shadow: 0 0 20px rgba(192, 57, 43, 0.9);
      }

      .tp-head--stamp {
        font-size: 2.15rem;
        letter-spacing: 0.05em;
        text-shadow:
          0 0 18px rgba(192, 57, 43, 1),
          0 0 48px rgba(192, 57, 43, 0.7),
          0 2px 0 rgba(0, 0, 0, 0.55);
        animation: tp-stamp 980ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }

      @keyframes tp-stamp {
        0% { opacity: 0; transform: scale(2.35) rotate(-16deg); }
        14% { opacity: 1; transform: scale(0.84) rotate(-9deg); }
        26% { transform: scale(1.18) rotate(-2deg); }
        38% { transform: scale(0.95) rotate(-6deg); }
        50% { transform: scale(1.06) rotate(-3deg); }
        62% { transform: translateX(-8px) scale(1) rotate(-5deg); }
        74% { transform: translateX(6px) scale(1) rotate(-3deg); }
        86% { transform: translateX(-3px) scale(1) rotate(-4deg); }
        100% { opacity: 1; transform: translateX(0) scale(1) rotate(-4deg); }
      }

      .tp-cost {
        font-size: 11px;
        line-height: 1.5;
        color: rgba(235, 238, 242, 0.85);
        max-width: 30ch;
        animation: tp-cost-in 420ms cubic-bezier(0.16, 1, 0.3, 1) 180ms both;
      }

      .tp-cost strong { color: #fff; }

      .tp-note {
        font-size: 9px;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: rgba(220, 228, 235, 0.55);
        animation: tp-cost-in 420ms cubic-bezier(0.16, 1, 0.3, 1) 260ms both;
      }

      @keyframes tp-cost-in {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .tp-action {
        font-family: var(--font-family-disp);
        font-weight: 800;
        font-size: 0.9rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #1a1206;
        background: #ffd9a0;
        border: 1px solid rgba(0, 0, 0, 0.4);
        padding: 13px 22px;
        margin-top: 4px;
        width: fit-content;
        max-width: 100%;
        box-shadow: 0 0 18px rgba(255, 170, 60, 0.45);
        transition: transform 160ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 160ms ease-out;
        animation: tp-action-in 480ms cubic-bezier(0.16, 1, 0.3, 1) 320ms both;
      }

      .tp-action:hover {
        transform: translateY(-1px);
        box-shadow: 0 0 26px rgba(255, 170, 60, 0.65);
      }

      .tp-action:active {
        transform: scale(0.97);
      }

      @keyframes tp-action-in {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @media (prefers-reduced-motion: reduce) {
        .tp-veil,
        .tp-veil--slap { animation: none; }
        .tp-head--stamp {
          animation: none;
          transform: rotate(-4deg);
        }
        .tp-cost,
        .tp-note,
        .tp-action { animation: none; }
        .tp-action { transition: none; }
      }
    `}</style>
  )
}
