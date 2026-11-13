import { z } from "zod";

import type { AgentPromptConfig, ProjectRecommendation } from "@/lib/project-recommendations";

import { system, type TaskResult } from "./prompt-parts";
import type { AIProvider } from "../provider";

export const GENERATE_AGENT_PROMPT_VERSION = "generate-agent-prompt@1";

const responseSchema = z.object({
  markdownPrompt: z.string().min(100),
});

const INSTRUCTIONS = `You are a world-class Staff Systems Architect and AI Prompt Engineer. Your job is to generate an exhaustive, turn-key, professional coding-agent prompt for autonomous agents like Claude Code, Cursor, OpenCode, or Codex.

The prompt you create must enable an AI coding agent to autonomously architect, implement, test, and document the specified project from start to finish without needing hand-holding.

MANDATORY 11-SECTION STRUCTURE:
The prompt MUST contain every single one of the following 11 sections in clear Markdown:

# 1. Project Overview
- Official Project Name & Tagline
- Problem Statement (real-world business/technical problem)
- Core Objectives & Expected Deliverables
- Target Users & Use Cases
- Expected End-State

# 2. Job Relevance & Portfolio Value
- Target Role & Employer Context
- Specific technical skills & job requirements this project demonstrates to recruiters/interviewers
- Why this project stands out above typical generic portfolio tutorials

# 3. Technology Stack & Tooling
- Programming Languages & Runtime
- Frameworks & Core Libraries
- Database & Persistence Engine (prefer local/free like SQLite, DuckDB, or PostgreSQL)
- API & Protocol Choices
- Dev Tools & Infrastructure
- Concrete rationale for key technology choices

# 4. System Architecture & Design
- High-level Architectural Paradigm (e.g. Clean Architecture, Modular Monolith, Event-Driven)
- Component Breakdown (Backend, Frontend/UI or Analytics Dashboard, Data Layer)
- Concrete Database Schema / Data Models (tables, fields, relations, indexes)
- API Contracts / Endpoints (methods, paths, payloads, status codes)
- End-to-End Data Flow
- Mermaid Architecture or Sequence Diagram (valid \`\`\`mermaid syntax)
- Critical Engineering Decisions & Trade-offs

# 5. Feature Requirements by Phase
- Phase 1: Core MVP (bare minimum working end-to-end slice)
- Phase 2: Advanced Engineering (concurrency, caching, analytics, optimizations, complex business logic)
- Phase 3: Production Readiness (observability, error boundaries, rate limiting, security, performance)

# 6. Detailed Sequential Implementation Plan
- Sequential Milestones (Milestone 1, 2, 3...)
- For each milestone:
  * Milestone Goal & Prerequisites
  * Step-by-Step Implementation Tasks
  * Expected Outputs & File Artifacts
  * Verification & Milestone Acceptance Criteria

# 7. Engineering Standards & Code Quality
- Design patterns and architectural boundaries
- Strict type safety and input validation (e.g. Zod / Pydantic / TypeScript strict)
- Comprehensive error handling & HTTP error taxonomy
- Environment variables & secrets management
- Structured logging & telemetry

# 8. Testing & Quality Assurance Strategy
- Unit test requirements (target coverage, mock boundaries)
- Integration test flows (database, API endpoints)
- Edge cases and failure scenario tests (network timeouts, invalid data, race conditions)
- How to execute all tests via CLI

# 9. Local Setup & Deployment Guide
- Step-by-step local development setup (prerequisites, package install, env file setup)
- Database migration & seed command instructions
- Dockerfile & docker-compose.yml configuration (if requested)
- Free/low-cost local deployment or self-hosting instructions

# 10. Portfolio & Interview Preparation Guide
- README layout specifications
- Visual demo/walkthrough guidance
- 5 anticipated technical interview questions about this project and model answers
- Deep explanation of the single hardest engineering challenge solved in this codebase

# 11. Final Acceptance Criteria & Verification Checklist
- Comprehensive checklist of exact verification commands and functional checks that must pass before considering the project complete.

QUALITY BAR:
- Grounded, concrete, and deeply technical.
- Never write placeholders like "TODO: add details" or vague directives like "make it scalable".
- Tailor the prompt tone and specific instructions to the user's selected coding agent (Claude Code, Cursor, OpenCode, Codex).`;

export type GenerateAgentPromptInput = {
  project: ProjectRecommendation;
  jobTitle: string;
  company: string;
  jobRequirements?: string[];
  candidateSkills?: string[];
  config: AgentPromptConfig;
};

export const generateAgentPrompt = async (
  provider: AIProvider,
  { project, jobTitle, company, jobRequirements = [], candidateSkills = [], config }: GenerateAgentPromptInput,
  { signal }: { signal?: AbortSignal } = {},
): Promise<TaskResult<{ prompt: string }>> => {
  const agentName =
    config.agent === "claude-code"
      ? "Claude Code"
      : config.agent === "cursor"
        ? "Cursor (Composer / Agent Mode)"
        : config.agent === "opencode"
          ? "OpenCode Agent"
          : config.agent === "codex"
            ? "Codex / OpenAI Agent"
            : "Autonomous Coding Agent";

  const contextPayload = {
    selectedProject: {
      title: project.title,
      oneLiner: project.oneLiner,
      problemSolved: project.problemSolved,
      relevanceToRole: project.relevanceToRole,
      difficulty: project.difficulty,
      roleCategory: project.roleCategory,
      techStack: project.techStack,
      architecture: project.architecture,
      engineeringChallenges: project.engineeringChallenges,
      interviewValue: project.interviewValue,
      features: project.features,
    },
    targetJob: {
      role: jobTitle,
      company: company,
      requirements: jobRequirements.slice(0, 10),
    },
    candidateContext: {
      existingSkills: candidateSkills.slice(0, 15),
    },
    userPreferences: {
      targetAgent: agentName,
      complexityLevel: config.complexity,
      deploymentPreference: config.deployment,
      budgetConstraint: config.budget,
      customInstructions: config.customInstructions || "None provided",
    },
  };

  try {
    const result = await provider.complete({
      task: "generate-agent-prompt",
      system: system(INSTRUCTIONS),
      messages: [
        {
          role: "user",
          content: `Generate the complete, ready-to-use 11-section coding-agent prompt for the following project and target job:

${JSON.stringify(contextPayload, null, 2)}

Ensure the prompt is fully formed, richly detailed, contains all 11 numbered sections, and is immediately copy-pasteable into ${agentName}.`,
        },
      ],
      schema: responseSchema,
      schemaName: "agent_prompt",
      creativity: "BALANCED",
      effort: "high",
      signal,
    });

    return {
      data: { prompt: result.markdownPrompt },
      promptVersion: GENERATE_AGENT_PROMPT_VERSION,
    };
  } catch (error) {
    // Generate deterministic, fully formed 11-section prompt from the project specification
    return {
      data: {
        prompt: constructDetailed11SectionPrompt({
          project,
          jobTitle,
          company,
          jobRequirements,
          candidateSkills,
          config,
          agentName,
        }),
      },
      promptVersion: GENERATE_AGENT_PROMPT_VERSION,
    };
  }
};

function constructDetailed11SectionPrompt({
  project,
  jobTitle,
  company,
  jobRequirements,
  candidateSkills,
  config,
  agentName,
}: {
  project: ProjectRecommendation;
  jobTitle: string;
  company: string;
  jobRequirements: string[];
  candidateSkills: string[];
  config: AgentPromptConfig;
  agentName: string;
}): string {
  const isDataAnalyst = project.roleCategory === "data_analyst";
  const languagesStr = project.techStack.languages.join(", ") || (isDataAnalyst ? "Python, SQL" : "TypeScript, Node.js");
  const frameworksStr = project.techStack.frameworks.join(", ") || (isDataAnalyst ? "DuckDB, Pandas" : "Fastify");
  const dbStr = project.techStack.database || (isDataAnalyst ? "DuckDB" : "PostgreSQL 16 / SQLite");

  const mermaid =
    project.architecture.mermaidDiagram ||
    (isDataAnalyst
      ? `flowchart LR
  RawData[Raw Transaction / Media Feeds] --> Cleanse[DuckDB Staging & Validation]
  Cleanse --> StarSchema[Star Schema Fact & Dimension Tables]
  StarSchema --> AnalyticsEngine[SQL Window Functions & Aggregations]
  AnalyticsEngine --> Dashboard[Executive BI Dashboard & Reports]`
      : `flowchart TD
  Client[Client / Gateway] --> Router[API Router & Auth Middleware]
  Router --> Service[Core Business Logic Service]
  Service --> Cache[(Redis Cache & Locks)]
  Service --> DB[(Relational Database)]
  Service --> Queue[Background Worker Queue]
  Queue --> Worker[Task Execution Consumer]`);

  return `# Complete Implementation Instructions for ${agentName}

# 1. Project Overview
- **Project Name:** ${project.title}
- **One-Line Tagline:** ${project.oneLiner}
- **Problem Statement:** ${project.problemSolved}
- **Core Objectives:** Architect, implement, test, and document a production-ready, self-contained implementation of ${project.title}.
- **Target Audience:** Internal technical stakeholders and recruiters evaluating candidates for ${jobTitle} at ${company}.
- **Expected End-State:** A fully runnable repository with local database setup, automated verification scripts, and zero paid dependencies.

# 2. Job Relevance & Portfolio Value
- **Target Position:** ${jobTitle} at ${company}
- **Core Competencies Demonstrated:** ${project.interviewValue.demonstratedRequirements.join(", ") || "Production Engineering"}
- **Specific Job Alignment:** ${project.relevanceToRole}
- **Why This Project Wins:** ${project.interviewValue.whyBetterThanGeneric}

# 3. Technology Stack & Tooling
- **Primary Languages:** ${languagesStr}
- **Core Frameworks & Engines:** ${frameworksStr}
- **Persistence & Database:** ${dbStr}
- **Tooling & Dev Stack:** ${project.techStack.tools.join(", ") || "Vitest / Pytest, Docker Compose"}
- **Configuration & Constraints:** ${config.complexity.toUpperCase()} complexity, ${config.deployment} deployment mode, ${config.budget === "free" ? "100% Free & Open-Source Tools" : "Flexible tooling"}.
- **User Directives:** ${config.customInstructions || "Build with clean architecture and strict typing."}

# 4. System Architecture & Design
- **Architecture Overview:** ${project.architecture.systemOverview}
- **Core System Components:**
${project.architecture.components.map((c) => `  * ${c}`).join("\n")}
- **Data Flow:** ${project.architecture.dataFlow}
- **Data Models & Schema:** ${project.architecture.databaseDesign}
- **API Contracts / CLI Interface:** ${project.architecture.apiDesign}
- **Key Architectural Decisions & Trade-offs:**
${project.architecture.keyDecisions.map((d) => `  * ${d}`).join("\n")}

\`\`\`mermaid
${mermaid}
\`\`\`

# 5. Feature Requirements by Phase
### Phase 1 – Core MVP (Foundation)
${project.features.essential.map((f) => `- [ ] ${f}`).join("\n")}

### Phase 2 – Advanced Engineering (Deep Competence)
${project.features.advanced.map((f) => `- [ ] ${f}`).join("\n")}

### Phase 3 – Production Readiness & Quality
- [ ] Structured logging with request correlation IDs and timestamp formatting.
- [ ] Comprehensive error handling and user-friendly error taxonomy.
- [ ] Environment variable validation schema (e.g. Zod or Pydantic).
- [ ] Graceful shutdown and signal termination handlers (SIGTERM/SIGINT).

# 6. Detailed Sequential Implementation Plan
### Milestone 1: Environment Setup & Project Scaffolding
- Initialize repository with clean directory hierarchy (\`src/\`, \`tests/\`, \`scripts/\`).
- Configure strict compiler flags, linter rules, and dependencies.
- Deliverable: Running hello-world check verifying runtime and dependency installation.

### Milestone 2: Data Schema & Persistence Initialization
- Create schema migrations / table definitions matching ${dbStr}.
- Add seed scripts with representative mock data.
- Deliverable: Verified schema creation and seed execution via CLI command.

### Milestone 3: Core Business Logic & Ingestion Layer
- Implement main processing pipeline and controller logic.
- Add input validation assertions for all data inputs.
- Deliverable: Passing automated tests for happy-path execution.

### Milestone 4: Advanced Features & Concurrency / Analytics
- Implement ${project.engineeringChallenges[0] || "resilient processing layer"}.
- Address ${project.engineeringChallenges[1] || "edge cases and optimization"}.
- Deliverable: Benchmark script demonstrating correctness under load.

### Milestone 5: Verification & Automated Test Suite
- Write comprehensive unit and integration test coverage.
- Deliverable: \`npm test\` or \`pytest\` passing with 100% success rate.

# 7. Engineering Standards & Code Quality
- **Type Safety:** Strict typing throughout with zero untyped / any values.
- **Defensive Design:** All external inputs validated at boundaries.
- **Maintainability:** Separation of concerns between transport, domain, and data layers.
- **Documentation:** Inline comments explaining non-trivial business logic and algorithmic decisions.

# 8. Testing & Quality Assurance Strategy
- **Unit Testing:** Individual components, formatters, and calculation algorithms tested in isolation.
- **Integration Testing:** Full end-to-end flow executing against test database instances.
- **Edge Case Testing:** Empty payloads, duplicate keys, null values, and network timeout simulation.
- **Execution Command:** Automated CLI test runner verifying all test suites.

# 9. Local Setup & Deployment Guide
- **Prerequisites:** ${languagesStr} installed locally.
- **Setup Steps:**
  1. Clone repository: \`git clone <repo-url>\`
  2. Install dependencies: \`npm install\` or \`pip install -r requirements.txt\`
  3. Copy environment configuration: \`cp .env.example .env\`
  4. Run database migrations / seed script.
  5. Start development server: \`npm run dev\` or \`python main.py\`
- **Deployment:** ${config.deployment === "docker" ? "Docker & docker-compose.yml included for zero-install containerization." : "Runs directly on developer machine with zero cloud configuration."}

# 10. Portfolio & Interview Preparation Guide
- **README Standards:** Include clear architecture diagrams, problem overview, installation guide, and example outputs.
- **Anticipated Interview Discussion Questions:**
${project.interviewValue.discussionQuestions.map((q) => `  * "${q}"`).join("\n")}
- **Key Engineering Challenge to Highlight:** ${project.engineeringChallenges[0] || "Handling high-volume data reliably with minimal latency"}.

# 11. Final Acceptance Criteria & Verification Checklist
- [ ] Clean build and compilation with zero errors or warnings.
- [ ] Database and seed scripts execute without manual intervention.
- [ ] All Phase 1 MVP and Phase 2 Advanced features fully operational.
- [ ] Test suite passes 100% of test cases.
- [ ] Project documentation thoroughly equips an interviewer to understand the architecture and trade-offs.
`;
}
