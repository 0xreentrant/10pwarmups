import "@fontsource/barlow-condensed/400.css"
import "@fontsource/barlow-condensed/600.css"
import "@fontsource/barlow-condensed/700.css"
import "@fontsource/barlow-condensed/800.css"
import "@fontsource/ibm-plex-mono/400.css"
import "@fontsource/ibm-plex-mono/500.css"
import "@fontsource/ibm-plex-mono/600.css"

export default function GlobalStyles() {
  return (
    <style>{`

      :root {
        --bg:        #0f0f0f;
        --surface:   #1a1a1a;
        --border:    #2e2e2e;
        --text:      #e8e8e8;
        --muted:     #666;
        --accent:    #c0392b;
        --green:     #27ae60;
        --partner-a:rgb(93, 226, 93);
        --partner-b: rgb(120, 165, 255);
        --font-disp: 'Barlow Condensed', sans-serif;
        --font-body: 'IBM Plex Mono', monospace;
      }

      *, *::before, *::after { box-sizing: border-box; }

      body {
        background: var(--bg);
        color: var(--text);
        font-family: var(--font-body);
        font-size: 13px;
        line-height: 1.5;
        margin: 0;
        -webkit-font-smoothing: antialiased;
      }

      h1, h2, h3, h4 {
        font-family: var(--font-disp);
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        line-height: 1.05;
        color: var(--text);
        margin: 0;
      }

      h1 { font-size: 2.4rem; }
      h2 { font-size: 1.5rem; }
      h3 { font-size: 1.2rem; }

      p { margin: 0; }

      button {
        margin: 0;
        padding: 0;
        border: none;
        background: none;
        font: inherit;
        color: inherit;
        cursor: pointer;
      }

      .btn {
        font-family: var(--font-disp);
        font-weight: 700;
        font-size: 1rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        background: var(--surface);
        color: var(--text);
        border: 1px solid var(--border);
        padding: 8px 14px;
        transition: background 0.1s, border-color 0.1s;
      }
      .btn:hover { background: #252525; border-color: #444; }
      .btn:active { background: #2e2e2e; }

      fieldset {
        border: 1px solid var(--border);
        padding: 12px 14px;
        margin: 0;
        background: var(--surface);
      }
      legend {
        font-family: var(--font-disp);
        font-weight: 700;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--muted);
        padding: 0 6px;
      }

      select {
        font-family: var(--font-body);
        font-size: 12px;
        background: var(--surface);
        color: var(--text);
        border: 1px solid var(--border);
        padding: 4px 8px;
      }

      table { border-collapse: collapse; }

      hr {
        border: none;
        border-top: 1px solid var(--border);
        margin: 16px 0;
      }

      progress {
        appearance: none;
        -webkit-appearance: none;
        height: 4px;
        width: 100%;
        background: var(--border);
        border: none;
        display: block;
      }
      progress::-webkit-progress-bar { background: var(--border); }
      progress::-webkit-progress-value { background: var(--accent); }
      progress::-moz-progress-bar { background: var(--accent); }

      .partner-a { color: var(--partner-a); }
      .partner-b { color: var(--partner-b); }

      .streak-badge {
        font-family: var(--font-disp);
        font-weight: 700;
        font-size: 1.1rem;
        letter-spacing: 0.06em;
        color: var(--accent);
      }

      .deck-id {
        font-family: var(--font-disp);
        font-weight: 800;
        font-size: 1rem;
        letter-spacing: 0.05em;
        color: var(--muted);
        min-width: 32px;
      }

      .deck-name {
        font-family: var(--font-disp);
        font-weight: 600;
        font-size: 1rem;
        letter-spacing: 0.02em;
      }

      .meta {
        font-size: 11px;
        color: var(--muted);
        margin-top: 2px;
      }

      .deck-link {
        display: inline-block;
        font-size: 11px;
        color: var(--muted);
        text-decoration: none;
        letter-spacing: 0.05em;
        margin-top: 2px;
      }
      .deck-link:hover {
        color: var(--accent);
        text-decoration: underline;
      }

      .series-heading {
        font-family: var(--font-disp);
        font-weight: 700;
        font-size: 0.7rem;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--muted);
        padding: 4px 0 6px;
        border-bottom: 1px solid var(--border);
        margin-bottom: 4px;
      }

      .btn-primary {
        background: var(--accent);
        color: #fff;
        border-color: var(--accent);
      }
      .btn-primary:hover { background: #a93226; border-color: #a93226; }

      .btn-ghost {
        background: transparent;
        border-color: transparent;
        color: var(--muted);
        padding: 6px 10px;
        font-size: 0.85rem;
      }
      .btn-ghost:hover { color: var(--text); background: transparent; }

      .option-btn {
        width: 100%;
        text-align: left;
        padding: 10px 14px;
        font-size: 0.95rem;
        border-color: var(--border);
        color: #fff;
      }
      .option-btn .partner-a,
      .option-btn .partner-b {
        color: #fff;
      }

      .move-row {
        display: flex;
        gap: 10px;
        padding: 3px 0;
        align-items: baseline;
        font-size: 12px;
      }
      .move-symbol { color: var(--muted); min-width: 14px; }
      .move-symbol.correct { color: var(--green); }
      .move-symbol.wrong   { color: var(--accent); }

      .move-label-btn {
        font-family: var(--font-body);
        font-size: 12px;
        font-weight: 400;
        letter-spacing: normal;
        text-transform: none;
        text-align: left;
      }
      .move-label-btn:hover .partner-a,
      .move-label-btn:hover .partner-b {
        text-decoration: underline;
      }

      .move-notes-backdrop {
        position: fixed;
        inset: 0;
        z-index: 100;
        background: rgba(0, 0, 0, 0.55);
      }

      .move-notes-popover {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 101;
        width: min(448px, calc(100vw - 32px));
        background: var(--surface);
        border: 1px solid var(--border);
        padding: 10px 12px;
        font-size: 12px;
      }
      .move-notes-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 6px;
      }
      .move-notes-title {
        font-family: var(--font-disp);
        font-weight: 700;
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .move-notes-close {
        background: none;
        border: none;
        padding: 0 2px;
        cursor: pointer;
        color: var(--muted);
        font-size: 1.1rem;
        line-height: 1;
        flex-shrink: 0;
      }
      .move-notes-close:hover {
        color: var(--text);
      }
      .move-notes-body {
        margin: 0;
        color: var(--muted);
        line-height: 1.5;
      }

      .stat-row td { padding: 4px 0; font-size: 12px; color: var(--muted); }
      .stat-row td:last-child { padding-left: 20px; color: var(--text); font-weight: 600; }

      .section-label {
        font-family: var(--font-disp);
        font-size: 0.65rem;
        font-weight: 700;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        color: var(--muted);
        margin-bottom: 8px;
        display: block;
      }

      .attempts-table th {
        font-family: var(--font-disp);
        font-size: 0.65rem;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--muted);
        font-weight: 600;
        padding: 6px 0;
        border-bottom: 1px solid var(--border);
      }
      .attempts-table th:not(:first-child) { padding-left: 14px; }
      .attempts-table td { padding: 5px 0; border-bottom: 1px solid #1e1e1e; font-size: 12px; }
      .attempts-table td:not(:first-child) { padding-left: 14px; }
      .attempts-table tr:first-child td { color: var(--text); }
      .attempts-table tr:not(:first-child) td { color: var(--muted); }
    `}</style>
  );
}
