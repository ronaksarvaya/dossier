"use client";

import { useState, type ReactNode } from "react";

import { toast } from "@/components/toast";
import { buttonClassName, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { messages } from "@/lib/messages";
import { downloadFrom, saveFile } from "@/lib/save-file";

/** The file name a download response asks for, preferring the UTF-8 one (RFC 6266). */
export function fileNameFrom(disposition: string | null): string | null {
  if (!disposition) return null;
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      // Fall back to the plain name.
    }
  }
  return /filename="([^"]*)"/i.exec(disposition)?.[1] ?? null;
}

type ProcessState = "idle" | "generating" | "saving" | "saved";

/**
 * Generates and saves a PDF to the server's public folder from /api/pdf.
 * Rendering and saving takes a moment, so it indicates progress on the button
 * and shows toasts. Duplicate clicks are prevented while running.
 */
export function DownloadPdfButton({
  href,
  held = true,
  variant = "primary",
  size = "md",
  progress = "Rendering your PDF on the server. It'll download in a moment.",
  children,
}: {
  href: string;
  /**
   * Whether `href` answers a POST by saving the PDF on the server and
   * returning its details, as /api/pdf does. Otherwise the file is fetched
   * and saved via blob (e.g. data export).
   */
  held?: boolean;
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** The toast while it renders, e.g. "Rendering your cover letter as a PDF…". */
  progress?: string;
  children: ReactNode;
}) {
  const [state, setState] = useState<ProcessState>("idle");
  const busy = state !== "idle";

  const download = async () => {
    setState("generating");
    toast(progress);
    try {
      const response = await fetch(href, held ? { method: "POST" } : undefined);
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        toast(body?.error ?? "Failed to generate or save PDF. Please try again.");
        setState("idle");
        return;
      }
      if (held) {
        setState("saving");
        const data = (await response.json()) as { success?: boolean; filename?: string; url?: string; size?: number };
        if (data.success && data.filename) {
          toast(`PDF generated and saved successfully! (${data.filename})`);
          setState("saved");
          setTimeout(() => setState("idle"), 3000);
        } else {
          toast("Failed to generate or save PDF. Please try again.");
          setState("idle");
        }
      } else {
        saveFile(await response.blob(), fileNameFrom(response.headers.get("content-disposition")) ?? "document.pdf");
        setState("idle");
      }
    } catch {
      toast("Failed to generate or save PDF. Please try again.");
      setState("idle");
    }
  };

  const label = () => {
    switch (state) {
      case "generating":
        return "Generating PDF…";
      case "saving":
        return "Saving PDF…";
      case "saved":
        return "Saved successfully!";
      default:
        return children;
    }
  };

  return (
    <a
      href={href}
      aria-disabled={busy || undefined}
      onClick={(event) => {
        event.preventDefault();
        if (!busy) void download();
      }}
      className={buttonClassName(variant, size, variant === "primary" ? "hover:text-on-primary" : undefined)}
    >
      {label()}
    </a>
  );
}
