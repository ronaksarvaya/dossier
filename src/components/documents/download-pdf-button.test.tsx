import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "@/components/toast";

import { DownloadPdfButton, fileNameFrom } from "./download-pdf-button";

vi.mock("@/components/toast", () => ({ toast: vi.fn() }));

describe("fileNameFrom", () => {
  it("prefers the UTF-8 name", () => {
    expect(
      fileNameFrom("attachment; filename=\"Jane - Resume.pdf\"; filename*=UTF-8''Jane%20%E2%80%93%20Resume.pdf"),
    ).toBe("Jane – Resume.pdf");
  });

  it("falls back to the plain name", () => {
    expect(fileNameFrom('attachment; filename="Resume.pdf"')).toBe("Resume.pdf");
    expect(fileNameFrom(null)).toBeNull();
  });
});

describe("DownloadPdfButton", () => {
  const click = vi.fn();
  // Counts across tests: the last file offered stays until the next download.
  let made = 0;

  beforeEach(() => {
    vi.mocked(toast).mockReset();
    click.mockReset();
    URL.createObjectURL = vi.fn(() => `blob:pdf-${++made}`);
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      click(this.download, this.getAttribute("href"));
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("has the server generate and save the PDF, showing progress and success toasts without initiating browser download", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: true, filename: "resume-123.pdf", url: "/generated-pdfs/resume-123.pdf", size: 43629 })));
    render(<DownloadPdfButton href="/api/pdf?doc=base">Download PDF</DownloadPdfButton>);
    const link = screen.getByRole("link", { name: "Download PDF" });
    expect(link).toHaveAttribute("href", "/api/pdf?doc=base");
    await userEvent.click(link);
    expect(toast).toHaveBeenCalledWith("Rendering your PDF on the server. It'll download in a moment.");
    expect(fetch).toHaveBeenCalledWith("/api/pdf?doc=base", { method: "POST" });
    expect(toast).toHaveBeenCalledWith(expect.stringContaining("PDF generated and saved successfully!"));
    expect(click).not.toHaveBeenCalled();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("shows an error notification when PDF saving fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ success: false }, { status: 500 })));
    render(<DownloadPdfButton href="/api/pdf?doc=base">Download PDF</DownloadPdfButton>);
    const link = screen.getByRole("link", { name: "Download PDF" });
    await userEvent.click(link);
    expect(toast).toHaveBeenCalledWith("Failed to generate or save PDF. Please try again.");
    expect(click).not.toHaveBeenCalled();
  });

  it("saves a file that isn't held from the page, under the server's file name", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(new Blob(["{}"]), {
          headers: { "content-disposition": "attachment; filename*=UTF-8''Jane%20%E2%80%93%20Dossier.json" },
        }),
      ),
    );
    render(
      <DownloadPdfButton href="/api/export" held={false}>
        Export
      </DownloadPdfButton>,
    );
    await userEvent.click(screen.getByRole("link", { name: "Export" }));
    expect(fetch).toHaveBeenCalledWith("/api/export", undefined);
    expect(click).toHaveBeenCalledWith("Jane – Dossier.json", expect.stringMatching(/^blob:/));
  });

  it("keeps the file while a Save dialog is open, however long, and frees it on the next download", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      vi.stubGlobal("fetch", vi.fn(async () => new Response(new Blob(["{}"]))));
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      render(
        <DownloadPdfButton href="/api/export" held={false}>
          Export
        </DownloadPdfButton>,
      );
      const link = screen.getByRole("link", { name: "Export" });
      await user.click(link);
      await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
      const first = vi.mocked(URL.createObjectURL).mock.results.at(-1)?.value;
      vi.advanceTimersByTime(60_000);
      expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(first);
      await user.click(link);
      await waitFor(() => expect(click).toHaveBeenCalledTimes(2));
      expect(URL.revokeObjectURL).toHaveBeenCalledWith(first);
    } finally {
      vi.useRealTimers();
    }
  });

  it("shows the server's error instead of leaving the page", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "You've been signed out." }, { status: 401 })));
    render(<DownloadPdfButton href="/api/pdf?doc=base">Download PDF</DownloadPdfButton>);
    await userEvent.click(screen.getByRole("link", { name: "Download PDF" }));
    expect(toast).toHaveBeenLastCalledWith("You've been signed out.");
    expect(click).not.toHaveBeenCalled();
  });

  it("says what it's rendering when told (E8-8)", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ url: "/api/pdf/held-2" })));
    render(
      <DownloadPdfButton href="/api/pdf?doc=letter&application=a1" progress="Rendering your cover letter as a PDF…">
        Download PDF
      </DownloadPdfButton>,
    );
    await userEvent.click(screen.getByRole("link", { name: "Download PDF" }));
    expect(toast).toHaveBeenCalledWith("Rendering your cover letter as a PDF…");
  });
});
