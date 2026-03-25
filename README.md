# GraphQuery — Business Intelligence Graph System

A context graph system with LLM-powered conversational query interface for exploring business process flows.

## Architecture

**Database**: sql.js (SQLite in-browser via WASM) — zero infrastructure, full SQL, deterministic results

**Graph**: Cytoscape.js + fcose layout — interactive DAG visualization with expand-on-click

**LLM**: Two-pass design — Pass 1 generates SQL from natural language, Pass 2 narrates results. Fully grounded: model only sees actual query rows.

**Stack**: React 18 + Vite, Cytoscape.js, sql.js (SQLite WASM), IBM Plex Mono fonts

## Why These Choices

**SQL.js in-browser**: No backend infrastructure needed. Data loads from public/sap-o2c-data/ JSONL files. Queries execute client-side with deterministic results. Perfect for demos and assignments.

**Cytoscape.js + fcose layout**: True graph visualization with force-directed layout. Smooth interactions (node click, expand, pan/zoom). Better than canvas/SVG for interactive graphs.

**Two-pass LLM design**: Pass 1 (LLM) generates SQL from natural language. SQL executes locally. Pass 2 (LLM) narrates results with grounding. Prevents hallucination since LLM only sees real query data.

## Graph Model

**Business flow**: Customer → Sales Order → SO Items → Delivery → Billing Document → Journal Entry

**Node Types & Relationships**:
- `BusinessPartner` (Customer): Contains aggregated customer data, used to qualify entire orders
- `SalesOrder`: Order placed by customer, references soldToParty (BusinessPartner.businessPartner)
- `SalesOrderItem`: Line items in a sales order, references material (Product) and plant (Plant)
- `Product`: Material master data with descriptions and categories
- `Plant`: Warehouse/facility where goods are stored/shipped from
- `OutboundDelivery`: Shipment for customers, key milestone in O2C flow
- `BillingDocument`: Invoice created from sales order, key revenue recognition point
- `JournalEntry`: Accounting records linked to billingDocument via accountingDocument field

**Key Edges**:
- SalesOrder → OutboundDelivery (via shared soldToParty party key)
- OutboundDelivery → BillingDocument (invoice follows delivery)
- BillingDocument → JournalEntry (accounting records)
- SalesOrderItem → Product (material reference)

## LLM Prompting Strategy

**System Prompt**: Full database schema (tables, columns, relationships) injected at runtime from `database.js` DB_SCHEMA export.

**SQL Generation** (Pass 1):
- Model generates ONLY valid SQLite queries
- Enforces JSON output: `{"type":"query","sql":"...","explanation":"..."}` or `{"type":"off_topic"}`
- Low temperature (0.1) for deterministic output
- Includes examples of both ON-topic and OFF-topic queries

**Result Narration** (Pass 2):
- Model receives actual SQL results from database
- Generates natural language summary grounded in real data
- Model has no ability to generate data — only summarize what query returned

**Guardrails**:

Off-topic queries are REJECTED with domain-restriction message:
- "What is the capital of France?" → Rejected ✓
- "Write me a poem about SAP" → Rejected ✓  
- "How do I code a binary search in Python?" → Rejected ✓
- "Which products have the most billing documents?" → Allowed (ON-topic) ✓

Detection logic in system prompt rule #1: Queries unrelated to {orders, deliveries, billing, customers, products, etc.} return `{"type":"off_topic"}` response.

## Setup (Local Development)

### Prerequisites
- Node.js 18+ and npm

### Installation & Running

```bash
# Clone repo
git clone <repo-url>
cd graph-query-system

# Install dependencies
npm install

# Create environment file
echo "VITE_GROQ_API_KEY=your_key_here" > .env

# Start dev server
npm run dev    # Open http://localhost:5173
```

### Environment Variables

**REQUIRED** for the chat interface:

- `VITE_GROQ_API_KEY`: Groq API key (get from https://console.groq.com)
  - Used for LLM queries (SQL generation + result narration)
  - Must have access to llama-3.3-70b-versatile model
  - NOT commited to git (in .gitignore)

### Build for Production

```bash
npm run build    # Creates dist/ folder
```

The dist/ folder is ready to deploy to Netlify, Vercel, or any static host.

## Deployment (Netlify / Vercel)

### Option 1: Netlify

1. Push code to GitHub (make sure `.env` is in `.gitignore`)
2. Go to https://app.netlify.com → New Site → Import from Git
3. Select repository and branch
4. Build command: `npm run build`  
5. Publish directory: `dist`
6. Under "Site settings" → "Build & deploy" → "Environment":
   - Add variable: `VITE_GROQ_API_KEY` = your Groq API key
7. Deploy → site goes live

### Option 2: Vercel

1. Push code to GitHub
2. Go to https://vercel.com → New Project → Import Git Repo
3. Select repository
4. Build command: `npm run build`
5. Output directory: `dist`
6. Under "Environment Variables":
   - Add `VITE_GROQ_API_KEY` = your Groq API key
7. Deploy → site goes live

Both platforms will rebuild automatically on git push.

## Assignment Queries (Test These)

The system is designed to answer these 3 key business questions:

### Query A: "Which products are associated with the highest number of billing documents?"
**What it tests**: Product-to-billing join via material field in billing_document_items
**Expected**: Lists products with counts, ordered by frequency
**Schema hint**: `billing_document_items.material → products.material`

### Query B: "Trace the full flow of a sales order [ID]"
**What it tests**: Multi-step joins across O2C flow
**Expected**: Shows SalesOrder → Delivery → Billing → Journal Entry chain with actual IDs
**Example data**: SO1001, SO1003, SO1005 (SO1005 has incomplete flow)

### Query C: "Show sales orders with incomplete or broken flows"
**What it tests**: LEFT JOIN logic to find missing milestones
**Expected**: Returns SO IDs where delivery OR billing is missing
**Broken flow definition**: 
```sql
SELECT soh.salesOrder FROM sales_order_headers soh
LEFT JOIN outbound_delivery_headers odh ON odh.soldToParty = soh.soldToParty
LEFT JOIN billing_document_headers bdh ON bdh.soldToParty = soh.soldToParty
WHERE odh.outboundDelivery IS NULL OR bdh.billingDocument IS NULL
```

## Dataset Anomalies (for query testing)
- **SO1005, SO1008**: Orders with no delivery and no billing (open orders) — test broken flow detection
- **SO1003**: Partial delivery — 2 of 4 items shipped — test incomplete flows
- **BILL009**: Credit memo with no linked delivery — edge case for flow tracing
