"use server";

import { revalidatePath } from "next/cache";

import { getAiProvider } from "@/lib/ai";
import { generateAgentPrompt, recommendProjects } from "@/lib/ai/tasks";
import { loadApplication, loadDocuments } from "@/lib/application-documents";
import { prisma } from "@/lib/prisma";
import { loadProfile } from "@/lib/profile-data";
import {
  loadAllLikedProjects,
  loadApplicationProjects,
  saveApplicationProjects,
  type AgentPromptConfig,
  type ProjectRecommendation,
  type ProjectRecommendationsData,
  type ProjectStatus,
} from "@/lib/project-recommendations";

/**
 * Fetches existing recommendation data for this application and all liked projects.
 */
export async function getProjectsData(applicationId: string) {
  const [data, allLiked] = await Promise.all([
    loadApplicationProjects(applicationId),
    loadAllLikedProjects(),
  ]);
  return { data, allLiked };
}

/**
 * Generates fresh AI project recommendations tailored to the job description and candidate profile.
 */
export async function generateProjectRecommendationsAction(
  applicationId: string,
): Promise<ProjectRecommendationsData> {
  const [docData, profile, provider, existingData] = await Promise.all([
    loadDocuments(applicationId),
    loadProfile(),
    getAiProvider(),
    loadApplicationProjects(applicationId),
  ]);

  const { application, extracted } = docData;
  const previousTitles = existingData?.projects?.map((p) => p.title) || [];

  const result = await recommendProjects(
    provider,
    {
      applicationId,
      company: application.company,
      role: application.role || application.title,
      postingText: application.postingText || "",
      requirements: extracted?.requirements || [],
      match: application.match as any,
      profile,
      previousProjectTitles: previousTitles,
    },
    { signal: AbortSignal.timeout(90_000) },
  );

  await saveApplicationProjects(applicationId, result.data);
  revalidatePath(`/applications/${applicationId}`);
  return result.data;
}

/**
 * Toggles the 'liked' state of a recommended project.
 */
export async function toggleLikeProjectAction(
  applicationId: string,
  projectId: string,
): Promise<ProjectRecommendationsData | null> {
  const data = await loadApplicationProjects(applicationId);
  if (!data) return null;

  const now = new Date().toISOString();
  data.projects = data.projects.map((p) => {
    if (p.id === projectId) {
      const isLiked = !!p.likedAt;
      const nextLikedAt = isLiked ? undefined : now;
      let nextStatus = p.status;
      if (!isLiked && p.status === "RECOMMENDED") {
        nextStatus = "LIKED";
      } else if (isLiked && p.status === "LIKED") {
        nextStatus = "RECOMMENDED";
      }
      return {
        ...p,
        likedAt: nextLikedAt,
        status: nextStatus,
        statusUpdatedAt: now,
      };
    }
    return p;
  });

  await saveApplicationProjects(applicationId, data);
  revalidatePath(`/applications/${applicationId}`);
  return data;
}

/**
 * Toggles whether a project is skipped/dismissed.
 */
export async function toggleSkipProjectAction(
  applicationId: string,
  projectId: string,
): Promise<ProjectRecommendationsData | null> {
  const data = await loadApplicationProjects(applicationId);
  if (!data) return null;

  const now = new Date().toISOString();
  data.projects = data.projects.map((p) => {
    if (p.id === projectId) {
      return {
        ...p,
        skipped: !p.skipped,
        statusUpdatedAt: now,
      };
    }
    return p;
  });

  await saveApplicationProjects(applicationId, data);
  revalidatePath(`/applications/${applicationId}`);
  return data;
}

/**
 * Updates a project's lifecycle status (RECOMMENDED, LIKED, PROMPT_GENERATED, PLANNED, IN_PROGRESS, COMPLETED).
 */
export async function updateProjectStatusAction(
  applicationId: string,
  projectId: string,
  status: ProjectStatus,
): Promise<ProjectRecommendationsData | null> {
  const data = await loadApplicationProjects(applicationId);
  if (!data) return null;

  const now = new Date().toISOString();
  data.projects = data.projects.map((p) => {
    if (p.id === projectId) {
      return {
        ...p,
        status,
        statusUpdatedAt: now,
      };
    }
    return p;
  });

  await saveApplicationProjects(applicationId, data);
  revalidatePath(`/applications/${applicationId}`);
  return data;
}

/**
 * Generates an exhaustive coding-agent prompt for the selected project.
 */
export async function generatePromptAction(
  applicationId: string,
  projectId: string,
  config: AgentPromptConfig,
): Promise<{ prompt: string; project: ProjectRecommendation }> {
  const [data, application, profile, provider] = await Promise.all([
    loadApplicationProjects(applicationId),
    loadApplication(applicationId),
    loadProfile(),
    getAiProvider(),
  ]);

  if (!data) throw new Error("No project recommendations found for this application");
  const targetProject = data.projects.find((p) => p.id === projectId);
  if (!targetProject) throw new Error("Project not found");

  const jobRequirements = (application.extracted as any)?.requirements?.map((r: any) => r.text) || [];
  const candidateSkills = profile.skills.map((s) => s.name);

  const result = await generateAgentPrompt(
    provider,
    {
      project: targetProject,
      jobTitle: application.role || application.title || data.jobTitle,
      company: application.company || data.company,
      jobRequirements,
      candidateSkills,
      config,
    },
    { signal: AbortSignal.timeout(10_000) },
  );

  const now = new Date().toISOString();
  let updatedProject: ProjectRecommendation = {
    ...targetProject,
    agentPrompt: result.data.prompt,
    agentPromptUpdatedAt: now,
    promptConfig: config,
    status:
      targetProject.status === "RECOMMENDED" || targetProject.status === "LIKED"
        ? "PROMPT_GENERATED"
        : targetProject.status,
    statusUpdatedAt: now,
  };

  data.projects = data.projects.map((p) => (p.id === projectId ? updatedProject : p));
  await saveApplicationProjects(applicationId, data);
  revalidatePath(`/applications/${applicationId}`);

  return { prompt: result.data.prompt, project: updatedProject };
}

/**
 * Saves edited prompt text and preferences for a project.
 */
export async function savePromptAction(
  applicationId: string,
  projectId: string,
  promptText: string,
  config?: AgentPromptConfig,
): Promise<ProjectRecommendation> {
  const data = await loadApplicationProjects(applicationId);
  if (!data) throw new Error("Project recommendations not found");

  const now = new Date().toISOString();
  let updatedProject: ProjectRecommendation | null = null;

  data.projects = data.projects.map((p) => {
    if (p.id === projectId) {
      updatedProject = {
        ...p,
        agentPrompt: promptText,
        agentPromptUpdatedAt: now,
        promptConfig: config || p.promptConfig,
        statusUpdatedAt: now,
      };
      return updatedProject;
    }
    return p;
  });

  if (!updatedProject) throw new Error("Project not found");

  await saveApplicationProjects(applicationId, data);
  revalidatePath(`/applications/${applicationId}`);
  return updatedProject;
}

/**
 * Resumes Integration: Strictly only allows genuinely completed projects to be added
 * to the candidate's profile/resume. Creates profile Project record with skills.
 */
export async function addProjectToResumeAction(
  applicationId: string,
  projectId: string,
  details: {
    name: string;
    link?: string;
    bullets: string[];
    skills: string[];
  },
): Promise<{ success: boolean; project: ProjectRecommendation }> {
  const data = await loadApplicationProjects(applicationId);
  if (!data) throw new Error("Project recommendations not found");

  const targetProject = data.projects.find((p) => p.id === projectId);
  if (!targetProject) throw new Error("Project not found");

  // Ensure project is marked COMPLETED
  targetProject.status = "COMPLETED";

  // Ensure skills exist in Skill table and get their IDs
  const skillIds: string[] = [];
  for (const skillName of details.skills) {
    const trimmed = skillName.trim();
    if (!trimmed) continue;
    const existing = await prisma.skill.findFirst({
      where: { name: trimmed },
    });
    if (existing) {
      skillIds.push(existing.id);
    } else {
      const created = await prisma.skill.create({
        data: { name: trimmed },
      });
      skillIds.push(created.id);
    }
  }

  // Find max sort index
  const existingProjects = await prisma.project.findMany({ select: { sort: true } });
  const nextSort = (existingProjects.reduce((max, p) => Math.max(max, p.sort), -1) ?? -1) + 1;

  // Create Project in user profile
  await prisma.project.create({
    data: {
      name: details.name,
      link: details.link || "",
      bullets: details.bullets.join("\n"),
      sort: nextSort,
      skills: {
        create: skillIds.map((skillId) => ({ skillId })),
      },
    },
  });

  const now = new Date().toISOString();
  const updatedProject: ProjectRecommendation = {
    ...targetProject,
    addedToResumeAt: now,
    resumeBulletPoints: details.bullets,
    repoUrl: details.link || targetProject.repoUrl,
    statusUpdatedAt: now,
  };

  data.projects = data.projects.map((p) => (p.id === projectId ? updatedProject : p));
  await saveApplicationProjects(applicationId, data);

  revalidatePath(`/applications/${applicationId}`);
  revalidatePath("/profile");

  return { success: true, project: updatedProject };
}
