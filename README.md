# 📚 Classroom Tools Hub

A clean, pastel-themed dashboard of **interactive classroom tools** for primary-school teachers — built with plain HTML, Tailwind CSS, and vanilla JavaScript. No build step, no dependencies to install. Just open and teach.

Each tool card shows a **live preview** of the tool running inside it; hover a card to blur its snapshot and reveal a detailed description.

---

## 🎯 The Tools

| # | Tool | What it does |
|---|------|--------------|
| 1 | **Stealth Focus Timer** | Countdown timer that hides the numbers while running (so students focus on the task, not the clock). 15% time-remaining warning, chimes, fullscreen. |
| 2 | **Random Student Picker** | Fair spinning wheel that randomly picks a student from your class list — with confetti for the winner. Save reusable class groups. |
| 3 | **Astro Class HQ** | Space-themed command center: a JSON-powered quiz engine, mission timer, and a live microphone noise sensor with a traffic light. |
| 4 | **Grammar Detective** | Students click the exact wrong word(s) in a sentence to solve each grammar case. 50 ready-to-teach cases across all 11 grammar categories × 3 difficulties + a Case Builder. |
| 5 | **Classroom Scoreboard** | Live team points with rank medals (🥇🥈🥉), random events (Double Points, Steal, Shield, Mystery…), multi-round scoring, and a podium + confetti winner screen. |
| 6 | **Vocabulary Battlefield** | 2–6 teams start at 100 HP and battle by answering vocabulary questions across 13 topics × 8 question types. Correct answers attack opponents. Earnable power-ups + champion podium. |

---

## 🚀 How to run

The dashboard uses **live iframe previews**, which browsers block when opened directly from `file://`. So run it from a tiny local server:

### Option A — one click (Windows)
Double-click **`start-dashboard.bat`**. It auto-picks a free port, starts the server, and opens the dashboard in your browser. Close the command window to stop it.

### Option B — any platform
From this folder:
```bash
python -m http.server 8000
```
Then open <http://localhost:8000/> in your browser.

> The individual tools (in `tools/`) can also be opened directly by double-clicking their `.html` files — only the dashboard's live previews need a server.

---

## 🗂 Project structure

```
.
├── index.html                       # the dashboard (open this)
├── start-dashboard.bat              # Windows one-click launcher
├── README.md
├── tools/
│   ├── stealth-timer.html
│   ├── random-student-picker.html
│   ├── astro-class-hq.html
│   ├── astro-quiz-activity.json     # sample quiz for Astro Class HQ
│   ├── grammar-detective.html
│   ├── classroom-scoreboard.html
│   └── vocabulary-battlefield.html
└── (original raw source files: message.txt, test 2.0.html, etc.)
```

---

## 🛠 Tech

- **HTML / CSS / vanilla JavaScript** — every tool is a self-contained single file (no framework, no build step).
- **Tailwind CSS** (via CDN) for styling.
- **Font Awesome** icons + **Google Fonts** (Fredoka, Inter, JetBrains Mono).
- **Web Audio API** for sound effects (mute toggle in every tool).
- **localStorage** for persistence (teacher-created grammar cases, custom vocabulary, saved scoreboard sessions).
- **Fullscreen API** for projector use.

No data leaves the teacher's machine — everything runs client-side.

---

Built for everyday teaching. ✏️
