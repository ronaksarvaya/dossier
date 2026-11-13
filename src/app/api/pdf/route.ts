import { mkdir, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";

import { DocumentKind } from "@/generated/prisma/enums";
import { resolveFileName } from "@/lib/file-name";
import { holdPdf, pdfDownload } from "@/lib/pdf/downloads";
import { countPdfPages, printBasePath } from "@/lib/pdf/pages";
import { renderPdf } from "@/lib/pdf/render";
import { prisma } from "@/lib/prisma";
import { loadProfileName } from "@/lib/profile-data";
import { loadSettings } from "@/lib/settings-data";
import { route } from "@/lib/route";
import { FIT_LEVELS } from "@/lib/themes";

/** The documents an application can download, by their `doc=` value. */
const TAILORED = { resume: DocumentKind.RESUME, letter: DocumentKind.COVER_LETTER } as const;

/** Application ids are cuids; anything else never reaches a print path. */
const APPLICATION_ID = /^[a-z0-9]{1,64}$/i;

const notFound = (error: string) => NextResponse.json({ error }, { status: 404 });

/**
 * Downloads a document as a PDF (RES-5, APP-12): `?doc=base` for the base
 * resume, `?doc=resume&application={id}` or `?doc=letter&application={id}`
 * for an application's tailored resume or cover letter. The file is named
 * with Settings → PDF file name (SET-8).
 */
export const GET = route(async (request) => {
  const rendered = await renderRequested(request);
  return rendered instanceof Response ? rendered : pdfDownload(rendered.pdf, rendered.fileName);
});

/**
 * Renders the requested document, validates the PDF buffer, saves it to
 * public/generated-pdfs/ with a unique UUID-based filename, verifies the saved
 * file, and responds with the public URL and metadata.
 */
export const POST = route(async (request) => {
  const rendered = await renderRequested(request);
  if (rendered instanceof Response) return rendered;

  const pdfBuffer = rendered.pdf;

  // 1. Validate that the buffer is non-empty
  if (!pdfBuffer || pdfBuffer.byteLength === 0) {
    return NextResponse.json({ error: "PDF generation returned an empty buffer." }, { status: 500 });
  }

  // 2. Verify %PDF signature
  const header = Buffer.from(pdfBuffer.subarray(0, 5)).toString("ascii");
  if (!header.startsWith("%PDF")) {
    return NextResponse.json({ error: "Generated content is not a valid PDF." }, { status: 500 });
  }

  // 3. Create target directory: public/generated-pdfs/
  const targetDir = join(process.cwd(), "public", "generated-pdfs");
  await mkdir(targetDir, { recursive: true });

  // 4. Generate unique filename with UUID
  const params = request.nextUrl.searchParams;
  const doc = params.get("doc") ?? "document";
  const id = randomUUID();
  const filename = `${doc === "letter" ? "letter" : "resume"}-${id}.pdf`;
  const filePath = join(targetDir, filename);

  // 5. Await filesystem write
  await writeFile(filePath, Buffer.from(pdfBuffer));

  // 6. Verify file exists and has non-zero size
  const fileStat = await stat(filePath);
  if (!fileStat || fileStat.size === 0) {
    return NextResponse.json({ error: "Failed to verify saved PDF on disk." }, { status: 500 });
  }

  const publicUrl = `/generated-pdfs/${filename}`;
  console.log(`[PDF POST] Generated and saved ${filename} (${fileStat.size} bytes) to ${filePath}`);

  // Also keep in heldPdfs for backwards compatibility with any held retrieval
  holdPdf(pdfBuffer, rendered.fileName);

  return NextResponse.json({
    success: true,
    filename,
    url: publicUrl,
    size: fileStat.size,
  });
});

/** The PDF and file name of the document the query asks for, or a 404 response. */
async function renderRequested(request: NextRequest): Promise<{ pdf: Uint8Array; fileName: string } | Response> {
  const params = request.nextUrl.searchParams;
  const doc = params.get("doc");
  const [name, settings] = await Promise.all([loadProfileName(), loadSettings()]);
  const date = new Date();

  if (doc === "base") {
    // "Fit to one page" (public issue 69): squeezed a step at a time until it fits, as the preview does.
    let pdf = await renderPdf(printBasePath());
    for (let fit = 1; settings.fitBaseResume && fit <= FIT_LEVELS && countPdfPages(pdf) > 1; fit++) pdf = await renderPdf(printBasePath(fit));
    return { pdf, fileName: resolveFileName(settings.fileNamePattern, { name, doc: DocumentKind.RESUME, date }) };
  }

  if (doc !== "resume" && doc !== "letter") return notFound("There's no such document to download.");
  const id = params.get("application") ?? "";
  const application = APPLICATION_ID.test(id)
    ? await prisma.application.findUnique({
        where: { id },
        select: { company: true, role: true, documents: { where: { kind: TAILORED[doc] }, select: { id: true } } },
      })
    : null;
  if (!application) return notFound("That application no longer exists.");
  if (application.documents.length === 0) {
    return notFound(doc === "resume" ? "This application has no tailored resume." : "This application has no cover letter.");
  }

  return {
    pdf: await renderPdf(`/print/${doc}/${id}`),
    fileName: resolveFileName(settings.fileNamePattern, { name, company: application.company, role: application.role, doc: TAILORED[doc], date }),
  };
}
