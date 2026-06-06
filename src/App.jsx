import { useState, useEffect } from "react";

// ─── GLOBAL STYLES ───────────────────────────────────────────────────────────

function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

      :root {
        --bg:        #0f0f0f;
        --surface:   #1a1a1a;
        --border:    #2e2e2e;
        --text:      #e8e8e8;
        --muted:     #666;
        --accent:    #c0392b;
        --green:     #27ae60;
        --partner-a:rgb(93, 226, 93);
        --partner-b:rgb(41, 54, 240);
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
        font-family: var(--font-disp);
        font-weight: 700;
        font-size: 1rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        background: var(--surface);
        color: var(--text);
        border: 1px solid var(--border);
        padding: 8px 14px;
        cursor: pointer;
        transition: background 0.1s, border-color 0.1s;
      }
      button:hover { background: #252525; border-color: #444; }
      button:active { background: #2e2e2e; }

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

      .partner-key {
        display: flex;
        gap: 16px;
        font-family: var(--font-disp);
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .partner-key-item {
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .partner-key-swatch {
        width: 8px;
        height: 8px;
        flex-shrink: 0;
      }
      .partner-key-swatch.a { background: var(--partner-a); }
      .partner-key-swatch.b { background: var(--partner-b); }

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

      .last-move-label {
        font-size: 11px;
        color: var(--muted);
        text-transform: uppercase;
        letter-spacing: 0.1em;
        font-family: var(--font-disp);
        font-weight: 600;
        margin-bottom: 4px;
      }
      .last-move-value {
        font-size: 1.05rem;
        font-family: var(--font-disp);
        font-weight: 700;
        letter-spacing: 0.02em;
        margin-bottom: 12px;
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

// ─── DATA ────────────────────────────────────────────────────────────────────
// Each move: { text: string, partner: "A" | "B" }
// Partner B moves shown in red

const SERIES = [
  { id: "A", name: "Granbys" },
  { id: "B", name: "Sit-Ups & Takedowns" },
  { id: "C", name: "Guard Passing" },
  { id: "D", name: "Leg Locks" },
  { id: "E", name: "Half Guard" },
  { id: "F", name: "Lockdown" },
  { id: "G", name: "Side Control" },
  { id: "H", name: "De La Riva" },
];

function m(text, partner) { return { text, partner }; }

const DECKS = [
  {
    id: "A1", series: "A", name: "Kneeling → Granby Flow",
    moves: [
      m("Kneeling Granby", "A"),
      m("Seated Granby", "A"),
      m("Bridging Granby", "A"),
      m("Belly to Belly Granby", "A"),
      m("Granby Flow", "A"),
    ]
  },
  {
    id: "A2", series: "A", name: "Standing Knee Slice",
    moves: [
      m("Standing Knee Slice", "A"),
      m("¼ Z", "B"),
      m("Flying Twister Pass", "A"),
      m("Twister Side", "A"),
      m("III", "B"),
      m("Granby", "B"),
      m("Underpass", "A"),
      m("Granby", "B"),
      m("Underpass", "A"),
      m("Granby", "B"),
      m("Chemtrails", "A"),
      m("Banana Split", "A"),
      m("Defend", "B"),
      m("Baseball Bat", "A"),
      m("Marsh", "B"),
      m("Shoulder Hook", "A"),
      m("RNC", "A"),
      m("Leg Press", "B"),
      m("Body Triangle", "A"),
      m("Straight Jacket", "A"),
      m("2 x 1-Arm Finish", "A"),
      m("Weak Side RNC", "A"),
      m("Leg Press", "B"),
      m("Preweb", "A"),
      m("Spiderweb", "A"),
      m("Long Defense", "B"),
      m("Triangle/Armbar", "A"),
      m("Last Resort Escape", "B"),
      m("Attack Mode", "B"),
      m("Crotch Ripper", "B"),
      m("3 Calf Cranks", "B"),
    ]
  },
  {
    id: "A3", series: "A", name: "Stalk → Twister",
    moves: [
      m("Stalk", "A"),
      m("Reach", "B"),
      m("Russian", "A"),
      m("Post", "B"),
      m("Shoot", "A"),
      m("Sprawl", "B"),
      m("Peak Out", "A"),
      m("III", "B"),
      m("Seat Belt", "A"),
      m("Body Lock", "A"),
      m("Granby", "B"),
      m("Seatbelt", "B"),
      m("Body Lock", "B"),
      m("Switch", "A"),
      m("Seatbelt", "A"),
      m("Trapped Arm RNC", "A"),
      m("Leg Press", "B"),
      m("Body Triangle", "A"),
      m("Straight Jacket", "A"),
      m("2 x 1-Arm Finishes", "A"),
      m("Weak Side RNC", "A"),
      m("Leg Press", "B"),
      m("Buck", "A"),
      m("Shoulder Hook", "A"),
      m("Marsh", "B"),
      m("Bolt Cutter", "A"),
      m("Baseball Bat", "A"),
      m("New Final 3", "A"),
      m("Twister", "A"),
    ]
  },
  {
    id: "A4", series: "A", name: "Inverted Guard → Safe Haven",
    moves: [
      m("Cross Wrist Control", "A"),
      m("Inverted Guard", "A"),
      m("The Clamp", "A"),
      m("Cauliflower Ear Escape", "B"),
      m("III", "B"),
      m("Reverse Knee on Belly", "B"),
      m("Wheel Kick Mount", "A"),
      m("Skydive", "A"),
      m("Under Jack", "B"),
      m("Head & Armpit Control", "B"),
      m("Chopping Block", "A"),
      m("Combover", "A"),
      m("Defcon 4", "B"),
      m("Butter Mount Arm Triangle", "A"),
      m("The Impaler Arm Triangle", "A"),
      m("Arm Triangle Defense", "A"),
      m("Back Attack", "B"),
      m("Safe Haven Escape", "A"),
    ]
  },
  {
    id: "B1", series: "B", name: "Black Mamba → Calf Cranks",
    moves: [
      m("Black Mamba", "A"),
      m("Shin to Shin", "A"),
      m("Ashi", "A"),
      m("Peel", "B"),
      m("X-Guard", "A"),
      m("Peel", "B"),
      m("Ashi", "A"),
      m("III", "B"),
      m("Sweep", "A"),
      m("Straight Ankle", "A"),
      m("Pin, Hop, Collar Tie, Stand Up", "B"),
      m("Ashi", "A"),
      m("Peel", "B"),
      m("Cummings Blast", "A"),
      m("DOA Heel Hook", "A"),
      m("Roof", "A"),
      m("Outside Senkaku Heel Hook", "A"),
      m("Roof", "A"),
      m("DOA Smash", "B"),
      m("Attack Mode", "B"),
      m("Crotch Ripper", "B"),
      m("3 Calf Cranks", "B"),
    ]
  },
  {
    id: "B2", series: "B", name: "Standing Knee Cut → Calf Cranks",
    moves: [
      m("Standing Knee Cut", "A"),
      m("Rolling Kimura", "A"),
      m("Backmount", "A"),
      m("Trapped Arm RNC", "A"),
      m("III", "B"),
      m("Leg Press", "B"),
      m("Body Triangle", "A"),
      m("Straight Jacket", "A"),
      m("2 x 1-Arm Finishes", "A"),
      m("Weak Side RNC", "A"),
      m("Leg Press", "B"),
      m("Preweb", "A"),
      m("Back Triangle", "A"),
      m("Back Kimura", "A"),
      m("Turn in", "B"),
      m("Triangle", "A"),
      m("Last Resort", "B"),
      m("Attack Mode", "B"),
      m("Crotch Ripper", "B"),
      m("3 Calf Cranks", "B"),
    ]
  },
  {
    id: "B3", series: "B", name: "Stalk → Dan Severn",
    moves: [
      m("Stalk", "A"),
      m("Reach", "B"),
      m("Russian", "A"),
      m("Post", "B"),
      m("Shoot", "A"),
      m("Sprawl", "B"),
      m("Marcelotine", "B"),
      m("Arm in Guillotine", "B"),
      m("Butterfly Sweep", "B"),
      m("Mounted Marcelotine", "A"),
      m("Hip Bump", "B"),
      m("DM's", "B"),
      m("Flying Guillotine", "A"),
      m("Mounted 1-Arm Guillotine", "A"),
      m("Hip Bump Mount Escape", "B"),
      m("Imanari", "A"),
      m("Inward Stomp Heel Hook", "A"),
      m("Heel Hook Defense", "B"),
      m("Back Mount", "A"),
      m("Body Triangle", "B"),
      m("Dan Severn", "A"),
    ]
  },
  {
    id: "B4", series: "B", name: "Standing Knee Slice → Knee Bar",
    moves: [
      m("Standing Knee Slice", "A"),
      m("¼ Capture", "B"),
      m("High DM's", "A"),
      m("Hip Switch", "A"),
      m("Judo Side", "A"),
      m("Traditional Side", "A"),
      m("Jail Break", "B"),
      m("Back Out", "A"),
      m("Other Side Knee Slice", "A"),
      m("¼ Capture", "B"),
      m("High DM's", "A"),
      m("Hip Switch", "A"),
      m("Judo Side", "A"),
      m("Traditional Side", "A"),
      m("Jail Break", "B"),
      m("Z-Guard", "A"),
      m("Toe Hold", "A"),
      m("Kick Out Attempt", "B"),
      m("Rolling Toe Hold", "A"),
      m("Knee Bar", "B"),
      m("Knee Bar Escape", "A"),
    ]
  },
  {
    id: "C1", series: "C", name: "Supine Butterfly → Head & Armpit",
    moves: [
      m("Supine Butterfly", "B"),
      m("Knee Pummel Staple", "A"),
      m("Far Side Knee Cut Attempt", "A"),
      m("¼ Z", "B"),
      m("Plank w/ Head Position", "A"),
      m("M1", "A"),
      m("Knee on Belly", "A"),
      m("2 Belly Skips", "A"),
      m("Judo Side", "A"),
      m("Lean on the Door", "B"),
      m("Traditional Side", "A"),
      m("Recover Full Guard", "B"),
      m("Hip Bump Triangle", "B"),
      m("Pummel & Posture Triangle Defense", "A"),
      m("Hip Bump Sweep", "B"),
      m("Reverse Alcatraz", "B"),
      m("Ashi", "A"),
      m("Heel Hook", "A"),
      m("Stand Up, Kick Free, Peel, & Backstep", "B"),
      m("Reverse Knee On Belly", "B"),
      m("Wheel Kick Mount", "A"),
      m("Under Jacks", "A"),
      m("Head & Armpit Control", "A"),
    ]
  },
  {
    id: "C2", series: "C", name: "Z Guard → Gogo Clinch",
    moves: [
      m("Z Guard", "A"),
      m("Z Stuff", "B"),
      m("Toe Hold Attempt", "A"),
      m("Kick Out", "B"),
      m("Butterfly Sit Up Guard", "A"),
      m("Butterfly Smash", "B"),
      m("Fly Over Pass", "A"),
      m("Judo Side", "B"),
      m("Double C Cups", "A"),
      m("Twister Pass Attempt", "A"),
      m("Reverse Heisman", "A"),
      m("Back Out", "B"),
      m("Spiral Guard", "A"),
      m("Jackie Chan", "A"),
      m("Smash & Back Out", "B"),
      m("Imanari", "A"),
      m("Smash", "B"),
      m("Berimbolo", "A"),
      m("Dark Haven", "A"),
      m("Salvage the Top", "B"),
      m("New Jersey", "A"),
      m("Fire & Flip", "B"),
      m("Gogo Clinch", "A"),
    ]
  },
  {
    id: "C3", series: "C", name: "Z Guard → Arm Bar",
    moves: [
      m("Z Guard", "A"),
      m("Z-Stuff", "B"),
      m("Toe Hold Attempt", "A"),
      m("Kickout", "B"),
      m("Butterfly Sit Up Guard", "A"),
      m("Butterfly Smash", "B"),
      m("Flip Over Pass", "A"),
      m("North South", "B"),
      m("Civil War", "A"),
      m("Deez Hips x 3", "B"),
      m("B Smith Escape", "A"),
      m("Arm Drag", "A"),
      m("Swim Move", "A"),
      m("Arm Crush", "A"),
      m("Arm Bar", "A"),
    ]
  },
  {
    id: "C4", series: "C", name: "Z Guard → Ninja Roll",
    moves: [
      m("Z Guard", "A"),
      m("Z Stuff", "B"),
      m("Toe Hold Attempt", "A"),
      m("Kick Out", "B"),
      m("Butterfly Sit Up Guard", "A"),
      m("Chest Pass", "B"),
      m("Flat Mode", "B"),
      m("Inverted Armbar", "B"),
      m("Japanese Arm Bar", "B"),
      m("Corkscrew Escape", "A"),
      m("Attack Mode", "A"),
      m("Ninja Roll", "A"),
      m("Crotch Ripper", "A"),
    ]
  },
  {
    id: "D1", series: "D", name: "Double Ankle Toss → Head & Armpit",
    moves: [
      m("Double Ankle Toss", "A"),
      m("Shake & Bake", "A"),
      m("Judo Side", "A"),
      m("Double \"C\" Cups", "B"),
      m("Reverse Heisman", "B"),
      m("Full Guard", "B"),
      m("Spider Guard Escape", "A"),
      m("Game Over", "A"),
      m("\"Z\" Lock", "A"),
      m("Nancy Kerrigan", "A"),
      m("Free The Bottom Leg", "B"),
      m("Power Heel Hook", "A"),
      m("Roof", "A"),
      m("Inward Heel Hook", "A"),
      m("Outward Heel Hook", "A"),
      m("Upward Heel Hook", "A"),
      m("Honey Flip", "B"),
      m("Wheel Kick Mount", "B"),
      m("Head and Armpit Control", "B"),
    ]
  },
  {
    id: "D2", series: "D", name: "Mush → Gogo Clinch",
    moves: [
      m("Mush", "A"),
      m("Supine Butterflies", "B"),
      m("Hook Kick M1", "A"),
      m("Knee on Belly with Crossover", "A"),
      m("2 Belly Skips", "A"),
      m("Outside Granby", "B"),
      m("Outside Knee Slice", "A"),
      m("Twister Pass", "A"),
      m("Attack Mode", "A"),
      m("Baseball Bat", "A"),
      m("Defend", "B"),
      m("Marsh", "B"),
      m("Shoulder Hook", "A"),
      m("Back Mount", "A"),
      m("Trapped Arm RNC", "A"),
      m("Leg Press", "B"),
      m("Straight Jacket", "A"),
      m("1 Arm Finish", "A"),
      m("Weak Side RNC", "A"),
      m("Leg Press", "B"),
      m("Safe Haven", "B"),
      m("Salvage the Top", "A"),
      m("Gogo Clinch", "A"),
    ]
  },
  {
    id: "D3", series: "D", name: "Double Ankle Toss → Gogo Clinch",
    moves: [
      m("Double Ankle Toss", "A"),
      m("Plank on the Knees", "A"),
      m("Leg Drag", "A"),
      m("Knee on Belly", "A"),
      m("2 Belly Skips", "A"),
      m("¼ Capture", "B"),
      m("Backstep", "A"),
      m("Honey Hole", "A"),
      m("Clover Leaf", "A"),
      m("Roof", "A"),
      m("Tony Montanta", "A"),
      m("Heel Hook", "A"),
      m("Ramey Escape", "B"),
      m("Berimbolo", "A"),
      m("Grey Haven", "A"),
      m("Salvage the Top", "B"),
      m("Gogo Clinch", "A"),
    ]
  },
  {
    id: "E1", series: "E", name: "Standing Knee Cut → Body Triangle",
    moves: [
      m("Standing Knee Cut", "A"),
      m("¼ Shell", "B"),
      m("Pull Up", "A"),
      m("Mini Stomp", "A"),
      m("Push", "B"),
      m("Lockdown", "B"),
      m("Pull", "A"),
      m("Perfect DUH's", "A"),
      m("III Boa", "A"),
      m("Fancy Feet", "A"),
      m("Perfect Dogfight", "A"),
      m("Twistback", "A"),
      m("Baseball Bat", "A"),
      m("Limp Arm Attempt", "B"),
      m("The Valley", "A"),
      m("RNC", "A"),
      m("Leg Press to Other Side", "B"),
      m("Open the Body Triangle", "A"),
      m("Reverse ¼ Capture", "B"),
      m("Reverse Mini Stomp", "B"),
      m("The Unraveler", "B"),
      m("Gift Wrap", "A"),
      m("Chair Sit", "A"),
      m("Body Triangle", "A"),
    ]
  },
  {
    id: "E2", series: "E", name: "Tripod Pass → Baseball Bat",
    moves: [
      m("Tripod Pass", "A"),
      m("¼ Shell", "B"),
      m("Backstep", "A"),
      m("Follow", "B"),
      m("¾ Mount", "A"),
      m("Pull Up", "B"),
      m("¼ Shell", "B"),
      m("¼ Whip", "A"),
      m("Dog Fight", "B"),
      m("Half & Half", "B"),
      m("Attack Mode", "B"),
      m("Ninja Roll", "B"),
      m("Crotch Ripper", "B"),
      m("3 Calf Cranks", "A"),
      m("Baseball Bat", "A"),
    ]
  },
  {
    id: "E3", series: "E", name: "Tripod Pass → Sneaky Kamikaze",
    moves: [
      m("Tripod Pass", "B"),
      m("¼ Z", "B"),
      m("Shoot", "A"),
      m("Pull", "A"),
      m("Dog Fight", "A"),
      m("Homie Control", "A"),
      m("Homie X", "A"),
      m("Shuck", "A"),
      m("Squeeze", "A"),
      m("Gift Wrap", "A"),
      m("Back", "A"),
      m("Banana Split 3 Ways", "A"),
      m("Defend", "B"),
      m("Baseball Bat", "A"),
      m("The Snap", "A"),
      m("Sneaky Kamikaze", "A"),
    ]
  },
  {
    id: "E4", series: "E", name: "Open Z → North South Choke",
    moves: [
      m("Open Z Mobility", "B"),
      m("Z Guard", "A"),
      m("Zelda", "A"),
      m("Lockdown", "A"),
      m("Whip Down", "A"),
      m("Whip Up", "A"),
      m("Electric Underhooks", "A"),
      m("Bump", "A"),
      m("Slide", "A"),
      m("Whip", "A"),
      m("Base", "B"),
      m("Electric Chair", "A"),
      m("Sweep", "A"),
      m("Electric Cradle", "A"),
      m("Pass", "A"),
      m("Can Crusher Darce", "A"),
      m("Defend", "B"),
      m("North South Choke", "A"),
    ]
  },
  {
    id: "F1", series: "F", name: "Head & Arm → Side Control",
    moves: [
      m("Head & Arm", "B"),
      m("Lockdown", "A"),
      m("Overhook", "A"),
      m("Pimp Arm", "A"),
      m("Battle of the Knee", "A"),
      m("1 Leg Mermaid", "A"),
      m("Cocoon", "A"),
      m("Jean Jacques Sweep", "A"),
      m("¾ Mount", "A"),
      m("Mount", "A"),
      m("Hip Bump Mount Escape", "B"),
      m("Butterfly Double Unders", "B"),
      m("Prison Guard", "B"),
      m("Homie Control", "B"),
      m("Shoulder Crunch", "A"),
      m("Sweep", "A"),
      m("Armbar", "A"),
      m("Corkscrew Escape", "B"),
      m("Side Control", "A"),
    ]
  },
  {
    id: "F2", series: "F", name: "Head & Arm → Head & Armpit",
    moves: [
      m("Head & Arm", "B"),
      m("Lockdown", "A"),
      m("Overhook", "A"),
      m("Pimp Arm", "A"),
      m("Battle of the Knee", "A"),
      m("1 Leg Mermaid", "A"),
      m("Cocoon", "A"),
      m("Reverse Jean Jacques Sweep", "A"),
      m("¾ Mount", "A"),
      m("Mount", "A"),
      m("Shrimp", "B"),
      m("Chair Sit Attempt", "A"),
      m("Jean Jacques Mount Escape", "B"),
      m("Power Heel Hook", "B"),
      m("Switch Grip Heel Hook", "B"),
      m("Standing Defense", "A"),
      m("Reverse Knee on Belly", "A"),
      m("Wheel Kick Mount", "A"),
      m("Under Jacks", "A"),
      m("Head & Armpit Control", "A"),
    ]
  },
  {
    id: "F3", series: "F", name: "Sit Up Guard → Calf Cranks",
    moves: [
      m("Sit Up Guard", "B"),
      m("Combat Base", "A"),
      m("2 on 1 Sweep", "B"),
      m("Mount", "A"),
      m("Hip Bump Mount Escape", "B"),
      m("Butterfly Double Unders", "B"),
      m("Lockdown Double Underhooks", "A"),
      m("Homie Control", "A"),
      m("Body Pyramid", "A"),
      m("Failed Shuck", "A"),
      m("Mission Control", "A"),
      m("Zombie", "A"),
      m("New Jersey", "A"),
      m("Fire & Flip", "B"),
      m("Gogo Clinch", "A"),
      m("Carny", "A"),
      m("Omoplata", "A"),
      m("Carny", "A"),
      m("Slow the Roll", "A"),
      m("Baby's Arm", "A"),
      m("Wrist Lock", "A"),
      m("Attack Mode", "B"),
      m("Ninja Roll", "B"),
      m("Crotch Ripper", "B"),
      m("3 Calf Cranks", "B"),
    ]
  },
  {
    id: "F4", series: "F", name: "Sit Up Guard → Armbar",
    moves: [
      m("Sit Up Guard", "A"),
      m("2 on 1", "A"),
      m("Step Up", "B"),
      m("Clubbing Butterfly Sweep", "A"),
      m("Mount", "A"),
      m("Shrimp", "B"),
      m("Chair Sit Attempt", "A"),
      m("Jean Jacques Mount Escape", "B"),
      m("Playgirl Escape", "B"),
      m("Wheelbarrow", "A"),
      m("¼ Z", "B"),
      m("Elbow Underhook", "A"),
      m("Rolling Neck Wrap", "A"),
      m("Anaconda", "A"),
      m("Rolling Escape", "B"),
      m("Judo Side", "B"),
      m("Double C Cup", "A"),
      m("Inverted Heisman", "A"),
      m("Armbar", "A"),
    ]
  },
  {
    id: "G1", series: "G", name: "Lockdown → Spiderweb",
    moves: [
      m("Lockdown", "A"),
      m("Head & Arm", "A"),
      m("No Hands Pass", "A"),
      m("Knee on Belly Mount", "A"),
      m("Underjack", "A"),
      m("Under Hook Bridge Escape", "B"),
      m("Upa Escape", "B"),
      m("2 Arm Bars", "A"),
      m("Shoulder Hook", "A"),
      m("Deep Hook", "A"),
      m("Cut the Angle", "A"),
      m("Three Pumps", "A"),
      m("The Toss", "A"),
      m("Spider Web", "A"),
      m("Bollinger Break", "A"),
    ]
  },
  {
    id: "G2", series: "G", name: "Lockdown → Power Heel Hook",
    moves: [
      m("Lockdown", "A"),
      m("Overhook", "A"),
      m("Pimp Arm", "A"),
      m("Dominator Pass", "B"),
      m("Brennen Mount", "B"),
      m("Underjacks", "B"),
      m("S Mount", "B"),
      m("Rewind", "A"),
      m("Hail Mary Escape", "A"),
      m("Game Over", "A"),
      m("Z Lock", "A"),
      m("Nancy Kerrigan", "A"),
      m("Point & Pull", "B"),
      m("Power Heel Hook", "A"),
    ]
  },
  {
    id: "G3", series: "G", name: "Z Stuff → Darce",
    moves: [
      m("Z Stuff", "A"),
      m("Toe Hold Attempt", "A"),
      m("Kick Out", "B"),
      m("Twister Pass", "A"),
      m("Palm Strike the Knee", "A"),
      m("Harass the Feet", "A"),
      m("Twister Side Control", "A"),
      m("Tip Toe Mount", "A"),
      m("Grape Popper", "A"),
      m("Rewind", "A"),
      m("Underjacks", "A"),
      m("Head & Armpit", "A"),
      m("UH Bridge Escape", "B"),
      m("Escape from Alcatraz", "B"),
      m("Electric Underhooks", "B"),
      m("Free the Knee", "A"),
      m("Vice Grip", "A"),
      m("Japanese Necktie", "A"),
      m("Pass", "A"),
      m("Darce", "A"),
      m("Malibu Beams", "B"),
      m("Arm in Guillotine Attempt", "A"),
      m("Rolling Escape", "A"),
    ]
  },
  {
    id: "G4", series: "G", name: "Lockdown → Prison Break",
    moves: [
      m("Lockdown", "B"),
      m("Head & Arm", "A"),
      m("Jaws of Life", "B"),
      m("Buttock Compressor", "A"),
      m("Shrimp and Frame", "B"),
      m("Head in the Hole", "A"),
      m("Jump Sides", "A"),
      m("Leg Drag", "A"),
      m("Dope Mount", "A"),
      m("Underjacks", "A"),
      m("Head & Armpit", "A"),
      m("UH Bridge Escape", "B"),
      m("Reverse Alcatraz", "B"),
      m("Butterfly Double Underhooks", "B"),
      m("Prison Guard", "B"),
      m("Homie Control Body Pyramid", "B"),
      m("Failed Shuck", "B"),
      m("Head Pummel", "B"),
      m("Inverted Arm Bar", "B"),
      m("Swim Move", "B"),
      m("Spiderweb", "B"),
      m("Pin the Hand Leg Escape", "B"),
      m("Silverado", "B"),
      m("Rewind", "A"),
      m("Prison Break Escape", "A"),
    ]
  },
  {
    id: "H1", series: "H", name: "Spiral → Gogo Clinch",
    moves: [
      m("Spiral", "A"),
      m("De La Riva", "A"),
      m("Spiral", "A"),
      m("Kiss of the Dragon", "A"),
      m("Crabride", "A"),
      m("Roll", "B"),
      m("III Chasing Crab Ankles", "A"),
      m("Roll", "B"),
      m("Chasing Crab Hips", "A"),
      m("Backmount", "A"),
      m("Grey Haven", "B"),
      m("Salvage the Top", "A"),
      m("Fire & Flip", "B"),
      m("Gogo Clinch", "B"),
    ]
  },
  {
    id: "H2", series: "H", name: "Cocoon → Sneaky Kamikaze",
    moves: [
      m("Cocoon", "A"),
      m("Horse Stance Limp Arm", "B"),
      m("X Guard", "A"),
      m("Back Sweep", "A"),
      m("Twister Side", "A"),
      m("Attack Mode", "B"),
      m("Killswitch Ninja Roll", "B"),
      m("Shoulder Hook", "A"),
      m("Backmount", "A"),
      m("RNC", "A"),
      m("Leg Press Rewind", "B"),
      m("Body Triangle", "A"),
      m("Straight Jacket", "A"),
      m("Leg Press Rewind", "B"),
      m("The Buck", "A"),
      m("The Snap", "A"),
      m("Sneaky Kamikaze", "A"),
    ]
  },
  {
    id: "H3", series: "H", name: "Combat Base → Straight Ankle",
    moves: [
      m("Combat Base", "B"),
      m("Black Mamba", "A"),
      m("Shin 2 Shin", "A"),
      m("Deep Half Double Unders", "A"),
      m("Switch the Feet", "A"),
      m("Waiter Sweep", "A"),
      m("Twister Side", "A"),
      m("Highway to Hells Gate", "A"),
      m("Topside Heel Hook", "A"),
      m("Bottom Leg Power Straight Ankle", "A"),
    ]
  },
  {
    id: "H4", series: "H", name: "Spiral → Chill Dog",
    moves: [
      m("Spiral", "A"),
      m("De La Riva", "A"),
      m("Spiral", "A"),
      m("Tripod Sweep", "A"),
      m("Berimbolo", "A"),
      m("Backmount", "A"),
      m("Grey Haven", "B"),
      m("Salvage the Top", "A"),
      m("Mission Control", "B"),
      m("Zombie", "B"),
      m("New York", "B"),
      m("Double Bag", "B"),
      m("Clear the Neck", "B"),
      m("Chill Dog", "B"),
      m("Invisible Collar", "B"),
    ]
  },
];

// ─── STORAGE ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "tp_progress";

function getDefaultProgress() {
  const p = {};
  DECKS.forEach(d => {
    p[d.id] = { currentStreak: 0, bestStreak: 0, lastAttemptDate: null, attempts: [] };
  });
  return p;
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultProgress();
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object") return getDefaultProgress();
    const base = getDefaultProgress();
    Object.keys(base).forEach(id => { if (!parsed[id]) parsed[id] = base[id]; });
    return parsed;
  } catch { return getDefaultProgress(); }
}

function saveProgress(progress) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch {}
}

function resetProgress() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

// ─── UTILS ───────────────────────────────────────────────────────────────────

function generateOptions(correctMove, correctDeckId) {
  const pool = [];
  DECKS.forEach(d => {
    if (d.id === correctDeckId) return;
    d.moves.forEach(mv => pool.push(mv));
  });
  const shuffledPool = pool.sort(() => Math.random() - 0.5);
  const wrongs = [];
  const seen = new Set([correctMove.text]);
  for (const mv of shuffledPool) {
    if (!seen.has(mv.text)) { seen.add(mv.text); wrongs.push(mv); }
    if (wrongs.length === 3) break;
  }
  while (wrongs.length < 3) wrongs.push({ text: "Unknown Move " + wrongs.length, partner: "A" });
  const opts = [
    { ...correctMove, correct: true },
    ...wrongs.map(mv => ({ ...mv, correct: false }))
  ];
  return opts.sort(() => Math.random() - 0.5);
}

function formatRelativeDate(iso) {
  if (!iso) return "";
  const then = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - then) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return diffDays + " days ago";
  if (diffDays < 30) return Math.floor(diffDays / 7) + " weeks ago";
  return Math.floor(diffDays / 30) + " months ago";
}

function formatDuration(secs) {
  const mm = Math.floor(secs / 60).toString().padStart(2, "0");
  const ss = (secs % 60).toString().padStart(2, "0");
  return `${mm}:${ss}`;
}

function nextDeckId(deckId) {
  const idx = DECKS.findIndex(d => d.id === deckId);
  if (idx === -1 || idx === DECKS.length - 1) return null;
  return DECKS[idx + 1].id;
}

function getLongestStreak(moveSequence) {
  let longest = 0;
  let current = 0;
  moveSequence.forEach(answer => {
    if (answer.correct) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  });
  return longest;
}

// ─── MOVE LABEL ──────────────────────────────────────────────────────────────

function MoveLabel({ move, style }) {
  return (
    <span className={move.partner === "B" ? "partner-b" : "partner-a"} style={style}>
      {move.text}
    </span>
  );
}

function PartnerKey({ style }) {
  return (
    <div className="partner-key" style={style}>
      <span className="partner-key-item">
        <span className="partner-key-swatch a" />
        <span className="partner-a">Partner A</span>
      </span>
      <span className="partner-key-item">
        <span className="partner-key-swatch b" />
        <span className="partner-b">Partner B</span>
      </span>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState("home");
  const [progress, setProgress] = useState(() => loadProgress());
  const [currentDeckId, setCurrentDeckId] = useState(null);
  const [session, setSession] = useState(null);
  const [statsForDeck, setStatsForDeck] = useState(null);
  const [resetConfirm, setResetConfirm] = useState(false);

  useEffect(() => { saveProgress(progress); }, [progress]);

  const deck = currentDeckId ? DECKS.find(d => d.id === currentDeckId) : null;

  function startDeck(deckId) {
    const d = DECKS.find(x => x.id === deckId);
    if (!d) return;
    setCurrentDeckId(deckId);
    setSession({
      moveSequence: [],
      currentStreak: 0,
      startTime: Date.now(),
      options: generateOptions(d.moves[0], deckId),
      locked: false,
    });
    setView("training");
  }

  function goHome() {
    setView("home");
    setCurrentDeckId(null);
    setSession(null);
  }

  function openStats(deckId) {
    setStatsForDeck(deckId);
    setView("progress");
  }

  function handleReset() {
    if (!resetConfirm) { setResetConfirm(true); return; }
    resetProgress();
    setProgress(getDefaultProgress());
    setResetConfirm(false);
  }

  function handleOptionClick(optionIndex) {
    if (!session || session.locked) return;
    const d = deck;
    const moveIdx = session.moveSequence.length;
    const opt = session.options[optionIndex];
    const correct = opt.correct;
    const newStreak = correct ? session.currentStreak + 1 : 0;
    const newSeq = [...session.moveSequence, { moveIndex: moveIdx, correct }];
    const isLast = moveIdx === d.moves.length - 1;

    if (isLast) {
      const duration = Math.floor((Date.now() - session.startTime) / 1000);
      const wrongMoves = newSeq.filter(x => !x.correct).map(x => x.moveIndex);
      const longestStreak = getLongestStreak(newSeq);
      const attempt = {
        date: new Date().toISOString().split("T")[0],
        finalStreak: newStreak,
        wrongMoves,
        duration,
      };
      const prev = progress[d.id];
      const updated = {
        ...progress,
        [d.id]: {
          currentStreak: newStreak,
          bestStreak: Math.max(prev.bestStreak, longestStreak),
          lastAttemptDate: attempt.date,
          attempts: [...prev.attempts, attempt],
        },
      };
      setProgress(updated);
      setSession({ ...session, moveSequence: newSeq, currentStreak: newStreak, finalAttempt: attempt, locked: true });
      setView("completion");
    } else {
      const nextMoveIdx = moveIdx + 1;
      setSession({
        ...session,
        moveSequence: newSeq,
        currentStreak: newStreak,
        options: generateOptions(d.moves[nextMoveIdx], d.id),
        locked: false,
      });
    }
  }

  function handleBackHome() {
    if (!session || !deck) { goHome(); return; }
    const d = deck;
    if (session.moveSequence.length > 0) {
      const duration = Math.floor((Date.now() - session.startTime) / 1000);
      const wrongMoves = session.moveSequence.filter(x => !x.correct).map(x => x.moveIndex);
      const attempt = {
        date: new Date().toISOString().split("T")[0],
        finalStreak: session.currentStreak,
        wrongMoves,
        duration,
        abandoned: true,
      };
      const prev = progress[d.id];
      setProgress({
        ...progress,
        [d.id]: {
          currentStreak: session.currentStreak,
          bestStreak: Math.max(prev.bestStreak, session.currentStreak),
          lastAttemptDate: attempt.date,
          attempts: [...prev.attempts, attempt],
        },
      });
    }
    goHome();
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 16px" }}>
      <GlobalStyles />
      {view === "home" && (
        <HomeScreen
          progress={progress}
          onDeckClick={startDeck}
          onStats={openStats}
          onReset={handleReset}
          resetConfirm={resetConfirm}
          onCancelReset={() => setResetConfirm(false)}
        />
      )}
      {view === "training" && deck && session && (
        <TrainingScreen
          deck={deck}
          session={session}
          onOptionClick={handleOptionClick}
          onBack={handleBackHome}
        />
      )}
      {view === "completion" && deck && session && (
        <CompletionScreen
          deck={deck}
          session={session}
          progress={progress}
          onNext={() => { const nid = nextDeckId(deck.id); if (nid) startDeck(nid); else goHome(); }}
          onHome={goHome}
          onTryAgain={() => startDeck(deck.id)}
          onStats={() => openStats(deck.id)}
        />
      )}
      {view === "progress" && (
        <ProgressScreen
          deckId={statsForDeck}
          progress={progress}
          onBack={goHome}
          onDeckSelect={setStatsForDeck}
        />
      )}
    </div>
  );
}

// ─── HOME SCREEN ─────────────────────────────────────────────────────────────

function HomeScreen({ progress, onDeckClick, onStats, onReset, resetConfirm, onCancelReset }) {
  return (
    <div style={{ paddingTop: 28, paddingBottom: 48 }}>
      <h1 style={{ marginBottom: 4 }}>10th Planet</h1>
      <h1 style={{ marginBottom: 2, color: "var(--accent)" }}>Warmup Trainer</h1>
      <p className="meta" style={{ marginBottom: 12, letterSpacing: "0.1em", textTransform: "uppercase" }}>32 decks · 8 series</p>
      <PartnerKey style={{ marginBottom: 32 }} />

      {SERIES.map(series => {
        const seriesDecks = DECKS.filter(d => d.series === series.id);
        return (
          <div key={series.id} style={{ marginBottom: 28 }}>
            <div className="series-heading">Series {series.id} — {series.name}</div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {seriesDecks.map(d => {
                  const prog = progress[d.id] || { currentStreak: 0, bestStreak: 0, attempts: [] };
                  const total = d.moves.length;
                  const label = prog.attempts.length === 0
                    ? "untrained"
                    : prog.bestStreak === total
                    ? "complete"
                    : "in progress";
                  return (
                    <tr key={d.id}>
                      <td style={{ padding: "8px 0", verticalAlign: "top", width: 36 }}>
                        <span className="deck-id">{d.id}</span>
                      </td>
                      <td style={{ padding: "8px 10px 8px 0", verticalAlign: "top" }}>
                        <div className="deck-name">{d.name}</div>
                        <div className="meta">{prog.bestStreak}/{total} · {label}</div>
                        <progress value={prog.bestStreak} max={total} style={{ marginTop: 5 }} />
                      </td>
                      <td style={{ padding: "8px 0", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        <button className="btn-primary" onClick={() => onDeckClick(d.id)}>Train</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}

      <hr />
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <button onClick={onStats}>Stats</button>
        {!resetConfirm
          ? <button onClick={onReset}>Reset all</button>
          : <>
              <button onClick={onReset}>Confirm reset</button>
              <button className="btn-ghost" onClick={onCancelReset}>Cancel</button>
            </>
        }
      </div>
    </div>
  );
}

// ─── TRAINING SCREEN ─────────────────────────────────────────────────────────

function TrainingScreen({ deck, session, onOptionClick, onBack }) {
  const moveIdx = session.moveSequence.length;
  const prevMove = moveIdx > 0 ? deck.moves[moveIdx - 1] : null;
  const total = deck.moves.length;

  return (
    <div style={{ paddingTop: 20, paddingBottom: 48 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <span className="deck-id" style={{ display: "block", marginBottom: 2 }}>{deck.id}</span>
          <h2>{deck.name}</h2>
        </div>
        <div className="streak-badge">🔥 {session.currentStreak}</div>
      </div>

      <fieldset style={{ marginBottom: 14 }}>
        <legend>Sequence ({moveIdx}/{total})</legend>
        <PartnerKey style={{ marginBottom: 10 }} />
        <div>
          {deck.moves.map((move, i) => {
            const answered = session.moveSequence[i];
            if (i >= moveIdx) return null;
            const symCls = "move-symbol" + (answered?.correct ? " correct" : answered ? " wrong" : "");
            return (
              <div key={i} className="move-row">
                <span className={symCls}>{answered?.correct ? "✓" : answered ? "✗" : "○"}</span>
                <MoveLabel move={move} />
              </div>
            );
          })}
        </div>
      </fieldset>

      <fieldset style={{ marginBottom: 16 }}>
        <legend>What's next?</legend>
        <div style={{ marginBottom: 12 }}>
          <div className="last-move-label">{prevMove ? "Last move" : "Opening move"}</div>
          {prevMove
            ? <div className="last-move-value"><MoveLabel move={prevMove} /></div>
            : <div className="last-move-value" style={{ color: "var(--muted)" }}>—</div>
          }
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {session.options.map((opt, i) => (
            <button
              key={i}
              className="option-btn"
              onClick={() => onOptionClick(i)}
            >
              <span style={{ color: "var(--muted)", marginRight: 10, fontFamily: "var(--font-disp)", fontWeight: 700 }}>
                {String.fromCharCode(65 + i)}
              </span>
              {opt.text}
            </button>
          ))}
        </div>
      </fieldset>

      <button className="btn-ghost" onClick={onBack}>← Back</button>
    </div>
  );
}

// ─── COMPLETION SCREEN ───────────────────────────────────────────────────────

function CompletionScreen({ deck, session, progress, onNext, onHome, onTryAgain, onStats }) {
  const total = deck.moves.length;
  const correct = session.moveSequence.filter(x => x.correct).length;
  const wrong = session.moveSequence.filter(x => !x.correct);
  const duration = session.finalAttempt ? session.finalAttempt.duration : 0;
  const nid = nextDeckId(deck.id);
  const nextDeck = nid ? DECKS.find(d => d.id === nid) : null;
  const perfect = wrong.length === 0;

  return (
    <div style={{ paddingTop: 20, paddingBottom: 48 }}>
      <span className="deck-id" style={{ display: "block", marginBottom: 4 }}>{deck.id}</span>
      <h2 style={{ marginBottom: 2, color: perfect ? "var(--green)" : "var(--text)" }}>
        {perfect ? "Perfect" : "Complete"}
      </h2>
      <p className="meta" style={{ marginBottom: 20 }}>{deck.name}</p>

      <fieldset style={{ marginBottom: 14 }}>
        <legend>Sequence</legend>
        <PartnerKey style={{ marginBottom: 10 }} />
        {deck.moves.map((move, i) => {
          const s = session.moveSequence[i];
          const symCls = "move-symbol" + (s?.correct ? " correct" : s ? " wrong" : "");
          return (
            <div key={i} className="move-row">
              <span className={symCls}>{s?.correct ? "✓" : s ? "✗" : "○"}</span>
              <MoveLabel move={move} />
            </div>
          );
        })}
      </fieldset>

      <fieldset style={{ marginBottom: 20 }}>
        <legend>Results</legend>
        <table style={{ width: "100%" }}>
          <tbody>
            <tr className="stat-row"><td>Correct</td><td>{correct}/{total}</td></tr>
            <tr className="stat-row"><td>Final streak</td><td>{session.currentStreak}</td></tr>
            <tr className="stat-row"><td>Best streak</td><td>{progress[deck.id]?.bestStreak ?? 0}/{total}</td></tr>
            <tr className="stat-row"><td>Wrong</td><td>{wrong.length === 0 ? "—" : wrong.map(w => `M${w.moveIndex + 1}`).join(", ")}</td></tr>
            <tr className="stat-row"><td>Time</td><td>{formatDuration(duration)}</td></tr>
          </tbody>
        </table>
      </fieldset>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {nextDeck && <button className="btn-primary" onClick={onNext}>Next: {nextDeck.id} — {nextDeck.name}</button>}
        <button onClick={onTryAgain}>Try again</button>
        <button onClick={onStats}>Progress history</button>
        <button className="btn-ghost" onClick={onHome}>← Home</button>
      </div>
    </div>
  );
}

// ─── PROGRESS SCREEN ─────────────────────────────────────────────────────────

function ProgressScreen({ deckId, progress, onBack, onDeckSelect }) {
  const deck = deckId ? DECKS.find(d => d.id === deckId) : null;
  const prog = deck ? progress[deck.id] : null;

  return (
    <div style={{ paddingTop: 20, paddingBottom: 48 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
        <button className="btn-ghost" onClick={onBack} style={{ padding: "6px 0" }}>←</button>
        <h2>Progress</h2>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span className="section-label" style={{ margin: 0, whiteSpace: "nowrap" }}>Deck</span>
          <select value={deckId || ""} onChange={e => onDeckSelect(e.target.value || null)} style={{ flex: 1 }}>
            <option value="">— All decks —</option>
            {DECKS.map(d => (
              <option key={d.id} value={d.id}>{d.id}: {d.name}</option>
            ))}
          </select>
        </label>
      </div>

      {!deck && <AllDecksOverview progress={progress} onDeckSelect={onDeckSelect} />}
      {deck && prog && <DeckProgress deck={deck} prog={prog} />}
    </div>
  );
}

function AllDecksOverview({ progress, onDeckSelect }) {
  const completedDecks = DECKS.filter(d => {
    const p = progress[d.id];
    return p && p.bestStreak === d.moves.length;
  }).length;
  const totalAttempts = DECKS.reduce((sum, d) => sum + (progress[d.id]?.attempts.length ?? 0), 0);

  return (
    <div>
      <fieldset style={{ marginBottom: 16 }}>
        <legend>Overall</legend>
        <table style={{ width: "100%" }}>
          <tbody>
            <tr className="stat-row"><td>Completed</td><td>{completedDecks}/{DECKS.length}</td></tr>
            <tr className="stat-row"><td>Total attempts</td><td>{totalAttempts}</td></tr>
          </tbody>
        </table>
      </fieldset>
      <span className="section-label">All Decks</span>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", padding: "6px 0", fontFamily: "var(--font-disp)", fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>Deck</th>
            <th style={{ textAlign: "left", padding: "6px 14px", fontFamily: "var(--font-disp)", fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>Best</th>
            <th style={{ textAlign: "left", padding: "6px 0", fontFamily: "var(--font-disp)", fontSize: "0.65rem", letterSpacing: "0.15em", textTransform: "uppercase", color: "var(--muted)", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>Attempts</th>
          </tr>
        </thead>
        <tbody>
          {DECKS.map(d => {
            const p = progress[d.id] || { bestStreak: 0, attempts: [] };
            const done = p.bestStreak === d.moves.length;
            return (
              <tr key={d.id} style={{ borderBottom: "1px solid #1a1a1a" }}>
                <td style={{ padding: "5px 0" }}>
                  <button className="btn-ghost" style={{ padding: 0, color: done ? "var(--green)" : "var(--muted)", textDecoration: "underline", fontSize: "0.85rem", fontFamily: "var(--font-disp)", fontWeight: 700 }}
                    onClick={() => onDeckSelect(d.id)}>
                    {d.id}
                  </button>
                </td>
                <td style={{ padding: "5px 14px", fontSize: 12, color: "var(--muted)" }}>{p.bestStreak}/{d.moves.length}</td>
                <td style={{ padding: "5px 0", fontSize: 12, color: "var(--muted)" }}>{p.attempts.length}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DeckProgress({ deck, prog }) {
  const total = deck.moves.length;
  return (
    <div>
      <span className="deck-id" style={{ display: "block", marginBottom: 2 }}>{deck.id}</span>
      <h3 style={{ marginBottom: 16 }}>{deck.name}</h3>
      <fieldset style={{ marginBottom: 16 }}>
        <legend>Summary</legend>
        <table style={{ width: "100%" }}>
          <tbody>
            <tr className="stat-row"><td>Best streak</td><td>{prog.bestStreak}/{total}</td></tr>
            <tr className="stat-row"><td>Total attempts</td><td>{prog.attempts.length}</td></tr>
            <tr className="stat-row"><td>Last played</td><td>{formatRelativeDate(prog.lastAttemptDate) || "—"}</td></tr>
          </tbody>
        </table>
      </fieldset>

      {prog.attempts.length === 0
        ? <p className="meta">No attempts yet.</p>
        : <fieldset>
            <legend>Attempt history</legend>
            <table className="attempts-table" style={{ width: "100%" }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Streak</th>
                  <th>Wrong</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {[...prog.attempts].reverse().map((att, i) => {
                  const num = prog.attempts.length - i;
                  return (
                    <tr key={i}>
                      <td>{num}{att.abandoned ? " ↩" : ""}</td>
                      <td>{att.finalStreak}/{total}</td>
                      <td>{att.wrongMoves.length === 0 ? "—" : att.wrongMoves.map(mv => `M${mv + 1}`).join(", ")}</td>
                      <td>{formatRelativeDate(att.date)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </fieldset>
      }
    </div>
  );
}
