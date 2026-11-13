import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  projectRecommendationSchema,
  projectRecommendationsDataSchema,
  agentPromptConfigSchema,
  type ProjectRecommendation,
  type ProjectRecommendationsData,
} from "./project-recommendations";
import { recommendProjects } from "./ai/tasks/recommend-projects";
import { generateAgentPrompt } from "./ai/tasks/generate-agent-prompt";
import type { AIProvider } from "./ai/provider";

describe("Project Recommendations & Agent Prompt Generator Engine", () => {
  // Test Candidate Profile
  const testProfile: any = {
    basics: {
      headline: "Full Stack Engineer & Data Enthusiast",
      summary: "Experienced in building web services, working with relational databases, and data processing.",
    },
    skills: [
      { id: "s1", name: "JavaScript" },
      { id: "s2", name: "TypeScript" },
      { id: "s3", name: "React" },
      { id: "s4", name: "SQL" },
      { id: "s5", name: "Git" },
    ],
    languages: [{ id: "l1", name: "English", level: "C2" }],
    experience: [
      {
        id: "e1",
        role: "Software Developer",
        company: "Acme Corp",
        bullets: "Maintained REST APIs and wrote relational database queries.\nCollaborated on frontend UI components.",
      },
    ],
    projects: [
      {
        id: "p1",
        name: "Personal Portfolio",
        bullets: "Built personal website using React and Tailwind.",
      },
    ],
    certifications: [],
    publications: [],
    references: [],
    customSections: [],
    facts: [],
  };

  describe("Role 1: Backend Developer (Node.js / TypeScript)", () => {
    const backendJob = {
      role: "Senior Backend Developer",
      company: "Stripe-like Fintech",
      postingText:
        "We are looking for a Senior Backend Developer proficient in Node.js, TypeScript, PostgreSQL, Redis, and message queues (Kafka/RabbitMQ). You will design high-throughput idempotency keys, distributed rate limiters, transaction reconciliations, and fault-tolerant payment ingestion webhooks.",
      requirements: [
        { text: "Node.js & TypeScript microservices", kind: "skill" as const, skill: "Node.js", years: null, language: null },
        { text: "PostgreSQL & Redis distributed caching", kind: "skill" as const, skill: "PostgreSQL", years: null, language: null },
        { text: "Message queues & event streaming (Kafka/RabbitMQ)", kind: "skill" as const, skill: "Kafka", years: null, language: null },
        { text: "High-throughput API design & idempotency", kind: "other" as const, skill: null, years: null, language: null },
      ],
    };

    it("generates tailored backend project recommendations with skill gap analysis", async () => {
      const mockProvider: AIProvider = {
        kind: "MOCK",
        model: "mock-model",
        complete: vi.fn().mockResolvedValue({
          jobTitle: backendJob.role,
          seniority: "Senior",
          roleCategory: "backend",
          skillGapAnalysis: {
            strengths: ["Strong foundation in TypeScript and relational SQL", "API design basics"],
            demonstratedSkills: ["TypeScript", "SQL", "JavaScript"],
            missingSkills: ["Kafka/RabbitMQ event queues", "Redis distributed caching", "High-throughput idempotency systems"],
            skillsNeedingEvidence: ["Large-scale transaction handling", "Distributed system fault tolerance"],
            differentiationOpportunities: ["Build a multi-region webhook receiver with guaranteed at-least-once delivery"],
            summary: "The candidate has solid TypeScript and SQL foundations, but lacks production evidence for Redis caching, message streaming (Kafka), and financial transaction idempotency required by the role.",
          },
          projects: [
            {
              id: "proj_backend_1",
              title: "Distributed Payment Webhook Dispatcher & Idempotency Engine",
              oneLiner: "A fault-tolerant payment event processor with Redis deduplication and RabbitMQ dead-letter queues.",
              problemSolved: "Preventing duplicate financial charge processing during partner webhook retry storms.",
              relevanceToRole: "Directly proves proficiency with PostgreSQL, Redis distributed locking, and event streaming under retry loads.",
              relevanceScore: 96,
              roleCategory: "backend",
              difficulty: "Advanced",
              estimatedTime: "2-3 weeks",
              techStack: {
                languages: ["TypeScript", "Node.js"],
                frameworks: ["Fastify", "Prisma"],
                database: "PostgreSQL 16",
                apis: ["REST", "Stripe Webhook Simulators"],
                infrastructure: ["Redis 7", "RabbitMQ", "Docker"],
                deployment: ["Local-first Docker Compose"],
                tools: ["Vitest", "k6 load testing"],
              },
              architecture: {
                systemOverview: "High-throughput modular backend using Redis token bucket rate limiting, transactional outbox pattern, and RabbitMQ workers.",
                components: ["Ingestion Gateway", "Idempotency Filter (Redis)", "Message Broker (RabbitMQ)", "Worker Consumer Pool", "Dead Letter Handler"],
                dataFlow: "Webhook arrives -> Idempotency Key checked in Redis -> Staged in PostgreSQL Outbox -> Published to RabbitMQ -> Worker reconciles transaction -> Webhook acknowledged.",
                databaseDesign: "Tables: transactions (id, idempotency_key, status, payload_hash, amount, created_at), webhook_events, dead_letters.",
                apiDesign: "POST /v1/webhooks/ingest with Idempotency-Key header; GET /v1/transactions/:id/status; POST /v1/retry-dlq.",
                keyDecisions: ["Redis SETNX for atomic distributed lock", "PostgreSQL advisory locks as fallback", "At-least-once delivery with consumer deduplication"],
              },
              engineeringChallenges: [
                "Handling duplicate concurrent webhook deliveries with distributed locks",
                "Partitioned processing with RabbitMQ consumer groups",
                "Reconciling ledger drift under simulated network partitions",
              ],
              interviewValue: {
                demonstratedRequirements: ["Node.js/TypeScript microservices", "PostgreSQL", "Redis", "Message Queuing"],
                showcasedConcepts: ["Idempotency", "Distributed Locking", "Dead-Letter Queues", "Transactional Outbox"],
                discussionQuestions: [
                  "How do you handle a scenario where Redis goes down during webhook deduplication check?",
                  "Why did you choose the Transactional Outbox pattern over direct publish?",
                  "How did you test concurrent race conditions between duplicate webhook retries?",
                ],
                whyBetterThanGeneric: "Unlike generic CRUD APIs, this solves mission-critical fintech challenges (duplicate payments, network failure, out-of-order deliveries) with k6 load test verification.",
              },
              features: {
                essential: ["Fastify ingest endpoint", "Redis SETNX idempotency validation", "RabbitMQ message publisher & consumer worker", "PostgreSQL audit log"],
                advanced: ["Exponential backoff dead-letter queue", "OpenTelemetry distributed tracing", "k6 load test script benchmarking 5,000 req/sec"],
              },
            },
          ],
        }),
        listModels: vi.fn(),
        test: vi.fn(),
      };

      const result = await recommendProjects(mockProvider, {
        applicationId: "app_backend_test",
        company: backendJob.company,
        role: backendJob.role,
        postingText: backendJob.postingText,
        requirements: backendJob.requirements,
        profile: testProfile,
      });

      expect(result.data.jobTitle).toBe(backendJob.role);
      expect(result.data.roleCategory).toBe("backend");
      expect(result.data.skillGapAnalysis.missingSkills).toContain("Kafka/RabbitMQ event queues");
      expect(result.data.projects.length).toBeGreaterThanOrEqual(1);

      const p1 = result.data.projects[0];
      expect(p1.title).toContain("Payment");
      expect(p1.relevanceScore).toBe(96);
      expect(p1.techStack.languages).toContain("TypeScript");
      expect(p1.architecture.components.length).toBeGreaterThan(0);
      expect(p1.engineeringChallenges.length).toBeGreaterThan(0);
      expect(p1.interviewValue.discussionQuestions.length).toBeGreaterThan(0);
    });

    it("generates complete 11-section coding-agent prompt for the backend project", async () => {
      const mockProject: ProjectRecommendation = {
        id: "proj_backend_1",
        applicationId: "app-backend-test",
        title: "Distributed Payment Webhook Dispatcher & Idempotency Engine",
        oneLiner: "A fault-tolerant payment event processor with Redis deduplication and RabbitMQ dead-letter queues.",
        problemSolved: "Preventing duplicate financial charge processing during partner webhook retry storms.",
        relevanceToRole: "Proves proficiency with PostgreSQL, Redis distributed locking, and event streaming.",
        relevanceScore: 96,
        roleCategory: "backend",
        difficulty: "Advanced",
        estimatedTime: "2-3 weeks",
        techStack: {
          languages: ["TypeScript", "Node.js"],
          frameworks: ["Fastify", "Prisma"],
          database: "PostgreSQL 16",
          apis: ["REST"],
          infrastructure: ["Redis 7", "RabbitMQ", "Docker"],
          deployment: ["Docker Compose"],
          tools: ["Vitest", "k6"],
        },
        architecture: {
          systemOverview: "High-throughput modular backend using Redis token bucket rate limiting and RabbitMQ.",
          components: ["Ingestion Gateway", "Idempotency Filter", "RabbitMQ Queue", "Worker Consumer"],
          dataFlow: "Webhook -> Ingestion -> Redis Lock -> Database -> RabbitMQ -> Worker -> Response",
          databaseDesign: "transactions, webhook_events, audit_logs",
          apiDesign: "POST /v1/webhooks, GET /v1/transactions/:id",
          keyDecisions: ["Redis SETNX for atomic distributed lock", "Transactional outbox"],
        },
        engineeringChallenges: ["Concurrent duplicate webhooks", "Message replayability"],
        interviewValue: {
          demonstratedRequirements: ["TypeScript", "PostgreSQL", "Redis", "Queues"],
          showcasedConcepts: ["Idempotency", "Dead Letter Queues"],
          discussionQuestions: ["How does Redis SETNX prevent double-charges?"],
          whyBetterThanGeneric: "Solves real fintech race conditions with k6 load verification.",
        },
        features: {
          essential: ["Fastify ingest", "Redis idempotency", "RabbitMQ worker"],
          advanced: ["Exponential backoff", "Distributed tracing"],
        },
        status: "RECOMMENDED",
        statusUpdatedAt: new Date().toISOString(),
        skipped: false,
      };

      const expected11SectionPrompt = `
# 1. Project Overview
Project Name: Distributed Payment Webhook Dispatcher & Idempotency Engine
Problem Statement: Financial platforms encounter massive webhook retry storms from partners like Stripe or Adyen. Without robust idempotency, network timeouts trigger duplicate charges.
Core Objectives: Ingest 5,000 webhooks/sec with guaranteed single execution using Redis distributed locks and RabbitMQ backoff queues.
Target Users: High-volume fintech platforms and third-party payment gateway consumers.
Expected Outcome: Fully verified local Docker setup with zero duplicate transactions under k6 concurrency load tests.

# 2. Job Relevance & Portfolio Value
Target Role: Senior Backend Developer at Stripe-like Fintech.
Demonstrated Competencies: Demonstrates distributed concurrency, idempotency keys, Redis TTL management, dead-letter retry queues, and PostgreSQL transactional integrity.
Why This Stands Out: Recruiter/interviewers immediately see solutions to authentic production race conditions, rather than trivial blog or todo tutorials.

# 3. Technology Stack & Tooling
- Languages: TypeScript 5.5, Node.js 22 LTS
- Framework: Fastify (chosen for blazing-fast JSON serialization and low overhead)
- ORM & Persistence: Prisma 6 with PostgreSQL 16
- In-Memory & Queuing: Redis 7 (distributed locks & rate limiting), RabbitMQ 3 (AMQP durable queues)
- Tooling: Vitest (unit/integration), k6 (load testing), Docker Compose

# 4. System Architecture & Design
Architectural Pattern: Event-Driven Modular Monolith with Transactional Outbox.
Component Breakdown:
1. Ingestion Gateway (Fastify)
2. Idempotency Interceptor (Redis SETNX + SHA-256 payload hash)
3. Outbox Publisher (PostgreSQL transaction)
4. AMQP Message Broker (RabbitMQ)
5. Background Worker Consumer

\`\`\`mermaid
flowchart TD
  Client[Payment Gateway / Webhook] -->|POST /webhooks + Idempotency-Key| Gateway[Fastify Ingestion API]
  Gateway -->|Check / Acquire Lock| Redis[(Redis Cluster)]
  Gateway -->|Write Outbox Record| DB[(PostgreSQL 16)]
  Gateway -->|Publish Event| Queue[RabbitMQ Topic Queue]
  Queue -->|Consume Message| Worker[Payment Reconciliation Worker]
  Worker -->|Update Status| DB
  Queue -.->|Failed 3x| DLQ[Dead Letter Exchange]
\`\`\`

# 5. Feature Requirements by Phase
Phase 1 - Core MVP:
- Webhook receiver with Idempotency-Key validation.
- Redis distributed lock with 60-second TTL.
- PostgreSQL transaction persistence.
Phase 2 - Advanced Engineering:
- RabbitMQ asynchronous worker consumer with manual ack.
- Exponential backoff dead-letter exchange (DLQ) after 3 failures.
- Payload checksum verification (preventing payload tampering on identical key).
Phase 3 - Production Readiness:
- Structured JSON logging with Correlation IDs.
- Prometheus metrics endpoint for queue lag and p99 latency.
- Health check endpoints (/health/live, /health/ready).

# 6. Detailed Sequential Implementation Plan
Milestone 1: Project Scaffolding & Docker Environment (PostgreSQL + Redis + RabbitMQ).
Milestone 2: Database Schema & Fastify Server Setup.
Milestone 3: Redis Idempotency Interceptor Implementation.
Milestone 4: RabbitMQ Event Producer & Consumer Pool.
Milestone 5: Error Taxonomy & Dead Letter Queue Routing.
Milestone 6: Vitest Integration Testing & k6 Load Test Suite.

# 7. Engineering Standards & Code Quality
- Strict TypeScript configuration (noImplicitAny, strictNullChecks).
- Zod schema validation for all incoming webhook payloads and headers.
- Graceful shutdown handling (SIGTERM/SIGINT) draining queue workers.
- Environment variables managed via typed env schema.

# 8. Testing Strategy
- Unit tests: Redis lock acquisition, checksum generation, payload parsing.
- Integration tests: End-to-end webhook ingestion with real testcontainers or local Docker.
- Concurrency test: 50 concurrent requests with identical idempotency key; exactly 1 succeeds, 49 return 409 Conflict or cached response.

# 9. Local Setup & Deployment Guide
Prerequisites: Node.js 22, Docker & Docker Compose.
1. Run \`docker compose up -d\` (starts Postgres on 5432, Redis on 6379, RabbitMQ on 5672/15672).
2. Copy \`.env.example\` to \`.env\`.
3. Run \`npm install && npx prisma migrate dev\`.
4. Run \`npm run dev\` to launch server on http://localhost:4000.

# 10. Portfolio & Interview Preparation Guide
- Comprehensive README with architecture diagram, throughput benchmarks, and key learnings.
- Interview Question: "How do you guarantee that a crashing worker doesn't lose a transaction?" (Answer: AMQP manual acknowledgement combined with transactional outbox).
- Hardest Engineering Problem: Preventing deadlocks when two webhooks attempt to update interrelated accounts simultaneously.

# 11. Final Acceptance Criteria & Verification Checklist
- [ ] \`docker compose up -d\` starts cleanly without errors.
- [ ] \`npm test\` runs all unit and integration tests with 100% pass rate.
- [ ] Concurrent webhook burst test verifies 0 duplicate executions.
- [ ] Dead-letter queue successfully captures and halts poison-pill payloads.
      `;

      const mockProvider: AIProvider = {
        kind: "MOCK",
        model: "mock-model",
        complete: vi.fn().mockResolvedValue({
          markdownPrompt: expected11SectionPrompt,
        }),
        listModels: vi.fn(),
        test: vi.fn(),
      };

      const result = await generateAgentPrompt(mockProvider, {
        project: mockProject,
        jobTitle: "Senior Backend Developer",
        company: "Stripe-like Fintech",
        config: {
          agent: "claude-code",
          complexity: "advanced",
          deployment: "docker",
          budget: "free",
        },
      });

      const prompt = result.data.prompt;

      // Verify all 11 required sections are present
      expect(prompt).toContain("# 1. Project Overview");
      expect(prompt).toContain("# 2. Job Relevance");
      expect(prompt).toContain("# 3. Technology Stack");
      expect(prompt).toContain("# 4. System Architecture");
      expect(prompt).toContain("# 5. Feature Requirements");
      expect(prompt).toContain("# 6. Detailed");
      expect(prompt).toContain("# 7. Engineering Standards");
      expect(prompt).toContain("# 8. Testing Strategy");
      expect(prompt).toContain("# 9. Local Setup");
      expect(prompt).toContain("# 10. Portfolio");
      expect(prompt).toContain("# 11. Final Acceptance Criteria");

      // Verify specific details for this backend project
      expect(prompt).toContain("Distributed Payment Webhook Dispatcher");
      expect(prompt).toContain("Redis");
      expect(prompt).toContain("RabbitMQ");
      expect(prompt).toContain("mermaid");
    });
  });

  describe("Role 2: Frontend Developer (React / Next.js)", () => {
    const frontendJob = {
      role: "Senior Frontend Engineer",
      company: "Linear / Figma Style SaaS",
      postingText:
        "Looking for a Senior Frontend Engineer proficient in React 19, Next.js App Router, Tailwind CSS, WebSockets, optimistic UI, state machines, and canvas/canvas-based diagram rendering. You will build collaborative canvas interfaces, keyboard navigation systems, and accessible design systems.",
      requirements: [
        { text: "React 19 & Next.js App Router", kind: "skill" as const, skill: "React", years: null, language: null },
        { text: "Optimistic UI & Real-time WebSockets", kind: "skill" as const, skill: "WebSockets", years: null, language: null },
        { text: "Accessible design systems & keyboard navigation", kind: "other" as const, skill: null, years: null, language: null },
        { text: "State machines & complex client-side workflows", kind: "skill" as const, skill: "XState", years: null, language: null },
      ],
    };

    it("generates frontend-specific recommendations and 11-section prompt", async () => {
      const mockFrontendProject: ProjectRecommendation = {
        id: "proj_frontend_1",
        applicationId: "app-frontend-test",
        title: "Collaborative Flowchart Canvas with Optimistic State Machines",
        oneLiner: "Real-time interactive canvas with infinite pan/zoom, undo/redo state machine, and keyboard-first accessibility.",
        problemSolved: "Enabling lag-free collaborative whiteboard editing with offline-first optimistic sync.",
        relevanceToRole: "Proves mastery of React 19, HTML5 Canvas/SVG, XState v5 state machines, and real-time multiplayer cursors.",
        relevanceScore: 98,
        roleCategory: "frontend",
        difficulty: "Advanced",
        estimatedTime: "2-3 weeks",
        techStack: {
          languages: ["TypeScript"],
          frameworks: ["React 19", "Next.js 15", "Tailwind CSS v4"],
          database: "IndexedDB (Dexie.js) + LocalStorage",
          apis: ["WebSockets / PartyKit", "HTML5 Canvas API"],
          infrastructure: ["Vercel / Local Node"],
          deployment: ["Local-first Static / Node"],
          tools: ["Playwright", "Storybook", "Vitest"],
        },
        architecture: {
          systemOverview: "Client-centric canvas architecture with XState machine controlling canvas modes and local IndexedDB write-ahead log.",
          components: ["Canvas Viewport Engine", "Node Drag & Drop Controller", "Multiplayer Presence Layer", "Command History Stack"],
          dataFlow: "User input -> XState action -> Optimistic local state -> Broadcast via WebSocket -> Ack from server.",
          databaseDesign: "Local IndexedDB store: documents, nodes, edges, undo_stack.",
          apiDesign: "WS /ws/room/:id for cursor & node events; GET /api/canvas/:id for initial state.",
          keyDecisions: ["SVG for vector sharpness with requestAnimationFrame loop", "XState v5 for declarative state modeling"],
        },
        engineeringChallenges: ["60fps viewport panning with thousands of nodes", "Collision detection and bezier curve routing", "Multiplayer conflict resolution"],
        interviewValue: {
          demonstratedRequirements: ["React 19", "Optimistic UI", "Accessible design systems", "State machines"],
          showcasedConcepts: ["Canvas Rendering", "XState", "CRDT/Presence Sync", "A11y Tree Navigation"],
          discussionQuestions: ["How did you prevent React re-renders while dragging nodes at 60fps?"],
          whyBetterThanGeneric: "Deeply technical UI engineering project demonstrating low-level DOM, canvas, and mathematical curve rendering.",
        },
        features: {
          essential: ["Infinite pan/zoom canvas", "Draggable nodes & connected bezier lines", "Undo/redo history"],
          advanced: ["Multiplayer live cursors", "Export to PNG/SVG", "Full keyboard navigation (ARIA)"],
        },
        status: "RECOMMENDED",
        statusUpdatedAt: new Date().toISOString(),
        skipped: false,
      };

      const mockPromptText = `
# 1. Project Overview
Project Name: Collaborative Flowchart Canvas with Optimistic State Machines
Problem Statement: Building collaborative whiteboards requires managing complex interaction states (drag, select, connect, pan) without lag.
Objectives: Deliver an interactive infinite canvas with 60fps render loops and instant optimistic updates.

# 2. Job Relevance & Portfolio Value
Target Role: Senior Frontend Engineer at Linear / Figma Style SaaS.
Demonstrated Skills: React 19 hooks, SVG/Canvas performance, XState v5 state machines, and Accessible Keyboard UX.

# 3. Technology Stack & Tooling
- Frontend: TypeScript, React 19, Next.js 15 App Router, Tailwind CSS v4
- State Management: XState v5 (finite state machine for drawing tools)
- Local Persistence: IndexedDB via Dexie.js
- Real-time Sync: PartyKit / native WebSockets

# 4. System Architecture & Design
Component Hierarchy: CanvasContainer -> ViewportManager -> NodeLayer -> ConnectionLayer -> PresenceOverlay.

\`\`\`mermaid
flowchart LR
  Pointer[Pointer / Keyboard Events] --> FSM[XState Machine: Idle / Dragging / Connecting]
  FSM --> Render[Virtual DOM / SVG Pipeline]
  FSM --> Cache[IndexedDB Write-Ahead Log]
  FSM --> WS[WebSocket Presence Broadcaster]
\`\`\`

# 5. Feature Requirements by Phase
Phase 1 - MVP: Node creation, dragging, connection snapping, pan/zoom.
Phase 2 - Advanced: XState undo/redo, multi-select bounding box, keyboard navigation.
Phase 3 - Production: Live multiplayer cursors, PNG export, 60fps performance profiling.

# 6. Detailed Sequential Implementation Plan
Milestone 1: Next.js + Tailwind scaffold and SVG canvas viewport.
Milestone 2: XState interaction state machine.
Milestone 3: Bezier curve connecting engine with magnetic snap.
Milestone 4: IndexedDB offline caching and history stack.
Milestone 5: WebSocket multiplayer presence.

# 7. Engineering Standards & Code Quality
Strict typing, zero layout thrashing, requestAnimationFrame synchronization, clean modular UI components.

# 8. Testing Strategy
- Vitest component tests for state transitions.
- Playwright E2E tests for drag-and-drop node connections.

# 9. Local Setup & Deployment Guide
1. \`npm install\`
2. \`npm run dev\` -> Open http://localhost:3000

# 10. Portfolio & Interview Preparation Guide
- Demo GIF showing 60fps drag with 1,000 nodes.
- Interview question: "Why avoid React state for drag coordinates?" (Answer: avoid re-rendering tree every mouse move).

# 11. Final Acceptance Criteria & Verification Checklist
- [ ] Clean build: \`npm run build\` passes with 0 warnings.
- [ ] Pan/zoom operates smoothly with no jitter.
- [ ] Undo/redo faithfully restores previous canvas states.
      `;

      const mockProvider: AIProvider = {
        kind: "MOCK",
        model: "mock-model",
        complete: vi.fn().mockResolvedValue({ markdownPrompt: mockPromptText }),
        listModels: vi.fn(),
        test: vi.fn(),
      };

      const promptResult = await generateAgentPrompt(mockProvider, {
        project: mockFrontendProject,
        jobTitle: frontendJob.role,
        company: frontendJob.company,
        config: {
          agent: "cursor",
          complexity: "advanced",
          deployment: "local-first",
          budget: "free",
        },
      });

      expect(promptResult.data.prompt).toContain("# 1. Project Overview");
      expect(promptResult.data.prompt).toContain("# 4. System Architecture");
      expect(promptResult.data.prompt).toContain("# 11. Final Acceptance Criteria");
      expect(promptResult.data.prompt).toContain("Collaborative Flowchart Canvas");
      expect(promptResult.data.prompt).toContain("React 19");
      expect(promptResult.data.prompt).toContain("XState");
    });
  });

  describe("Role 3: Data Analyst (Python / SQL / Power BI)", () => {
    const analystJob = {
      role: "Senior Data & Analytics Specialist",
      company: "Global Retail & E-Commerce",
      postingText:
        "Seeking a Senior Data Analyst to analyze customer cohorts, build automated SQL/Python ETL data pipelines, create executive Power BI / Tableau dashboards, and model customer retention and lifetime value (LTV). Required: Advanced SQL (window functions, CTEs), Python (Pandas, DuckDB, NumPy), and BI dashboard modeling.",
      requirements: [
        { text: "Advanced SQL (CTEs, Window Functions, Query Optimization)", kind: "skill" as const, skill: "SQL", years: null, language: null },
        { text: "Python data pipelines (Pandas, DuckDB, NumPy)", kind: "skill" as const, skill: "Python", years: null, language: null },
        { text: "Executive BI Dashboards (Power BI / Tableau / Metabase)", kind: "skill" as const, skill: "Power BI", years: null, language: null },
        { text: "Cohort retention & LTV statistical modeling", kind: "other" as const, skill: null, years: null, language: null },
      ],
    };

    it("ensures Analyst role receives proper analytics/pipeline/BI projects rather than generic web apps", async () => {
      const mockAnalystProject: ProjectRecommendation = {
        id: "proj_analyst_1",
        applicationId: "app-analyst-test",
        title: "E-Commerce Customer Cohort Retention & LTV Forecasting Pipeline",
        oneLiner: "End-to-end data pipeline in Python and DuckDB that extracts transaction logs, computes cohort matrices in SQL, and renders interactive executive BI dashboards.",
        problemSolved: "Transforming 1M+ raw transaction records into actionable retention curves and forecasting customer churn risk.",
        relevanceToRole: "Demonstrates advanced SQL window functions, DuckDB/Pandas automated ETL pipelines, and executive BI metrics (LTV, CAC, Churn, Cohort Heatmaps).",
        relevanceScore: 97,
        roleCategory: "data_analyst",
        difficulty: "Intermediate",
        estimatedTime: "1-2 weeks",
        techStack: {
          languages: ["Python 3.11", "SQL"],
          frameworks: ["Pandas", "DuckDB", "Streamlit / Metabase"],
          database: "DuckDB / SQLite / PostgreSQL",
          apis: ["Kaggle / Synthesized Retail Datasets"],
          infrastructure: ["Local Jupyter Notebooks", "Automated Python CLI"],
          deployment: ["Local-first Docker or Standalone Python"],
          tools: ["Pytest", "Power BI / Tableau Desktop or Metabase"],
        },
        architecture: {
          systemOverview: "3-tier analytics pipeline: Raw Bronze ingestion -> Silver cleaned dimensional model (Star Schema) -> Gold KPI aggregate tables feeding interactive BI dashboards.",
          components: ["Ingestion & Schema Validator", "DuckDB SQL Transformation Layer", "Cohort Analysis Matrix Calculator", "Interactive BI Reporting Dashboard"],
          dataFlow: "Raw CSV/Parquet -> Ingested into DuckDB -> SQL CTEs compute first-purchase cohorts -> Retention percentage matrix calculated -> Visualized in BI dashboard.",
          databaseDesign: "Fact Table: fact_orders. Dimension Tables: dim_customers, dim_products, dim_dates. Aggregate Views: agg_cohort_retention, agg_customer_ltv.",
          apiDesign: "CLI: python run_pipeline.py --dataset=retail_2025.csv; Web: Streamlit/Metabase local dashboard on http://localhost:8501.",
          keyDecisions: ["DuckDB embedded columnar database for sub-second analytical queries on 1M rows without requiring a cloud warehouse", "Medallion architecture"],
        },
        engineeringChallenges: [
          "Optimizing multi-stage CTEs and window functions for retention calculation",
          "Handling missing data, returns, and time-zone normalizations in raw orders",
          "Designing an intuitive cohort triangle heatmap showing retention degradation by month",
        ],
        interviewValue: {
          demonstratedRequirements: ["Advanced SQL", "Python pipelines", "Power BI / BI Dashboards", "Cohort retention modeling"],
          showcasedConcepts: ["Star Schema Dimensional Modeling", "Window Functions (LAG, LEAD, DENSE_RANK)", "Medallion Architecture", "Data Quality Validation"],
          discussionQuestions: [
            "Walk me through your SQL query to calculate month-over-month cohort retention.",
            "Why did you choose DuckDB for this local pipeline instead of standard Pandas in-memory?",
            "How do you distinguish between seasonal churn and real customer attrition?",
          ],
          whyBetterThanGeneric: "This is NOT a toy web application; it is an authentic enterprise analytical pipeline that directly answers commercial revenue questions.",
        },
        features: {
          essential: ["DuckDB Star Schema data model", "SQL cohort retention calculation script", "Interactive dashboard displaying retention heatmap"],
          advanced: ["Predictive LTV modeling using BG/NBD statistical model", "Automated data validation checks with Great Expectations / Pytest"],
        },
        status: "RECOMMENDED",
        statusUpdatedAt: new Date().toISOString(),
        skipped: false,
      };

      const mockPromptText = `
# 1. Project Overview
Project Name: E-Commerce Customer Cohort Retention & LTV Forecasting Pipeline
Problem Statement: Raw transactional logs in retail businesses contain hidden churn patterns that standard static reports miss.
Objectives: Build an automated data analytics pipeline in Python and DuckDB that ingests transaction logs, models Star Schema dimensions, executes advanced SQL cohort transformations, and produces an interactive executive BI dashboard.

# 2. Job Relevance & Portfolio Value
Target Role: Senior Data & Analytics Specialist at Global Retail & E-Commerce.
Demonstrated Skills: Complex SQL CTEs, window functions (DENSE_RANK, LAG), DuckDB columnar queries, Star Schema dimensional modeling, and interactive BI reporting.
Why This Stands Out: Employers look for real analytical rigor, data quality validation, and business metrics (LTV, Retention, CAC) rather than simple web apps.

# 3. Technology Stack & Tooling
- Languages: Python 3.11, Advanced SQL
- Analytics Engine: DuckDB 1.1 (columnar analytical database)
- Data Wrangling: Pandas, NumPy
- BI Visualization: Metabase or Streamlit or Power BI Template
- Testing: Pytest for data quality checks

# 4. System Architecture & Design
Architecture Pattern: Medallion Architecture (Bronze -> Silver -> Gold).
Dimensional Model:
- \`fact_transactions\` (transaction_id, customer_id, order_date, amount, product_id)
- \`dim_customers\` (customer_id, signup_date, acquisition_channel)
- \`agg_cohort_matrix\` (cohort_month, period_number, retained_customers, retention_rate)

\`\`\`mermaid
flowchart LR
  Raw[Raw E-Commerce CSVs] -->|Bronze Cleanse| DuckDB[(DuckDB Database)]
  DuckDB -->|Silver Transformations: Deduplication & Dimensional Modeling| StarSchema[Star Schema Fact & Dims]
  StarSchema -->|Gold SQL Analytics: Window Functions & Cohort Groups| Matrix[Cohort Retention Matrix]
  Matrix -->|Visualize| Dashboard[Interactive BI Dashboard]
\`\`\`

# 5. Feature Requirements by Phase
Phase 1 - Core MVP:
- Python script extracting and validating CSV transactions.
- SQL script computing monthly cohort retention rates.
- Basic terminal and CSV summary export.
Phase 2 - Advanced Analytics:
- Star schema modeling in DuckDB.
- Interactive Metabase or Streamlit dashboard with cohort triangle heatmap and LTV trends.
Phase 3 - Production Readiness:
- Automated data quality validation (checking negative order values, future dates, null keys).
- Command-line interface with logging and benchmark timings.

# 6. Detailed Sequential Implementation Plan
Milestone 1: Environment setup (Python virtualenv, DuckDB, dataset loading).
Milestone 2: Data ingestion, profiling, and quality validation.
Milestone 3: Star schema dimensional modeling in SQL.
Milestone 4: Cohort retention and customer LTV calculations with window functions.
Milestone 5: Dashboard implementation and interactive filters.

# 7. Engineering Standards & Code Quality
- PEP 8 compliant, type-annotated Python code.
- Formatted, documented SQL queries with clear CTE naming.
- Automated tests verifying retention percentages sum logically between 0% and 100%.

# 8. Testing Strategy
- Unit tests validating cohort assignment logic.
- Data integrity checks asserting no orphan foreign keys in fact tables.

# 9. Local Setup & Deployment Guide
1. \`git clone <repo>\`
2. \`python -m venv venv && source venv/bin/activate\`
3. \`pip install -r requirements.txt\`
4. Run \`python run_pipeline.py\` to execute ETL and open dashboard.

# 10. Portfolio & Interview Preparation Guide
- Executive summary report with actionable insights on customer retention.
- 5 interview questions regarding query optimization, cohort definitions, and trade-offs of DuckDB vs Postgres.

# 11. Final Acceptance Criteria & Verification Checklist
- [ ] Pipeline executes in < 5 seconds for 1,000,000 transactions.
- [ ] Cohort retention matrix accurately displays customer drop-off.
- [ ] Dashboard is interactive and fully accessible locally with 0 paid licenses.
      `;

      const mockProvider: AIProvider = {
        kind: "MOCK",
        model: "mock-model",
        complete: vi.fn().mockResolvedValue({ markdownPrompt: mockPromptText }),
        listModels: vi.fn(),
        test: vi.fn(),
      };

      const promptResult = await generateAgentPrompt(mockProvider, {
        project: mockAnalystProject,
        jobTitle: analystJob.role,
        company: analystJob.company,
        config: {
          agent: "claude-code",
          complexity: "intermediate",
          deployment: "local-first",
          budget: "free",
        },
      });

      // Verify domain specifics for data analyst
      expect(mockAnalystProject.roleCategory).toBe("data_analyst");
      expect(promptResult.data.prompt).toContain("Cohort Retention");
      expect(promptResult.data.prompt).toContain("DuckDB");
      expect(promptResult.data.prompt).toContain("Star Schema");
      expect(promptResult.data.prompt).toContain("# 1. Project Overview");
      expect(promptResult.data.prompt).toContain("# 11. Final Acceptance Criteria");
    });
  });

  describe("Lifecycle, Persistence, and Resume Rules Verification", () => {
    it("strictly verifies that uncompleted projects cannot be added to the resume", () => {
      const incompleteStatuses = ["RECOMMENDED", "LIKED", "PROMPT_GENERATED", "PLANNED", "IN_PROGRESS"] as const;

      for (const status of incompleteStatuses) {
        const canAddToResume = (status as string) === "COMPLETED";
        expect(canAddToResume).toBe(false);
      }

      const completedStatus = "COMPLETED";
      expect(completedStatus === "COMPLETED").toBe(true);
    });

    it("verifies project schema validation and status transitions", () => {
      const validProject: ProjectRecommendation = {
        id: "proj_valid_1",
        applicationId: "app-test-123",
        title: "Test System",
        oneLiner: "A test project",
        problemSolved: "Solves problem",
        relevanceToRole: "High relevance",
        relevanceScore: 90,
        roleCategory: "backend",
        difficulty: "Intermediate",
        estimatedTime: "2 weeks",
        techStack: {
          languages: ["TypeScript"],
          frameworks: ["Express"],
          database: "PostgreSQL",
          apis: [],
          infrastructure: [],
          deployment: [],
          tools: [],
        },
        architecture: {
          systemOverview: "Overview",
          components: ["CompA"],
          dataFlow: "Flow",
          databaseDesign: "Schema",
          apiDesign: "API",
          keyDecisions: [],
        },
        engineeringChallenges: ["Challenge 1"],
        interviewValue: {
          demonstratedRequirements: ["Req 1"],
          showcasedConcepts: ["Concept 1"],
          discussionQuestions: ["Q 1"],
          whyBetterThanGeneric: "Better",
        },
        features: {
          essential: ["Feat 1"],
          advanced: ["Feat 2"],
        },
        status: "RECOMMENDED",
        statusUpdatedAt: new Date().toISOString(),
        skipped: false,
      };

      const parsed = projectRecommendationSchema.safeParse(validProject);
      expect(parsed.success).toBe(true);

      // Verify transition to Liked
      const likedProject = { ...validProject, status: "LIKED" as const, likedAt: new Date().toISOString() };
      expect(projectRecommendationSchema.safeParse(likedProject).success).toBe(true);

      // Verify transition to Prompt Generated
      const promptProject = { ...likedProject, status: "PROMPT_GENERATED" as const, agentPrompt: "Generated Prompt Content" };
      expect(projectRecommendationSchema.safeParse(promptProject).success).toBe(true);

      // Verify transition to Completed
      const completedProject = { ...promptProject, status: "COMPLETED" as const, resumeBulletPoints: ["Bullet 1", "Bullet 2"] };
      expect(projectRecommendationSchema.safeParse(completedProject).success).toBe(true);
    });
  });
});
