"use client";

import { useState } from "react";
import {
  Archive,
  CheckCircle2,
  Code2,
  Eye,
  FileCheck,
  Heart,
  RotateCcw,
  Sparkles,
  Terminal,
} from "lucide-react";

import { buttonClassName } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  ProjectRecommendation,
  ProjectStatus,
} from "@/lib/project-recommendations";

export function ProjectCard({
  project,
  onViewDetails,
  onToggleLike,
  onBuild,
  onToggleSkip,
  onUpdateStatus,
  onAddToResume,
}: {
  project: ProjectRecommendation;
  onViewDetails: (project: ProjectRecommendation) => void;
  onToggleLike: (project: ProjectRecommendation) => void;
  onBuild: (project: ProjectRecommendation) => void;
  onToggleSkip: (project: ProjectRecommendation) => void;
  onUpdateStatus: (project: ProjectRecommendation, status: ProjectStatus) => void;
  onAddToResume: (project: ProjectRecommendation) => void;
}) {
  const isLiked = !!project.likedAt;

  const statusColors: Record<ProjectStatus, string> = {
    RECOMMENDED: "bg-track text-muted",
    LIKED: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    PROMPT_GENERATED: "bg-primary/10 text-primary border-primary/20",
    PLANNED: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    IN_PROGRESS: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    COMPLETED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  };

  const statusLabels: Record<ProjectStatus, string> = {
    RECOMMENDED: "Recommended",
    LIKED: "Interested / Liked",
    PROMPT_GENERATED: "Prompt Ready",
    PLANNED: "Planned",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
  };

  if (project.skipped) {
    return (
      <Card className="opacity-60 border-dashed p-4 flex items-center justify-between">
        <div>
          <span className="text-xs font-medium text-muted line-through mr-2">
            {project.title}
          </span>
          <span className="text-xs text-muted">(Skipped)</span>
        </div>
        <button
          type="button"
          onClick={() => onToggleSkip(project)}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <RotateCcw className="h-3 w-3" />
          Restore
        </button>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col justify-between border-line-card hover:border-line-strong transition-all duration-200">
      <div>
        {/* Top Badges & Like Button */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold">
              {project.relevanceScore}% Match
            </span>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusColors[project.status]}`}
            >
              {statusLabels[project.status]}
            </span>
            <span className="rounded-full bg-track px-2 py-0.5 text-xs text-muted">
              {project.difficulty}
            </span>
            <span className="rounded-full bg-track px-2 py-0.5 text-xs text-muted">
              {project.estimatedTime}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onToggleLike(project)}
            className={`p-1.5 rounded-full border transition-colors ${
              isLiked
                ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                : "border-line-field bg-input text-muted hover:text-ink hover:bg-hover"
            }`}
            title={isLiked ? "Unlike project" : "Like project"}
          >
            <Heart className={`h-4 w-4 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
          </button>
        </div>

        {/* Title & Tagline */}
        <h3 className="font-serif text-lg font-bold text-ink mb-1 leading-snug">
          {project.title}
        </h3>
        <p className="text-xs text-muted mb-3 leading-relaxed">
          {project.oneLiner}
        </p>

        {/* Tech Stack Pills */}
        <div className="mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted block mb-1.5">
            Tech Stack
          </span>
          <div className="flex flex-wrap gap-1">
            {project.techStack.languages.map((lang) => (
              <span
                key={lang}
                className="rounded-full border border-line-field bg-input px-2 py-0.5 text-[11px] font-medium text-ink"
              >
                {lang}
              </span>
            ))}
            {project.techStack.frameworks.map((fw) => (
              <span
                key={fw}
                className="rounded-full border border-line-field bg-input px-2 py-0.5 text-[11px] font-medium text-ink"
              >
                {fw}
              </span>
            ))}
            {project.techStack.database && (
              <span className="rounded-full border border-line-field bg-input px-2 py-0.5 text-[11px] font-medium text-muted">
                {project.techStack.database}
              </span>
            )}
          </div>
        </div>

        {/* Why Recommended Callout */}
        <div className="rounded-panel border border-primary/15 bg-primary/5 p-2.5 mb-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
            <Sparkles className="h-3.5 w-3.5" />
            Why This Project Wins
          </div>
          <p className="text-xs text-ink/90 leading-relaxed">
            {project.relevanceToRole}
          </p>
        </div>
      </div>

      {/* Card Footer: Status Selector & Actions */}
      <div className="border-t border-line-card pt-3 mt-1 flex flex-col gap-2.5">
        {/* Status Dropdown */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted font-medium">Lifecycle Status:</span>
          <select
            value={project.status}
            onChange={(e) => onUpdateStatus(project, e.target.value as ProjectStatus)}
            className="rounded-control border border-line-field bg-input px-2 py-1 text-xs text-ink font-medium"
          >
            <option value="RECOMMENDED">Recommended</option>
            <option value="LIKED">Interested / Liked</option>
            <option value="PROMPT_GENERATED">Prompt Generated</option>
            <option value="PLANNED">Planned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        {/* Add to Resume button if completed */}
        {project.status === "COMPLETED" && (
          <div className="rounded-panel border border-emerald-500/30 bg-emerald-500/5 p-2.5 flex items-center justify-between">
            <div className="text-xs text-emerald-800 dark:text-emerald-300">
              <span className="font-semibold block">Genuinely Built?</span>
              Add verified achievements to your resume
            </div>
            <button
              type="button"
              onClick={() => onAddToResume(project)}
              className={buttonClassName("primary", "sm")}
            >
              <FileCheck className="h-3.5 w-3.5 mr-1" />
              Add to Resume
            </button>
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex items-center justify-between gap-1.5 pt-1">
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={buttonClassName("secondary", "sm")}
              onClick={() => onViewDetails(project)}
              title="View Architecture & Details"
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              Details
            </button>
            <button
              type="button"
              className={buttonClassName("text", "sm")}
              onClick={() => onToggleSkip(project)}
              title="Skip this recommendation"
            >
              Skip
            </button>
          </div>

          <button
            type="button"
            className={buttonClassName("primary", "sm")}
            onClick={() => onBuild(project)}
          >
            <Terminal className="h-3.5 w-3.5 mr-1.5" />
            Build This Project
          </button>
        </div>
      </div>
    </Card>
  );
}

