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
| 7 | **2M Spelling Competition** | Whole-class spelling bee with live scoring, a class-noise meter and match history. |
| 8 | **Beach Scoreboard (Class 2B)** | Beach-themed team scoreboard for the "At the Beach" unit. |
| 9 | **English Battle** | Red vs Blue classroom battle — correct answers strike the other team. |
| 10 | **Verb Power: Present Continuous** | "What are they doing?" picture prompts with instant feedback. |
| 11 | **Feelings Valley Board Game** | Roll-and-move board game drilling emotions vocabulary. |
| 12 | **Interactive Lesson: At the Beach** | Click-through Year 2 lesson deck for Unit 9. |
| 13 | **3D Prepositions Speaking** | Three.js room — say where the apple is (in/on/under/behind). |
| 14 | **Sentence Scramble** | Timed word-order races with a teacher settings panel. |
| 15 | **Weather Around the World** | Group challenge on weather words and world climates. |
| 16 | **English Game Show** | Three-round red-vs-blue game show + optional AI question generator (Gemini key). |
| 17 | **Listening Activity: At the Beach** | Listen-and-find challenges (object, size, colour) with AI audio (Gemini key). |
> **AI-powered extras (Verb Power, 3D Prepositions, English Game Show, Listening Activity):** these were
> authored for a sandbox that auto-injects a Gemini key. On your own site, click the **🔑 AI Key** button
> inside the tool once and paste a free key from [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
> — it is stored only in your browser. Everything else in every tool works without any key.

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
