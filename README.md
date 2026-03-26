# GraphQuery — SAP O2C Graph Query System

**Live Demo:** https://graph-query-system-vikas.vercel.app  
**Repo:** https://github.com/Vikas0262/graph-query-system  

---

## What is this?

This is a graph-based data explorer for SAP Order-to-Cash (O2C) data. You can visually explore how business entities connect — customers, sales orders, deliveries, invoices, journal entries — and ask questions about the data in plain English.

The system converts your question into SQL, runs it against the real dataset, and explains the result in natural language.

---

## How it works

The data lives in JSONL files inside `public/sap-o2c-data/`. When the app loads, it reads all those files and loads them into an in-browser SQLite database (sql.js). The graph is built from that same data using Cytoscape.js.

When you type a question in the chat, it goes to Groq's API (llama-3.3-70b). The model looks at the database schema and generates a SQL query. That query runs locally in the browser, the results come back, and the model explains them in plain English.

No backend. Everything runs in the browser.

---

## Tech stack

- React + Vite
- Cytoscape.js (graph visualization)
- sql.js (SQLite in the browser via WebAssembly)
- Groq API — llama-3.3-70b-versatile (free tier)

---

## Graph model

The O2C business flow is modeled as a directed graph:

```
Business Partner
      ↓
 Sales Order → Sales Order Items → Product
      ↓
Outbound Delivery
      ↓
Billing Document
      ↓
 Journal Entry
```

Each of these is a node. The arrows between them are edges with labels like `PLACED_ORDER`, `FULFILLED_BY`, `BILLED_AS`, `RECORDED_IN`.

---

## Database choice

I used sql.js because it runs SQLite entirely in the browser using WebAssembly. No server needed, no API calls for data, and I still get full SQL with JOINs across all the O2C tables. It loads the JSONL files once on startup and keeps everything in memory.

The tradeoff is that the dataset has to be bundled with the app, but for this assignment that was fine.

---

## LLM prompting strategy

Two API calls happen per question:

**Call 1** — the model receives the full database schema and the user's question. It must respond only with JSON like `{"type":"query","sql":"..."}`. No markdown, no explanation outside the JSON.

**Call 2** — the model gets the actual query results (rows and columns) and writes a plain English answer based only on that data. It cannot make things up because it only sees the real rows.

The schema string includes hints for tricky joins, like how to link products to billing documents through `billing_document_items`.

---

## Guardrails

If someone asks something unrelated to the dataset — general knowledge, coding questions, creative writing — the model is instructed to return `{"type":"off_topic","message":"..."}` instead of answering. The frontend checks for this type and shows a warning message. The model never answers off-topic questions.

---

## Setup

### Prerequisites
- Node.js 18+
- Free Groq API key from https://console.groq.com

### Run locally

```bash
git clone https://github.com/Vikas0262/graph-query-system
cd graph-query-system
npm install
```

Create a `.env` file in the root:

```
VITE_GROQ_API_KEY=your_groq_api_key_here
```

Then start the dev server:

```bash
npm run dev
```

Open http://localhost:5173

---

## Deploy to Vercel

```bash
npm run build
```

Push to GitHub, import the repo in Vercel, and add this environment variable in Vercel's dashboard:

```
VITE_GROQ_API_KEY = your_groq_api_key_here
```

---

## Try these queries

- `Which products are associated with the highest number of billing documents?`
- `Show sales orders that have no delivery`
- `Trace the full flow of a sales order`
- `What is total revenue by customer?`
- `Show all cancelled billing documents`

---

## Folder structure

```
src/
├── data/
│   ├── loader.js         # fetches and parses JSONL files
│   ├── database.js       # sql.js setup and schema
│   └── graphBuilder.js   # builds Cytoscape nodes and edges
├── components/
│   ├── GraphView.jsx     # graph canvas with expand, search, highlights
│   ├── ChatInterface.jsx # chat UI with SQL toggle and result table
│   └── NodeInspector.jsx # node detail panel
├── services/
│   └── llm.js            # Groq API calls
└── App.jsx
public/
└── sap-o2c-data/         # real SAP JSONL dataset files
    └── manifest.json
```

---

## AI tools used

GitHub Copilot, Claude, Groq API (llama-3.3-70b-versatile)