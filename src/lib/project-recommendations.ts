import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const PROJECT_STATUSES = [
  "RECOMMENDED",
  "LIKED",
  "PROMPT_GENERATED",
  "PLANNED",
  "IN_PROGRESS",
  "COMPLETED",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"] as const;
export type ProjectDifficulty = (typeof PROJECT_DIFFICULTIES)[number];

export const ROLE_CATEGORIES = [
  "backend",
  "frontend",
  "fullstack",
  "data_analyst",
  "mobile",
  "devops",
  "ai_ml",
  "other",
] as const;
export type RoleCategory = (typeof ROLE_CATEGORIES)[number];

export const agentPromptConfigSchema = z.object({
  agent: z.enum(["claude-code", "cursor", "opencode", "codex", "other"]).default("claude-code"),
  complexity: z.enum(["mvp", "intermediate", "advanced"]).default("intermediate"),
  deployment: z.enum(["local-first", "docker", "cloud"]).default("local-first"),
  budget: z.enum(["free", "flexible"]).default("free"),
  customInstructions: z.string().optional(),
});
export type AgentPromptConfig = z.infer<typeof agentPromptConfigSchema>;

export const projectRecommendationSchema = z.object({
  id: z.string().min(1),
  /** Mandatory ownership key: binds the recommendation strictly to its originating job application. */
  applicationId: z.string().min(1),
  title: z.string().min(1),
  oneLiner: z.string(),
  problemSolved: z.string(),
  relevanceToRole: z.string(),
  relevanceScore: z.number().int().min(1).max(100),
  roleCategory: z.enum(ROLE_CATEGORIES).default("backend"),
  difficulty: z.enum(PROJECT_DIFFICULTIES).default("Intermediate"),
  estimatedTime: z.string(),
  techStack: z.object({
    languages: z.array(z.string()).default([]),
    frameworks: z.array(z.string()).default([]),
    database: z.string().default("SQLite / PostgreSQL"),
    apis: z.array(z.string()).default([]),
    infrastructure: z.array(z.string()).default([]),
    deployment: z.array(z.string()).default([]),
    tools: z.array(z.string()).default([]),
  }),
  architecture: z.object({
    systemOverview: z.string(),
    components: z.array(z.string()).default([]),
    dataFlow: z.string(),
    databaseDesign: z.string(),
    apiDesign: z.string(),
    keyDecisions: z.array(z.string()).default([]),
    mermaidDiagram: z.string().optional(),
  }),
  engineeringChallenges: z.array(z.string()).default([]),
  interviewValue: z.object({
    demonstratedRequirements: z.array(z.string()).default([]),
    showcasedConcepts: z.array(z.string()).default([]),
    discussionQuestions: z.array(z.string()).default([]),
    whyBetterThanGeneric: z.string(),
  }),
  features: z.object({
    essential: z.array(z.string()).default([]),
    advanced: z.array(z.string()).default([]),
  }),
  status: z.enum(PROJECT_STATUSES).default("RECOMMENDED"),
  statusUpdatedAt: z.string(),
  likedAt: z.string().optional(),
  skipped: z.boolean().default(false),
  agentPrompt: z.string().optional(),
  agentPromptUpdatedAt: z.string().optional(),
  promptConfig: agentPromptConfigSchema.optional(),
  resumeBulletPoints: z.array(z.string()).optional(),
  addedToResumeAt: z.string().optional(),
  repoUrl: z.string().optional(),
});
export type ProjectRecommendation = z.infer<typeof projectRecommendationSchema>;

export const skillGapAnalysisSchema = z.object({
  strengths: z.array(z.string()).default([]),
  demonstratedSkills: z.array(z.string()).default([]),
  missingSkills: z.array(z.string()).default([]),
  skillsNeedingEvidence: z.array(z.string()).default([]),
  differentiationOpportunities: z.array(z.string()).default([]),
  summary: z.string(),
});
export type SkillGapAnalysis = z.infer<typeof skillGapAnalysisSchema>;

export const projectRecommendationsDataSchema = z.object({
  applicationId: z.string().min(1),
  analyzedAt: z.string(),
  jobTitle: z.string(),
  company: z.string(),
  seniority: z.string(),
  roleCategory: z.enum(ROLE_CATEGORIES).default("backend"),
  skillGapAnalysis: skillGapAnalysisSchema,
  projects: z.array(projectRecommendationSchema),
});
export type ProjectRecommendationsData = z.infer<typeof projectRecommendationsDataSchema>;

function settingKeyFor(applicationId: string): string {
  return `application_projects:${applicationId}`;
}

/**
 * Loads project recommendations for a specific job application from local SQLite.
 * Strictest isolation: Validates application ID match, safely migrates legacy records,
 * and ensures only projects belonging to this application ID are returned.
 */
export async function loadApplicationProjects(applicationId: string): Promise<ProjectRecommendationsData | null> {
  if (!applicationId || typeof applicationId !== "string") return null;

  const row = await prisma.setting.findUnique({
    where: { key: settingKeyFor(applicationId) },
  });
  if (!row?.value) return null;

  try {
    const raw = JSON.parse(row.value);
    if (!raw || typeof raw !== "object") return null;

    // Migration & association: ensure applicationId is stamped on root and every project
    if (!raw.applicationId) raw.applicationId = applicationId;
    if (Array.isArray(raw.projects)) {
      raw.projects = raw.projects.map((p: any) => ({
        ...p,
        applicationId: p.applicationId || applicationId,
      }));
    }

    const parsed = projectRecommendationsDataSchema.safeParse(raw);
    if (!parsed.success) return null;

    // Strict validation: Verify the record belongs to the requested application ID
    if (parsed.data.applicationId !== applicationId) {
      return null;
    }

    // Filter projects: only projects strictly matching this application ID
    parsed.data.projects = parsed.data.projects.filter((p) => p.applicationId === applicationId);
    return parsed.data;
  } catch {
    return null;
  }
}

/**
 * Saves project recommendations strictly scoped to the specified application ID.
 */
export async function saveApplicationProjects(
  applicationId: string,
  data: ProjectRecommendationsData,
): Promise<void> {
  if (!applicationId || typeof applicationId !== "string") {
    throw new Error("Cannot save project recommendations without a valid applicationId");
  }

  // Enforce consistent applicationId on root and all contained projects
  data.applicationId = applicationId;
  data.projects = data.projects.map((p) => ({
    ...p,
    applicationId,
  }));

  const value = JSON.stringify(data);
  await prisma.setting.upsert({
    where: { key: settingKeyFor(applicationId) },
    create: { key: settingKeyFor(applicationId), value },
    update: { value },
  });
}

/**
 * Loads all liked or in-progress projects across all applications so candidates
 * can access their interested/ongoing projects in the global view.
 * Preserves each project's originating application ID and context.
 */
export async function loadAllLikedProjects(): Promise<
  Array<{
    applicationId: string;
    company: string;
    jobTitle: string;
    project: ProjectRecommendation;
  }>
> {
  const rows = await prisma.setting.findMany({
    where: { key: { startsWith: "application_projects:" } },
  });

  const results: Array<{
    applicationId: string;
    company: string;
    jobTitle: string;
    project: ProjectRecommendation;
  }> = [];

  for (const row of rows) {
    try {
      const keyAppId = row.key.replace("application_projects:", "");
      const raw = JSON.parse(row.value);
      if (!raw.applicationId) raw.applicationId = keyAppId;
      if (Array.isArray(raw.projects)) {
        raw.projects = raw.projects.map((p: any) => ({
          ...p,
          applicationId: p.applicationId || raw.applicationId || keyAppId,
        }));
      }

      const data = projectRecommendationsDataSchema.safeParse(raw);
      if (!data.success) continue;

      for (const project of data.data.projects) {
        if (project.status !== "RECOMMENDED" || project.likedAt) {
          results.push({
            applicationId: data.data.applicationId,
            company: data.data.company,
            jobTitle: data.data.jobTitle,
            project,
          });
        }
      }
    } catch {
      // Ignore corrupted rows
    }
  }

  // Sort by latest updated
  return results.sort((a, b) => {
    const dateA = a.project.likedAt || a.project.statusUpdatedAt || "";
    const dateB = b.project.likedAt || b.project.statusUpdatedAt || "";
    return dateB.localeCompare(dateA);
  });
}

/**
 * Helper to update a single project within an application with strict ID matching.
 */
export async function updateProjectInApplication(
  applicationId: string,
  projectId: string,
  updater: (project: ProjectRecommendation) => ProjectRecommendation,
): Promise<ProjectRecommendation | null> {
  const data = await loadApplicationProjects(applicationId);
  if (!data) return null;

  let updated: ProjectRecommendation | null = null;
  data.projects = data.projects.map((p) => {
    if (p.id === projectId && p.applicationId === applicationId) {
      updated = updater(p);
      updated.applicationId = applicationId;
      return updated;
    }
    return p;
  });

  if (updated) {
    await saveApplicationProjects(applicationId, data);
  }
  return updated;
}
