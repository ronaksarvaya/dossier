"use client";

import { useEffect, useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Filter,
  Globe,
  Heart,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Terminal,
  TrendingUp,
} from "lucide-react";

import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/toast";
import type {
  ProjectRecommendation,
  ProjectRecommendationsData,
  ProjectStatus,
} from "@/lib/project-recommendations";
import {
  generateProjectRecommendationsAction,
  getProjectsData,
  toggleLikeProjectAction,
  toggleSkipProjectAction,
  updateProjectStatusAction,
} from "./projects-actions";
import { ProjectCard } from "@/components/projects/project-card";
import { ProjectDetailModal } from "@/components/projects/project-detail-modal";
import { AgentPromptModal } from "@/components/projects/agent-prompt-modal";
import { CompleteProjectModal } from "@/components/projects/complete-project-modal";

export function ProjectsTab({
  applicationId,
  initialData = null,
  initialAllLiked = [],
  aiReady,
}: {
  applicationId: string;
  initialData?: ProjectRecommendationsData | null;
  initialAllLiked?: Array<{ applicationId: string; company: string; jobTitle: string; project: ProjectRecommendation }>;
  aiReady: boolean;
}) {
  const isInitialMatching = Boolean(initialData && initialData.applicationId === applicationId);
  const [data, setData] = useState<ProjectRecommendationsData | null>(isInitialMatching ? initialData : null);
  const [globalLiked, setGlobalLiked] = useState(initialAllLiked);
  const [loading, setLoading] = useState(!isInitialMatching);
  const [filter, setFilter] = useState<"all" | "liked" | "in_progress" | "completed">("all");
  const [showSkipped, setShowSkipped] = useState(false);
  const [viewScope, setViewScope] = useState<"application" | "global">("application");

  // Active modals
  const [detailProject, setDetailProject] = useState<ProjectRecommendation | null>(null);
  const [buildProject, setBuildProject] = useState<ProjectRecommendation | null>(null);
  const [completeProject, setCompleteProject] = useState<ProjectRecommendation | null>(null);

  const [isPending, startTransition] = useTransition();

  // Load and synchronize data strictly for this applicationId
  useEffect(() => {
    let active = true;

    if (initialData && initialData.applicationId === applicationId) {
      setData(initialData);
      setLoading(false);
      return;
    }

    // Immediately isolate context: Clear old data and show loading for the new applicationId
    setData(null);
    setLoading(true);

    getProjectsData(applicationId)
      .then(({ data: localData, allLiked }) => {
        if (!active) return;
        // Strict isolation validation: response must match current applicationId
        if (localData && localData.applicationId !== applicationId) {
          return;
        }
        setData(localData);
        setGlobalLiked(allLiked);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setData(null);
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [applicationId, initialData]);

  const handleGenerate = () => {
    startTransition(async () => {
      try {
        const fresh = await generateProjectRecommendationsAction(applicationId);
        if (fresh && fresh.applicationId === applicationId) {
          setData(fresh);
        }
        toast("Tailored project recommendations and skill-gap analysis ready!");
      } catch (err: any) {
        toast(err.message || "Failed to generate recommendations. Please check AI settings.");
      }
    });
  };

  const handleToggleLike = (project: ProjectRecommendation) => {
    // Guard against cross-application action
    if (project.applicationId !== applicationId) return;

    startTransition(async () => {
      try {
        const updated = await toggleLikeProjectAction(applicationId, project.id);
        if (updated && updated.applicationId === applicationId) {
          setData(updated);
        }
      } catch (err: any) {
        toast(err.message || "Failed to update like status");
      }
    });
  };

  const handleToggleSkip = (project: ProjectRecommendation) => {
    if (project.applicationId !== applicationId) return;

    startTransition(async () => {
      try {
        const updated = await toggleSkipProjectAction(applicationId, project.id);
        if (updated && updated.applicationId === applicationId) {
          setData(updated);
        }
      } catch (err: any) {
        toast(err.message || "Failed to update skip status");
      }
    });
  };

  const handleUpdateStatus = (project: ProjectRecommendation, status: ProjectStatus) => {
    if (project.applicationId !== applicationId) return;

    startTransition(async () => {
      try {
        const updated = await updateProjectStatusAction(applicationId, project.id, status);
        if (updated && updated.applicationId === applicationId) {
          setData(updated);
        }
        toast(`Status updated to ${status.replace("_", " ")}`);
      } catch (err: any) {
        toast(err.message || "Failed to update status");
      }
    });
  };

  const handleProjectUpdated = (updatedProject: ProjectRecommendation) => {
    if (!data || data.applicationId !== applicationId) return;
    if (updatedProject.applicationId !== applicationId) return;

    setData({
      ...data,
      projects: data.projects.map((p) => (p.id === updatedProject.id ? updatedProject : p)),
    });
  };

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-sm text-muted">Loading project recommendations for this job...</p>
      </div>
    );
  }

  // Strictly isolated project list: Must belong to current applicationId
  const isCurrentApp = Boolean(data && data.applicationId === applicationId);
  const currentAppData = isCurrentApp ? data : null;
  const rawProjects = currentAppData ? currentAppData.projects.filter((p) => p.applicationId === applicationId) : [];

  const filteredProjects = rawProjects.filter((p) => {
    if (!showSkipped && p.skipped) return false;
    if (filter === "liked") return !!p.likedAt;
    if (filter === "in_progress") return p.status === "IN_PROGRESS" || p.status === "PLANNED";
    if (filter === "completed") return p.status === "COMPLETED";
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Top Banner / Scope Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-ink">
            Job-Specific Project Recommendations
          </h2>
          <p className="text-sm text-muted mt-0.5">
            Targeted portfolio projects designed to close skill gaps and prove competence for this role.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Scope Toggle */}
          <div className="flex rounded-control border border-line-field bg-input p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setViewScope("application")}
              className={`rounded-control px-2.5 py-1 transition-colors ${
                viewScope === "application"
                  ? "bg-card text-ink shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              This Job
            </button>
            <button
              type="button"
              onClick={() => setViewScope("global")}
              className={`flex items-center gap-1 rounded-control px-2.5 py-1 transition-colors ${
                viewScope === "global"
                  ? "bg-card text-ink shadow-xs"
                  : "text-muted hover:text-ink"
              }`}
            >
              <Globe className="h-3 w-3" />
              All Interested ({globalLiked.length})
            </button>
          </div>

          {viewScope === "application" && (
            <button
              type="button"
              disabled={isPending || !aiReady}
              onClick={handleGenerate}
              className={buttonClassName(currentAppData ? "secondary" : "primary", "sm")}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Generating with AI...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  {currentAppData ? "Regenerate Recommendations" : "Analyze Job & Recommend Projects"}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Global Liked Projects View */}
      {viewScope === "global" ? (
        <div className="space-y-4">
          <div className="rounded-panel border border-line-card bg-input/40 p-4">
            <h3 className="font-serif text-lg font-bold text-ink mb-1">
              All Interested & In-Progress Projects
            </h3>
            <p className="text-xs text-muted">
              These are the projects you have liked or planned across all your job applications. They stay permanently accessible here so you can continue building.
            </p>
          </div>

          {globalLiked.length === 0 ? (
            <Card className="p-8 text-center">
              <Heart className="h-8 w-8 text-muted/50 mx-auto mb-2" />
              <p className="text-sm font-medium text-ink">No Liked Projects Yet</p>
              <p className="text-xs text-muted max-w-sm mx-auto mt-1">
                Explore project recommendations for your applications and click the heart icon to save projects you want to build.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {globalLiked.map(({ applicationId: appHostId, company, jobTitle, project }) => (
                <div key={`${project.applicationId}-${project.id}`} className="flex flex-col">
                  <div className="text-[11px] font-semibold text-muted mb-1 px-1 flex items-center justify-between">
                    <span>{company}</span>
                    <span className="font-normal truncate max-w-[150px]">{jobTitle}</span>
                  </div>
                  <ProjectCard
                    project={project}
                    onViewDetails={(p) => setDetailProject(p)}
                    onToggleLike={(p) => handleToggleLike(p)}
                    onBuild={(p) => setBuildProject(p)}
                    onToggleSkip={(p) => handleToggleSkip(p)}
                    onUpdateStatus={(p, status) => handleUpdateStatus(p, status)}
                    onAddToResume={(p) => setCompleteProject(p)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Application-Specific Recommendations View (Completely Isolated) */
        <>
          {/* Skill Gap Analysis Card */}
          {currentAppData?.skillGapAnalysis && (
            <Card className="border-line-card bg-linear-to-b from-card to-input/30 p-6 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-line-card pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h3 className="font-serif text-lg font-bold text-ink">
                    Candidate Skill-Gap Analysis
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className="font-medium text-ink">{currentAppData.seniority}</span>
                  <span>·</span>
                  <span className="uppercase font-semibold tracking-wider text-primary">
                    {currentAppData.roleCategory.replace("_", " ")}
                  </span>
                </div>
              </div>

              <p className="text-xs text-ink/90 leading-relaxed">
                {currentAppData.skillGapAnalysis.summary}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                {/* Strengths */}
                <div className="rounded-panel border border-emerald-500/20 bg-emerald-500/5 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Existing Strengths
                  </div>
                  <ul className="space-y-1">
                    {currentAppData.skillGapAnalysis.strengths.slice(0, 4).map((s, idx) => (
                      <li key={idx} className="text-xs text-ink">
                        • {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Missing Skills / Gaps */}
                <div className="rounded-panel border border-amber-500/20 bg-amber-500/5 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Key Skill Gaps to Bridge
                  </div>
                  <ul className="space-y-1">
                    {currentAppData.skillGapAnalysis.missingSkills.slice(0, 4).map((s, idx) => (
                      <li key={idx} className="text-xs text-ink">
                        • {s}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Differentiation */}
                <div className="rounded-panel border border-primary/20 bg-primary/5 p-3.5 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Differentiating Edge
                  </div>
                  <ul className="space-y-1">
                    {currentAppData.skillGapAnalysis.differentiationOpportunities.slice(0, 4).map((s, idx) => (
                      <li key={idx} className="text-xs text-ink">
                        • {s}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {/* Filter Bar */}
          {currentAppData && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-card pb-3">
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted mr-1 flex items-center gap-1">
                  <Filter className="h-3.5 w-3.5" /> Filter:
                </span>
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  className={`rounded-control px-2.5 py-1 transition-colors ${
                    filter === "all"
                      ? "bg-selected font-semibold text-primary"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  All ({rawProjects.filter((p) => !p.skipped).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("liked")}
                  className={`rounded-control px-2.5 py-1 transition-colors ${
                    filter === "liked"
                      ? "bg-selected font-semibold text-primary"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Interested ({rawProjects.filter((p) => p.likedAt && !p.skipped).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("in_progress")}
                  className={`rounded-control px-2.5 py-1 transition-colors ${
                    filter === "in_progress"
                      ? "bg-selected font-semibold text-primary"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  In Progress ({rawProjects.filter((p) => (p.status === "IN_PROGRESS" || p.status === "PLANNED") && !p.skipped).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("completed")}
                  className={`rounded-control px-2.5 py-1 transition-colors ${
                    filter === "completed"
                      ? "bg-selected font-semibold text-primary"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Completed ({rawProjects.filter((p) => p.status === "COMPLETED" && !p.skipped).length})
                </button>
              </div>

              <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={showSkipped}
                  onChange={(e) => setShowSkipped(e.target.checked)}
                  className="rounded-sm"
                />
                Show skipped ({rawProjects.filter((p) => p.skipped).length})
              </label>
            </div>
          )}

          {/* Project Recommendations Grid */}
          {!currentAppData ? (
            <Card className="p-10 text-center space-y-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <Terminal className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-ink mb-1">
                  Discover High-Impact Projects For This Role
                </h3>
                <p className="text-xs text-muted max-w-lg mx-auto">
                  Our AI analyzes the employer&apos;s requirements and your background to recommend tailored projects that bridge skill gaps. When you choose a project, you can generate a complete coding-agent prompt to build it right away with Claude Code, Cursor, OpenCode, or Codex.
                </p>
              </div>
              <button
                type="button"
                disabled={isPending || !aiReady}
                onClick={handleGenerate}
                className={buttonClassName("primary", "md")}
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Analyzing Requirements & Profile...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Analyze Job & Recommend Projects
                  </>
                )}
              </button>
            </Card>
          ) : filteredProjects.length === 0 ? (
            <Card className="p-8 text-center text-xs text-muted">
              No projects match the selected filter.
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={`${project.applicationId}-${project.id}`}
                  project={project}
                  onViewDetails={(p) => setDetailProject(p)}
                  onToggleLike={(p) => handleToggleLike(p)}
                  onBuild={(p) => setBuildProject(p)}
                  onToggleSkip={(p) => handleToggleSkip(p)}
                  onUpdateStatus={(p, status) => handleUpdateStatus(p, status)}
                  onAddToResume={(p) => setCompleteProject(p)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Modals - Strictly Keyed to current project.id & applicationId */}
      {detailProject && detailProject.applicationId === applicationId && (
        <ProjectDetailModal
          key={`${detailProject.applicationId}-${detailProject.id}`}
          project={detailProject}
          open={!!detailProject}
          onOpenChange={(open) => !open && setDetailProject(null)}
          onBuild={(p) => {
            setDetailProject(null);
            setBuildProject(p);
          }}
        />
      )}

      {buildProject && buildProject.applicationId === applicationId && (
        <AgentPromptModal
          key={`${buildProject.applicationId}-${buildProject.id}`}
          applicationId={applicationId}
          project={buildProject}
          open={!!buildProject}
          onOpenChange={(open) => !open && setBuildProject(null)}
          onProjectUpdated={handleProjectUpdated}
        />
      )}

      {completeProject && completeProject.applicationId === applicationId && (
        <CompleteProjectModal
          key={`${completeProject.applicationId}-${completeProject.id}`}
          applicationId={applicationId}
          project={completeProject}
          open={!!completeProject}
          onOpenChange={(open) => !open && setCompleteProject(null)}
          onProjectUpdated={handleProjectUpdated}
        />
      )}
    </div>
  );
}
