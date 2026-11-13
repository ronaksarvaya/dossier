"use client";

import { Dialog } from "radix-ui";
import { useState, useTransition } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileCheck,
  Link as LinkIcon,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import { buttonClassName } from "@/components/ui/button";
import { toast } from "@/components/toast";
import type { ProjectRecommendation } from "@/lib/project-recommendations";
import { addProjectToResumeAction } from "@/app/(app)/applications/[id]/projects-actions";

export function CompleteProjectModal({
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
  const [name, setName] = useState(project?.title || "");
  const [repoUrl, setRepoUrl] = useState(project?.repoUrl || "");
  const [skills, setSkills] = useState<string[]>(() => {
    if (!project) return [];
    return [
      ...project.techStack.languages,
      ...project.techStack.frameworks,
      project.techStack.database,
    ].filter(Boolean);
  });
  const [newSkill, setNewSkill] = useState("");
  const [bullets, setBullets] = useState<string[]>(() => {
    if (!project) return [];
    if (project.resumeBulletPoints?.length) return project.resumeBulletPoints;
    // Suggest high-impact starter bullets based on project architecture & challenges
    return [
      `Architected and built ${project.title}, a ${project.oneLiner.toLowerCase()} using ${project.techStack.languages.join("/") || "TypeScript"} and ${project.techStack.frameworks[0] || "modern frameworks"}.`,
      `Engineered ${project.architecture.systemOverview.split(".")[0] || "core system architecture"}, solving key challenges around ${project.engineeringChallenges[0] || "scalability and data integrity"}.`,
      `Implemented comprehensive test suite and local-first deployment, validating critical paths and performance.`,
    ];
  });
  const [isPending, startTransition] = useTransition();

  if (!project) return null;

  const handleAddBullet = () => {
    setBullets([...bullets, ""]);
  };

  const handleUpdateBullet = (index: number, val: string) => {
    const updated = [...bullets];
    updated[index] = val;
    setBullets(updated);
  };

  const handleRemoveBullet = (index: number) => {
    setBullets(bullets.filter((_, i) => i !== index));
  };

  const handleAddSkill = () => {
    const trimmed = newSkill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      toast("Please enter a project name");
      return;
    }
    const cleanBullets = bullets.map((b) => b.trim()).filter(Boolean);
    if (cleanBullets.length === 0) {
      toast("Please add at least one achievement bullet point for your resume");
      return;
    }

    startTransition(async () => {
      try {
        const result = await addProjectToResumeAction(applicationId, project.id, {
          name: name.trim(),
          link: repoUrl.trim(),
          bullets: cleanBullets,
          skills: skills.filter(Boolean),
        });
        onProjectUpdated(result.project);
        onOpenChange(false);
        toast("Completed project successfully added to your profile and resume!");
      } catch (err: any) {
        toast(err.message || "Failed to add project to resume");
      }
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs motion-safe:transition-opacity" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[90vh] w-[min(720px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 flex-col rounded-dialog border border-line-popover bg-card shadow-menu overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-line-card p-6 bg-card shrink-0">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 mb-1">
                <CheckCircle2 className="h-4 w-4" />
                Add Genuinely Completed Project to Resume
              </div>
              <Dialog.Title className="font-serif text-2xl font-bold text-ink">
                Review & Add to Resume
              </Dialog.Title>
              <Dialog.Description className="text-xs text-muted mt-1">
                Convert your built project into concrete portfolio achievements for your resume.
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

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Integrity Notice */}
            <div className="rounded-panel border border-warning/30 bg-warning/5 p-3.5 flex items-start gap-2.5 text-xs text-ink">
              <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block mb-0.5">Resume Verification Standard</span>
                Only add projects that you have genuinely built and tested. Incomplete, recommended, or planned projects should not be included on resumes.
              </div>
            </div>

            {/* Project Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted block mb-1">
                  Project Title on Resume
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-control border border-line-field bg-input px-3 py-1.5 text-sm text-ink"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted block mb-1">
                  Repository or Demo URL (Optional)
                </label>
                <div className="flex items-center rounded-control border border-line-field bg-input px-2.5 py-1.5">
                  <LinkIcon className="h-4 w-4 text-muted mr-2 shrink-0" />
                  <input
                    type="url"
                    placeholder="https://github.com/..."
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    className="w-full bg-transparent text-sm text-ink focus:outline-hidden"
                  />
                </div>
              </div>
            </div>

            {/* Associated Skills */}
            <div>
              <label className="text-xs font-medium text-muted block mb-1.5">
                Demonstrated Skills (Shown on Resume)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="flex items-center gap-1 rounded-full border border-line-field bg-input px-2.5 py-0.5 text-xs font-medium text-ink"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(skill)}
                      className="text-muted hover:text-danger ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add skill (e.g. Docker, Redis, TypeScript)..."
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                  className="rounded-control border border-line-field bg-input px-3 py-1 text-xs text-ink"
                />
                <button
                  type="button"
                  onClick={handleAddSkill}
                  className={buttonClassName("secondary", "sm")}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add
                </button>
              </div>
            </div>

            {/* Achievement Bullets */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted">
                  Achievement-Oriented Resume Bullets
                </label>
                <button
                  type="button"
                  onClick={handleAddBullet}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" />
                  Add bullet
                </button>
              </div>

              <div className="space-y-2">
                {bullets.map((bullet, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-muted text-xs font-mono mt-2">{idx + 1}.</span>
                    <textarea
                      rows={2}
                      value={bullet}
                      onChange={(e) => handleUpdateBullet(idx, e.target.value)}
                      placeholder="e.g. Architected high-throughput message consumer reducing latency by 40%..."
                      className="flex-1 rounded-control border border-line-field bg-input p-2.5 text-xs text-ink resize-y"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveBullet(idx)}
                      className="p-1 text-muted hover:text-danger mt-2"
                      title="Remove bullet"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-line-card bg-card p-4 px-6 shrink-0">
            <button
              type="button"
              className={buttonClassName("secondary", "sm")}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isPending}
              className={buttonClassName("primary", "sm")}
              onClick={handleSubmit}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  Saving to Profile...
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4 mr-1.5" />
                  Save & Add to Resume
                </>
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

