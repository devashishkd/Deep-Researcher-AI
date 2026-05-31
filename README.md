# 🔬 AI Deep Researcher

> A **production-grade**, Gemini Deep Research clone powered by **LangGraph.js**, **Tavily**, **DuckDuckGo**, **Wikipedia**, **NewsAPI**, and **Google Gemini Flash**. Get comprehensive, multi-source, fact-checked research reports with PDF export — in real-time.

---

## 🎯 Features

| Feature | Details |
|---|---|
| 🔀 **LangGraph Agent Loop** | Stateful multi-step graph with conditional fact-check iteration |
| 🔍 **Multi-Source Search** | Tavily + DuckDuckGo + Wikipedia + NewsAPI in parallel |
| 📖 **Deep Scraping** | Mozilla Readability (Firefox Reader Mode) + Cheerio fallback |
| ✅ **Fact-Checking** | Gemini LLM cross-references claims with confidence scores |
| 🔄 **Iterative Research** | Agent loops back if confidence < 60% (up to 3x) |
| 📄 **PDF Export** | Puppeteer renders branded PDF with cover page + citations |
| 📡 **Real-time SSE** | Server-Sent Events stream live progress to the UI |
| 🛡️ **Production-ready** | Rate limiting, CORS, input sanitization, Winston logging |

---

## 🏗️ Architecture

```
User Query
    │
    ▼
[1. PLANNER]        ← Gemini: decompose query into sub-questions + search queries
    │
    ▼
[2. SEARCHER]       ← Tavily + DuckDuckGo + Wikipedia + NewsAPI (parallel)
    │
    ▼
[3. SCRAPER]        ← Readability + Cheerio deep-scrape top URLs
    │
    ▼
[4. FACT-CHECKER]   ← Gemini: cross-reference claims, assign confidence
    │
    ├─(low confidence)──────────────────────────────────────────┐
    │                                                            │
    ▼ (high confidence)                                         ▼
[5. SYNTHESIZER]    ← Gemini: write structured report       [SEARCHER] (loop)
    │
    ▼
[6. PDF GENERATOR]  ← Puppeteer: branded PDF with cover + citations
```

---

## 📁 Folder Structure

```
Ai-Deep-Researcher/
├── server/
│   ├── src/
│   │   ├── agents/
│   │   │   ├── graph.ts              # LangGraph graph + runner
│   │   │   ├── state.ts              # Agent state annotations
│   │   │   └── nodes/
│   │   │       ├── planner.ts        # Query decomposition
│   │   │       ├── searcher.ts       # Multi-source search
│   │   │       ├── scraper.ts        # Deep web scraping
│   │   │       ├── factChecker.ts    # Cross-reference & validate
│   │   │       └── synthesizer.ts    # Report generation
│   │   ├── services/
│   │   │   ├── gemini.service.ts     # Gemini 1.5 Flash
│   │   │   ├── tavily.service.ts     # Tavily search API
│   │   │   ├── duckduckgo.service.ts # DDG (no API key)
│   │   │   ├── wikipedia.service.ts  # Wikipedia API
│   │   │   ├── news.service.ts       # NewsAPI
│   │   │   ├── scraper.service.ts    # Readability + Cheerio
│   │   │   └── pdf.service.ts        # Puppeteer PDF
│   │   ├── routes/
│   │   │   ├── research.routes.ts
│   │   │   └── pdf.routes.ts
│   │   ├── middleware/
│   │   │   ├── errorHandler.ts
│   │   │   └── rateLimiter.ts
│   │   ├── utils/
│   │   │   ├── logger.ts
│   │   │   ├── cache.ts              # Session + SSE registry
│   │   │   └── sanitize.ts
│   │   └── app.ts
│   └── .env.example
│
└── client/
    └── src/
        ├── components/
        │   ├── SearchPanel/          # Query input
        │   ├── ProgressTracker/      # Live SSE steps
        │   ├── ReportViewer/         # Final report
        │   ├── FactBadge/            # Fact-check cards
        │   └── SourceCard/           # Source citations
        ├── hooks/
        │   ├── useResearch.ts        # Session state
        │   └── useSSE.ts             # SSE consumer
        └── pages/
            └── Home.tsx
```

---

## 🚀 Quick Start

### 1. Get Free API Keys

| Service | Link | Free Tier |
|---|---|---|
| **Gemini Flash** | [aistudio.google.com](https://aistudio.google.com) | 15 RPM, 1M tokens/day |
| **Tavily** | [tavily.com](https://tavily.com) | 1000 searches/month |
| **NewsAPI** | [newsapi.org](https://newsapi.org) | 100 req/day (optional) |
| **DuckDuckGo** | No key needed | Unlimited |
| **Wikipedia** | No key needed | Unlimited |

### 2. Configure Environment

```bash
cd server
cp .env.example .env
# Fill in your API keys in .env
```

### 3. Install & Run

```bash
# Terminal 1 — Server
cd server
npm install
npm run dev

# Terminal 2 — Client
cd client
npm install
npm run dev
```

### 4. Open App
Navigate to **http://localhost:5173**

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/research` | Start research session |
| `GET` | `/api/research/:id/stream` | SSE live progress stream |
| `GET` | `/api/research/:id/report` | Get final report JSON |
| `GET` | `/api/research/:id/status` | Quick status check |
| `GET` | `/api/pdf/:id` | Download PDF report |

---

## 🧠 Interview Talking Points

1. **LangGraph stateful agent** with conditional edges — not a simple chain
2. **4+ data sources** searched in parallel for maximum coverage
3. **Iterative fact-checking loop** — agent self-corrects when confidence is low
4. **Prompt injection protection** via sanitization before any LLM call
5. **SSE streaming** for real-time UX without WebSocket complexity
6. **Puppeteer PDF** with custom-designed branded cover page
7. **Rate limiting + session management** — production concerns addressed
8. **TypeScript end-to-end** — type-safe from agent state to React components

---

## 🛠️ Tech Stack

- **LangGraph.js** — Stateful agent orchestration
- **Google Gemini 1.5 Flash** — Planning, fact-checking, synthesis
- **Tavily** — AI-optimized web search
- **DuckDuckGo** — Free HTML search scraping
- **Wikipedia API** — Factual grounding
- **NewsAPI** — Recent news (optional)
- **Mozilla Readability** — Article extraction
- **Cheerio** — HTML parsing fallback
- **Puppeteer** — PDF generation
- **Express.js** — REST + SSE server
- **React 18 + Vite** — Frontend
- **Winston** — Structured logging
# Deep-Researcher-AI
