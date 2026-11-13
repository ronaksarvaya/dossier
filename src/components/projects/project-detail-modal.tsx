"use client";

import { Dialog } from "radix-ui";
import { useState } from "react";
import {
  Code2,
  Cpu,
  Layers,
  MessageSquare,
  Sparkles,
  Wrench,
  X,
  CheckCircle2,
} from "lucide-react";

import { buttonClassName } from "@/components/ui/button";
import type { ProjectRecommendation } from "@/lib/project-recommendations";

export function ProjectDetailModal({
  project,
  open,
  onOpenChange,
  onBuild,
}: {
  project: ProjectRecommendation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBuild: (project: ProjectRecommendation) => void;
}) {
  const [activeTab, setActiveTab] = useState<"architecture" | "challenges" | "interview" | "features">("architecture");

  if (!project) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs motion-safe:transition-opacity" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[min(840px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-dialog border border-line-popover bg-card shadow-menu overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-line-card p-6 bg-card">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {project.relevanceScore}% Job Match
                </span>
                <span className="rounded-full bg-track px-2.5 py-0.5 text-xs text-muted">
                  {project.difficulty} · {project.estimatedTime}
                </span>
                <span className="rounded-full bg-track px-2.5 py-0.5 text-xs font-medium uppercase text-muted">
                  {project.roleCategory.replace("_", " ")}
                </span>
              </div>
              <Dialog.Title className="font-serif text-2xl font-bold text-ink">
                {project.title}
              </Dialog.Title>
              <Dialog.Description className="text-sm text-muted mt-1">
                {project.oneLiner}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-control p-1 text-muted hover:bg-hover hover:text-ink"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </Dialog.Close>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-line-card bg-input/50 px-6 gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("architecture")}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 text-sm font-medium transition-colors ${
                activeTab === "architecture"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              <Layers className="h-4 w-4" />
              Architecture & Data Flow
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("challenges")}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 text-sm font-medium transition-colors ${
                activeTab === "challenges"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              <Cpu className="h-4 w-4" />
              Engineering Challenges
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("interview")}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 text-sm font-medium transition-colors ${
                activeTab === "interview"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              Interview Value
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("features")}
              className={`flex items-center gap-2 border-b-2 py-3 px-3 text-sm font-medium transition-colors ${
                activeTab === "features"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              <Wrench className="h-4 w-4" />
              Features Roadmap
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === "architecture" && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                    System Overview
                  </h4>
                  <p className="text-sm leading-relaxed text-ink">
                    {project.architecture.systemOverview}
                  </p>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                    Core Components
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {project.architecture.components.map((comp, i) => (
                      <div
                        key={i}
                        className="rounded-panel border border-line-card bg-input p-3 text-sm text-ink"
                      >
                        {comp}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                    Data Flow & Persistence
                  </h4>
                  <div className="rounded-panel border border-line-card bg-input p-4 space-y-3">
                    <div>
                      <span className="text-xs font-medium text-muted block mb-1">Data Flow:</span>
                      <p className="text-sm text-ink">{project.architecture.dataFlow}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted block mb-1">Database Design:</span>
                      <p className="text-sm text-ink">{project.architecture.databaseDesign}</p>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-muted block mb-1">API Design:</span>
                      <p className="text-sm text-ink">{project.architecture.apiDesign}</p>
                    </div>
                  </div>
                </div>

                {project.architecture.keyDecisions?.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                      Key Engineering Trade-offs & Decisions
                    </h4>
                    <ul className="space-y-2">
                      {project.architecture.keyDecisions.map((decision, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-ink">
                          <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <span>{decision}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === "challenges" && (
              <div className="space-y-4">
                <p className="text-sm text-muted">
                  These technical challenges demonstrate deep domain competence and solve authentic problems encountered in the target role:
                </p>
                <div className="space-y-3">
                  {project.engineeringChallenges.map((challenge, i) => (
                    <div
                      key={i}
                      className="rounded-panel border border-line-card bg-input p-4"
                    >
                      <div className="flex items-center gap-2 font-medium text-sm text-ink mb-1">
                        <Cpu className="h-4 w-4 text-warning" />
                        Challenge #{i + 1}
                      </div>
                      <p className="text-sm text-muted">{challenge}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "interview" && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                    Why This Beats Generic Portfolio Projects
                  </h4>
                  <div className="rounded-panel border border-primary/20 bg-primary/5 p-4 text-sm text-ink">
                    {project.interviewValue.whyBetterThanGeneric}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                    Skills & Concepts Demonstrated
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {project.interviewValue.showcasedConcepts.map((concept, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-line-field bg-input px-3 py-1 text-xs font-medium text-ink"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                    Anticipated Interview Discussion Questions
                  </h4>
                  <ul className="space-y-3">
                    {project.interviewValue.discussionQuestions.map((q, i) => (
                      <li
                        key={i}
                        className="rounded-panel border border-line-card bg-input p-3 text-sm text-ink flex items-start gap-2"
                      >
                        <MessageSquare className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "features" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    Phase 1: Essential MVP
                  </h4>
                  <ul className="space-y-2">
                    {project.features.essential.map((feat, i) => (
                      <li
                        key={i}
                        className="rounded-panel border border-line-card bg-input p-3 text-xs text-ink"
                      >
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mb-3 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                    Phase 2: Advanced Engineering
                  </h4>
                  <ul className="space-y-2">
                    {project.features.advanced.map((feat, i) => (
                      <li
                        key={i}
                        className="rounded-panel border border-line-card bg-input p-3 text-xs text-ink"
                      >
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-line-card bg-card p-4 px-6">
            <div className="text-xs text-muted">
              Ready to implement this project with Claude Code, Cursor, OpenCode, or Codex?
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className={buttonClassName("secondary", "sm")}
                onClick={() => onOpenChange(false)}
              >
                Close
              </button>
              <button
                type="button"
                className={buttonClassName("primary", "sm")}
                onClick={() => {
                  onOpenChange(false);
                  onBuild(project);
                }}
              >
                <Code2 className="h-4 w-4 mr-1.5" />
                Build This Project
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

