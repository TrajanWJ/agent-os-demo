# Agent OS — Interactive Demo

A fully interactive web app demo showcasing the Agent OS concept: a unified "cockpit" interface for humans to oversee, steer, and collaborate with AI agents.

## Quick Start

```bash
cd /home/trajan/Projects/agent-os-demo
python3 -m http.server 8080
```

Then open: **http://localhost:8080**

## Views

| View | Description |
|------|-------------|
| 📡 Bridge | Main comms hub — agent feed, conversation list, active agents panel |
| ✅ Tasks | Task workspace — queue, active task with live timer, vault outputs |
| 🕸️ Graph | Knowledge graph — force-directed physics, 22 nodes, hover/click |
| 🤖 Agents | Agent gallery — 6 agents with status, detail panels, token usage |
| ⚙️ System | System panel — cron jobs, token budget donut, error stream, webhooks |

## Tech Stack

- Vanilla HTML5 + CSS3 + JavaScript (ES6+)
- No build step, no dependencies
- Canvas API for knowledge graph physics
- SVG for charts and sparklines
- CSS keyframe animations throughout

## Features

- **Responsive**: Desktop sidebar + 3-col layouts; Mobile bottom nav + single-column
- **Live animations**: Blinking cursor, progress shimmer, pulsing status dots, agent card pulse
- **Live timers**: Task elapsed timer (ticks every second), error log stream (rotates every 4s)
- **Physics graph**: Force-directed layout with repulsion, spring edges, center gravity, damping
- **Interactive**: Click agents → detail panel, click graph nodes → slide panel, filter/search graph
- **Design system**: Dark theme with agent color coding throughout

## File Structure

```
agent-os-demo/
├── index.html   — App shell, all views as HTML
├── styles.css   — Full design system, responsive, animations
├── app.js       — All JS: data, render functions, physics, events
└── README.md    — This file
```

## Design System

| Token | Value |
|-------|-------|
| Background | `#0f0f12` |
| Surface | `#16161a` |
| Surface-2 | `#1e1e24` |
| Border | `#2a2a35` |
| Text | `#e8e8f0` |
| Text Secondary | `#8888a0` |
| Accent (Concierge) | `#D4A574` |
| Researcher | `#5B8AF0` |
| Coder | `#4CAF50` |
| Devil's Advocate | `#E74C3C` |
| Vault Keeper | `#9B59B6` |
| Ops | `#F39C12` |
