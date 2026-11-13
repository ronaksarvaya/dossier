import { z } from "zod";

import type { Extracted, Match } from "@/lib/application-data";
import type { ProfileData } from "@/lib/profile";
import {
  PROJECT_DIFFICULTIES,
  ROLE_CATEGORIES,
  type ProjectDifficulty,
  type ProjectRecommendationsData,
  type RoleCategory,
} from "@/lib/project-recommendations";

import { system, UNTRUSTED_POSTING, type TaskResult } from "./prompt-parts";
import type { AIProvider } from "../provider";

export const RECOMMEND_PROJECTS_VERSION = "recommend-projects@1";

const projectSchema = z.object({
  title: z.string(),
  oneLiner: z.string(),
  problemSolved: z.string(),
  relevanceToRole: z.string(),
  relevanceScore: z.number().int().min(1).max(100),
  roleCategory: z.enum(ROLE_CATEGORIES),
  difficulty: z.enum(PROJECT_DIFFICULTIES),
  estimatedTime: z.string(),
  techStack: z.object({
    languages: z.array(z.string()),
    frameworks: z.array(z.string()),
    database: z.string(),
    apis: z.array(z.string()),
    infrastructure: z.array(z.string()),
    deployment: z.array(z.string()),
    tools: z.array(z.string()),
  }),
  architecture: z.object({
    systemOverview: z.string(),
    components: z.array(z.string()),
    dataFlow: z.string(),
    databaseDesign: z.string(),
    apiDesign: z.string(),
    keyDecisions: z.array(z.string()),
    mermaidDiagram: z.string().nullable(),
  }),
  engineeringChallenges: z.array(z.string()),
  interviewValue: z.object({
    demonstratedRequirements: z.array(z.string()),
    showcasedConcepts: z.array(z.string()),
    discussionQuestions: z.array(z.string()),
    whyBetterThanGeneric: z.string(),
  }),
  features: z.object({
    essential: z.array(z.string()),
    advanced: z.array(z.string()),
  }),
});

const responseSchema = z.object({
  jobTitle: z.string(),
  seniority: z.string(),
  roleCategory: z.enum(ROLE_CATEGORIES),
  skillGapAnalysis: z.object({
    strengths: z.array(z.string()),
    demonstratedSkills: z.array(z.string()),
    missingSkills: z.array(z.string()),
    skillsNeedingEvidence: z.array(z.string()),
    differentiationOpportunities: z.array(z.string()),
    summary: z.string(),
  }),
  projects: z.array(projectSchema),
});

const INSTRUCTIONS = `You are an elite principal engineer and career architect. You analyze target job descriptions alongside a candidate's profile to formulate a tailored skill-gap analysis and recommend 3 to 5 high-impact, role-specific projects that dramatically strengthen the candidate's portfolio.

CORE PRINCIPLES:
1. SPECIFIC & RELEVANT: Never recommend generic projects (NO todo lists, NO weather apps, NO basic CRUD tutorials, NO basic clone apps). Every project must directly reflect real problems solved in the target employer's domain and stack.
2. ADAPT TO ROLE CATEGORY:
   - For Backend: Recommend scalable microservices, high-throughput message processing, resilient cache architectures, background worker queues, idempotency, and concurrency solutions.
   - For Frontend: Recommend complex state machines, rich canvas/visual interactions, optimistic UI, offline-first sync, accessibility, design token integration, or web performance tooling.
   - For Data Analyst / BI / Analytics: Focus on end-to-end data analytics pipelines, automated ETL/ELT workflows with SQL and Python, interactive dashboards (Power BI / Tableau / Metabase), cohort analysis, statistical modeling, data validation frameworks, and metric forecasting. DO NOT recommend full-stack web applications for pure Data Analyst roles!
   - For Fullstack / DevOps / AI-ML: Tailor precisely to the balance described in the posting.
   - For Non-Coding / Hybrid / Operations / Product Roles: Focus on domain-specific analytical models, workflow automations, executive dashboards, metric frameworks, simulation models, and audit tools relevant to their day-to-day decisions.
3. GROUNDED IN REALITY: Choose realistic local-first and accessible tools (e.g. SQLite, PostgreSQL, Docker, DuckDB, Pandas, Next.js, Fastify). Do not require expensive enterprise licenses or proprietary APIs.
4. CREDIBLE INTERVIEW VALUE: Detail concrete engineering challenges, trade-offs, and technical interview discussion points that demonstrate deep mastery.`;

export type RecommendProjectsInput = {
  applicationId: string;
  company: string;
  role: string;
  postingText: string;
  requirements: Extracted["requirements"];
  match?: Match | null;
  profile: ProfileData;
  previousProjectTitles?: string[];
};

export const recommendProjects = async (
  provider: AIProvider,
  {
    applicationId,
    company,
    role,
    postingText,
    requirements,
    match,
    profile,
    previousProjectTitles,
  }: RecommendProjectsInput,
  { signal }: { signal?: AbortSignal } = {},
): Promise<TaskResult<ProjectRecommendationsData>> => {
  const candidateSummary = {
    basics: {
      headline: profile.basics.headline,
      summary: profile.basics.summary,
    },
    skills: profile.skills.map((s) => s.name),
    languages: profile.languages.map((l) => `${l.name} (${l.level})`),
    roles: profile.experience.map((e) => ({
      role: e.role,
      company: e.company,
      bullets: e.bullets.split("\n").filter(Boolean).slice(0, 3),
    })),
    projects: profile.projects.map((p) => ({
      name: p.name,
      bullets: p.bullets.split("\n").filter(Boolean).slice(0, 2),
    })),
    certifications: profile.certifications.map((c) => c.name),
  };

  const jobSummary = {
    company,
    targetRole: role,
    requirements: requirements.map((r) => r.text),
    matchDetails: match?.items?.map((m) => ({
      requirement: m.requirement,
      status: m.result,
      skill: m.skill,
    })),
    postingExcerpt: postingText.slice(0, 4000),
  };

  const userContent = `Analyze this job posting against the candidate's current profile and generate:
1. Seniority and Role Category (backend, frontend, fullstack, data_analyst, mobile, devops, ai_ml, other).
2. Skill gap analysis: strengths, demonstrated skills, missing skills, skills needing evidence, differentiation opportunities, and summary.
3. 3 to 5 realistic, impactful, job-specific project recommendations with architecture, engineering challenges, interview value, and effort estimation.
Support both technical/coding and non-coding roles (including analyst, business intelligence, operations, product).
${previousProjectTitles && previousProjectTitles.length > 0 ? `\nPREVIOUS RECOMMENDATIONS (DO NOT REPEAT THESE; GENERATE NEW, DISTINCT PROJECT IDEAS):\n${previousProjectTitles.map((t) => `- ${t}`).join("\n")}\n` : ""}
JOB POSTING & REQUIREMENTS:
${JSON.stringify(jobSummary, null, 2)}

CANDIDATE PROFILE:
${JSON.stringify(candidateSummary, null, 2)}`;

  const result = await provider.complete({
    task: "recommend-projects",
    system: system(INSTRUCTIONS, UNTRUSTED_POSTING),
    messages: [
      {
        role: "user",
        content: userContent,
      },
    ],
    schema: responseSchema,
    schemaName: "project_recommendations",
    creativity: "BALANCED",
    effort: "medium",
    signal,
  });

  const now = new Date().toISOString();

  const formattedProjects = result.projects.map((p, index) => ({
    ...p,
    id: `proj_${applicationId}_${Date.now()}_${index + 1}`,
    applicationId,
    architecture: {
      ...p.architecture,
      mermaidDiagram: p.architecture.mermaidDiagram ?? undefined,
    },
    status: "RECOMMENDED" as const,
    statusUpdatedAt: now,
    skipped: false,
  }));

  const data: ProjectRecommendationsData = {
    applicationId,
    analyzedAt: now,
    jobTitle: result.jobTitle || role || "Software Engineer",
    company: company || "Target Company",
    seniority: result.seniority || "Mid-Level",
    roleCategory: result.roleCategory as RoleCategory,
    skillGapAnalysis: result.skillGapAnalysis,
    projects: formattedProjects,
  };

  return {
    data,
    promptVersion: RECOMMEND_PROJECTS_VERSION,
  };
};
