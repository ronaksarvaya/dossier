"use client";

import { Dialog } from "radix-ui";
import { useState, useTransition } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Edit3,
  Eye,
  Loader2,
  RefreshCw,
  Save,
  Sliders,
  Terminal,
  X,
  Sparkles,
} from "lucide-react";

import { buttonClassName } from "@/components/ui/button";
import { toast } from "@/components/toast";
import type { AgentPromptConfig, ProjectRecommendation } from "@/lib/project-recommendations";
import { generatePromptAction, savePromptAction } from "@/app/(app)/applications/[id]/projects-actions";

export function AgentPromptModal({
  applicationId,
  project,
  open,
  onOpenChange,
  onProjectUpdated,
}: {
  applicationId: string;
  project: ProjectRecommendation | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProjectUpdated: (project: ProjectRecommendation) => void;
}) {
  const [config, setConfig] = useState<AgentPromptConfig>(() => ({
    agent: project?.promptConfig?.agent || "claude-code",
    complexity: project?.promptConfig?.complexity || "intermediate",
    deployment: project?.promptConfig?.deployment || "local-first",
    budget: project?.promptConfig?.budget || "free",
    customInstructions: project?.promptConfig?.customInstructions || "",
  }));

  const [promptText, setPromptText] = useState<string>(project?.agentPrompt || "");
  const [isEditing, setIsEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Keep state in sync if project changes
  if (project && project.agentPrompt && !promptText && !isPending) {
    setPromptText(project.agentPrompt);
  }

  if (!project) return null;

  const handleCopy = async () => {
    if (!promptText) return;
    try {
      await navigator.clipboard.writeText(promptText);
      setCopied(true);
      toast("Agent prompt copied to clipboard! Paste directly into your coding agent.");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast("Failed to copy automatically. Please select text and copy manually.");
    }
  };

  const handleSave = () => {
    startTransition(async () => {
      try {
        const updated = await savePromptAction(applicationId, project.id, promptText, config);
        onProjectUpdated(updated);
        setSaved(true);
        toast("Agent prompt and configuration saved successfully!");
        setTimeout(() => setSaved(false), 2500);
      } catch (err: any) {
        toast(err.message || "Failed to save prompt");
      }
    });
  };

  const handleGenerate = () => {
    startTransition(async () => {
      try {
        const { prompt, project: updated } = await generatePromptAction(applicationId, project.id, config);
        setPromptText(prompt);
        onProjectUpdated(updated);
        toast("Complete 11-section coding-agent prompt generated successfully!");
      } catch (err: any) {
        toast(err.message || "Failed to generate prompt. Please try again.");
      }
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs motion-safe:transition-opacity" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex h-[92vh] w-[min(960px,calc(100vw-24px))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-dialog border border-line-popover bg-card shadow-menu overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-line-card p-5 bg-card shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  <Terminal className="h-3 w-3" />
                  Coding-Agent Implementation Prompt
                </span>
                <span className="rounded-full bg-track px-2 py-0.5 text-xs text-muted">
                  {project.title}
                </span>
              </div>
              <Dialog.Title className="font-serif text-xl font-bold text-ink flex items-center gap-2">
                Turn-Key Implementation Instructions
              </Dialog.Title>
              <Dialog.Description className="text-xs text-muted mt-0.5">
                Paste this complete prompt into Claude Code, Cursor, OpenCode, or Codex to autonomously implement the project.
              </Dialog.Description>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className={`flex items-center gap-1.5 rounded-control px-2.5 py-1 text-xs font-medium border transition-colors ${
                  showConfig
                    ? "border-primary bg-selected text-primary"
                    : "border-line-field bg-input text-muted hover:text-ink"
                }`}
              >
                <Sliders className="h-3.5 w-3.5" />
                Agent Settings
                {showConfig ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

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
          </div>

          {/* Collapsible Agent Configuration Drawer */}
          {showConfig && (
            <div className="border-b border-line-card bg-input/70 p-4 shrink-0 transition-all">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                <div>
                  <label className="font-medium text-muted block mb-1">Coding Agent</label>
                  <select
                    value={config.agent}
                    onChange={(e) => setConfig({ ...config, agent: e.target.value as any })}
                    className="w-full rounded-control border border-line-field bg-card p-1.5 text-xs text-ink"
                  >
                    <option value="claude-code">Claude Code</option>
                    <option value="cursor">Cursor (Composer)</option>
                    <option value="opencode">OpenCode Agent</option>
                    <option value="codex">Codex / OpenAI</option>
                    <option value="other">Universal / Other</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-muted block mb-1">Target Complexity</label>
                  <select
                    value={config.complexity}
                    onChange={(e) => setConfig({ ...config, complexity: e.target.value as any })}
                    className="w-full rounded-control border border-line-field bg-card p-1.5 text-xs text-ink"
                  >
                    <option value="mvp">MVP (Core Flow)</option>
                    <option value="intermediate">Intermediate (Recommended)</option>
                    <option value="advanced">Advanced (Production-Grade)</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-muted block mb-1">Deployment Preference</label>
                  <select
                    value={config.deployment}
                    onChange={(e) => setConfig({ ...config, deployment: e.target.value as any })}
                    className="w-full rounded-control border border-line-field bg-card p-1.5 text-xs text-ink"
                  >
                    <option value="local-first">Local-first (Zero Config)</option>
                    <option value="docker">Docker & Compose</option>
                    <option value="cloud">Cloud-Ready</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-muted block mb-1">Tooling Budget</label>
                  <select
                    value={config.budget}
                    onChange={(e) => setConfig({ ...config, budget: e.target.value as any })}
                    className="w-full rounded-control border border-line-field bg-card p-1.5 text-xs text-ink"
                  >
                    <option value="free">100% Free & Open Source</option>
                    <option value="flexible">Flexible</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Optional custom directives (e.g. 'Use Bun instead of Node', 'Include Tailwind v4')..."
                  value={config.customInstructions || ""}
                  onChange={(e) => setConfig({ ...config, customInstructions: e.target.value })}
                  className="flex-1 rounded-control border border-line-field bg-card px-3 py-1.5 text-xs text-ink"
                />
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleGenerate}
                  className={buttonClassName("primary", "sm")}
                >
                  {isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                  )}
                  Apply & Regenerate
                </button>
              </div>
            </div>
          )}

          {/* Main Prompt Body */}
          <div className="flex-1 overflow-hidden flex flex-col p-5 bg-card">
            {/* View / Edit Mode Toggle & Status */}
            <div className="flex items-center justify-between pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className={`flex items-center gap-1.5 rounded-control px-2.5 py-1 text-xs font-medium border transition-colors ${
                    !isEditing
                      ? "border-primary bg-selected text-primary"
                      : "border-line-field bg-input text-muted hover:text-ink"
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview Formatted
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className={`flex items-center gap-1.5 rounded-control px-2.5 py-1 text-xs font-medium border transition-colors ${
                    isEditing
                      ? "border-primary bg-selected text-primary"
                      : "border-line-field bg-input text-muted hover:text-ink"
                  }`}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  Edit Prompt
                </button>
              </div>

              {promptText && (
                <span className="text-xs text-muted">
                  {promptText.split("\n").length} lines · ~{Math.round(promptText.split(/\s+/).length)} words
                </span>
              )}
            </div>

            {/* Prompt Display Area */}
            <div className="flex-1 overflow-hidden rounded-panel border border-line-card bg-input/40 flex flex-col">
              {isPending ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                  <p className="font-medium text-sm text-ink mb-1">
                    Generating Exhaustive Coding-Agent Implementation Prompt...
                  </p>
                  <p className="text-xs text-muted max-w-md">
                    Synthesizing system architecture, Mermaid diagrams, feature milestones, engineering standards, testing strategy, and interview preparation.
                  </p>
                </div>
              ) : !promptText ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <Terminal className="h-10 w-10 text-muted/60 mb-3" />
                  <p className="font-medium text-sm text-ink mb-1">
                    No Prompt Generated Yet
                  </p>
                  <p className="text-xs text-muted max-w-md mb-4">
                    Click the button below to generate a complete, self-contained coding prompt for this project tailored to {project.title}.
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    className={buttonClassName("primary", "md")}
                  >
                    <Sparkles className="h-4 w-4 mr-1.5" />
                    Generate Agent Prompt Now
                  </button>
                </div>
              ) : isEditing ? (
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  className="flex-1 w-full resize-none p-4 font-mono text-xs text-ink bg-transparent border-0 focus:outline-hidden"
                  placeholder="Paste or type instructions here..."
                />
              ) : (
                <div className="flex-1 overflow-y-auto p-4 select-text">
                  <pre className="font-mono text-xs text-ink whitespace-pre-wrap break-words leading-relaxed">
                    {promptText}
                  </pre>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between border-t border-line-card bg-card p-4 px-6 shrink-0">
            <button
              type="button"
              className={buttonClassName("text", "sm")}
              onClick={() => onOpenChange(false)}
            >
              ← Back to Recommendations
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isPending || !promptText}
                className={buttonClassName("secondary", "sm")}
                onClick={handleGenerate}
                title="Regenerate prompt with AI"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Regenerate
              </button>

              <button
                type="button"
                disabled={isPending || !promptText}
                className={buttonClassName("secondary", "sm")}
                onClick={handleSave}
              >
                {saved ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-emerald-500" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 mr-1" />
                    Save Prompt
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isPending || !promptText}
                className={buttonClassName("primary", "sm")}
                onClick={handleCopy}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 mr-1 text-on-primary" />
                    Copied to Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy Agent Prompt
                  </>
                )}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

