# RecoverAI — Autonomous AI-Powered Revenue Recovery & Anti-Churn Engine

> **Razorpay Hackathon Submission — Track 03: Autonomous Revenue Recovery & Smart Payment Retries**

RecoverAI is an enterprise-grade, closed-loop **Autonomous AI Revenue Recovery Engine** designed to eliminate failed payment revenue loss, checkout abandonment, and subscription churn. Built with **Google Gemini 2.0 Flash AI**, zero-trust policy guardrails, and real-time state machine orchestration, RecoverAI dynamically diagnoses payment failures and autonomously executes optimal recovery actions.

---

## 🌟 Key Architectural Highlights

* **🤖 Multi-LLM AI Failure Diagnostic Engine**: Powered by Google Gemini 2.0 Flash (`gemini-2.0-flash`), OpenAI GPT-4o, and an offline deterministic Expert Rule Engine.
* **🛡️ Zero-Trust Guardrail Policy Engine**: Evaluates max discount caps, customer opt-out status, and max retry limits before any recovery action is executed to prevent merchant financial loss.
* **⚡ Closed-Loop State Machine Lifecycle**: Tracks payment attempts from ingestion (`DETECTED`) $\rightarrow$ risk scoring (`ANALYZING`) $\rightarrow$ AI root cause analysis (`ACTION_PLANNED`) $\rightarrow$ policy validation (`ACTION_SCHEDULED`) $\rightarrow$ outcome resolution (`RESOLVED_RECOVERED`).
* **💳 Merchant Storefront Checkout UI (`/checkout`)**: Live realistic payment gateway integration supporting Cards, UPI, NetBanking, and Auto-Debit Mandates.
* **🧪 Synthetic Evaluation & Benchmarking Suite (`/simulator`)**: Batch evaluation harness executing 25-case and 50-case benchmark runs across all Track 03 failure scenarios.
* **⏩ Time-Travel Fast-Forward Engine**: Accelerates scheduled 6-hour and 24-hour retry windows into instant execution for evaluator testing.
* **💾 Single Payment Document Guarantee**: MongoDB persistence model enforcing exact 1:1 payment document integrity across server restarts.

---

## 📐 System Architecture & Pipeline Flow

```
                      [ Merchant Storefront Checkout / Webhook Ingestion ]
                                               │
                                               ▼
                                  POST /api/payments/attempt
                                               │
                                               ▼
                                 [ Gateway Simulator Engine ]
                                               │
                                       (Payment FAILED)
                                               │
                                               ▼
                              [ Single Payment Document MongoDB ]
                                               │
                                               ▼
                             eventService.ingestPaymentFailure()
                                               │
                     ┌─────────────────────────┴─────────────────────────┐
                     ▼                                                   ▼
            [ Risk Eligibility Engine ]                        [ State Machine Engine ]
                     │                                         DETECTED -> ANALYZING
                     ▼                                                   │
          (Revenue At Risk Calculated)                                   ▼
                     │                                         ANALYZING -> ELIGIBLE
                     └─────────────────────────┬─────────────────────────┘
                                               │
                                               ▼
                              [ AI Failure Diagnostic Agent ]
                          (Google Gemini 2.0 Flash / OpenAI / Rules)
                                               │
                                               ▼
                                     ACTION_PLANNED
                                               │
                                               ▼
                            [ Zero-Trust Guardrail Policy Engine ]
                                               │
                                    (APPROVED / MODIFIED)
                                               │
                                               ▼
                                    ACTION_SCHEDULED
                                               │
                                               ▼
                            [ Autonomous Tool Action Executor ]
                         (Schedule Retry / Send Email & WhatsApp Link)
                                               │
                                               ▼
                        [ Real-Time Audit Trail & Case Drawer ]
```

---

## 🎯 Supported Track 03 Failure Scenarios

RecoverAI natively handles all 7 core revenue leak scenarios:

| # | Failure Scenario | Root Cause Category | Autonomous AI Recovery Strategy |
| :--- | :--- | :--- | :--- |
| **1** | `INSUFFICIENT_FUNDS` | Temporary Liquidity Issue | Schedules optimal retry after customer salary/pay credit window. |
| **2** | `CHECKOUT_ABANDONED_SESSION` | Checkout Abandonment | Generates dynamic single-touch recovery link with 30m reservation timer. |
| **3** | `RECURRING_MANDATE_DECLINED` | Failed Subscription | Schedules secondary mandate debit execution window. |
| **4** | `OVERDUE_INVOICE_30D` | Overdue Receivables | Dispatches automated WhatsApp reminder with direct invoice portal link. |
| **5** | `PAYMENT_DEGRADATION_WARNING` | Payment Degradation | Detects consecutive gateway route issues and escalates to merchant. |
| **6** | `BANK_SERVER_DOWN` | Mandate Retry / Timeout | Triggers fast 60m retry as technical outages resolve quickly. |
| **7** | `PROMISE_TO_PAY_PENDING` | Promise-to-Pay (PTP) | Pauses retries until customer's promised payment commitment date. |

---

## 🚀 Quick Start & Installation Guide

### Prerequisites
* **Node.js**: `v18.0.0` or higher
* **MongoDB**: Local instance running at `mongodb://127.0.0.1:27017/recoverai` (or MongoDB Atlas URI)
* **npm**: `v9.0.0` or higher

---

### Step 1: Clone & Setup Backend API

```bash
cd backend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Start development server
npm run dev
```

* Backend API will start running at `http://localhost:5000`.

#### Configuring Google Gemini 2.0 Flash (Optional for Live LLM Mode):
In `backend/.env`:
```env
AI_PROVIDER=gemini
AI_API_KEY=your_actual_google_gemini_api_key
AI_MODEL=gemini-2.0-flash
```

---

### Step 2: Setup Frontend Web Application

Open a new terminal window:

```bash
cd frontend

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Start Next.js development server
npm run dev
```

* Frontend Next.js Web App will run at `http://localhost:3000` (or `http://localhost:3001`).

---

## 🧪 Running Automated Unit & Integration Tests

The backend includes a comprehensive Vitest integration test suite covering state machine transitions, gateway simulations, policy guardrails, AI diagnostic schema validations, and closed-loop checkout recovery.

```bash
cd backend
npm test
```

### Verification Result:
```text
 Test Files  17 passed (17)
      Tests  89 passed (89)
   Duration  4.59s
```

---

## 📡 API Endpoint Reference

### 1. Payments API
* `POST /api/payments/attempt` — Initiates a realistic payment attempt, processes transaction through Gateway Simulator, and ingests failures into the closed-loop AI recovery pipeline.
* `GET /api/payments` — Returns paginated payment history with status metadata.

### 2. Events & Recovery Cases API
* `POST /api/events/webhook` — Razorpay webhook ingestion endpoint with idempotency checks.
* `POST /api/events/simulate` — Triggers an out-of-band synthetic payment failure event.
* `POST /api/events/simulator/benchmark` — Executes batch evaluation suites across 20, 25, or 50 synthetic failure cases.
* `POST /api/events/simulator/fast-forward` — Fast-forwards time (+1h, +6h, +24h) to trigger scheduled background retries.
* `GET /api/events/cases` — Lists recovery cases with state filtering.
* `GET /api/events/cases/:caseId` — Fetches full case details including payment metadata, AI decision, policy verdict, and complete audit logs.
* `POST /api/events/cases/:caseId/resolve` — Resolves case outcome (`SUCCESS` or `FAILURE`).
* `GET /api/events/metrics` — Returns financial metrics (Total Revenue At Risk, Total Money Recovered, Batch Recovery Rate %).

---

## 👥 Razorpay Evaluator 60-Second Demo Walkthrough

1. **Test Real Merchant Storefront Checkout**:
   * Navigate to [`http://localhost:3000/checkout`](http://localhost:3000/checkout).
   * Enter customer details, select **Card** or **UPI**, and click **Simulate Failed Payment (Insufficient Funds)**.
   * Watch real-time API response return `HTTP 201 Created` with live payment ID.

2. **Inspect Closed-Loop AI Recovery Case & Audit Log**:
   * Open Dashboard Cases at [`http://localhost:3000/cases`](http://localhost:3000/cases).
   * Click on the newly created case row to open the **Case Audit Drawer**.
   * View **Tab 1 (Payment Metadata)**, **Tab 2 (AI Diagnostic Reasoning & Gemini Classification)**, **Tab 3 (Policy Guardrail Verdict)**, and **Tab 4 (State Machine Audit Trail)**.

3. **Run 50-Case Batch Evaluation Benchmark**:
   * Navigate to [`http://localhost:3000/simulator`](http://localhost:3000/simulator).
   * Click **Run 50-Case Full Evaluation**.
   * View live recovery metrics: **Total Money Recovered**, **Recovery Rate %**, **AI Diagnostic Accuracy %**, and **Average Pipeline Execution Latency**.

---

## 🛠️ Built With

* **Frontend**: Next.js 14 (App Router), React 18, TailwindCSS, Lucide Icons.
* **Backend**: Node.js, Express.js, MongoDB (Mongoose), Redis, Vitest, Supertest, Zod.
* **AI Engine**: Google Gemini 2.0 Flash API (`gemini-2.0-flash`), OpenAI API, Deterministic Expert Rule Engine.

---

## 📄 License

Developed for the **Razorpay Hackathon Track 03** — All Rights Reserved.
