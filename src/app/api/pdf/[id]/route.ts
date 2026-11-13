import { NextResponse } from "next/server";

import { heldPdf, pdfDownload } from "@/lib/pdf/downloads";
import { route } from "@/lib/route";

const GONE = "That PDF isn't here any more. Download it again.";

/** Hands over a PDF that `POST /api/pdf` rendered and held for a few minutes. */
export const GET = route<RouteContext<"/api/pdf/[id]">>(async (request, { params }) => {
  const rawId = (await params).id;
  const id = rawId.replace(/\.pdf$/, "");
  console.log(`[PDF GET] Requesting id="${id}"`);
  const headerMap: Record<string, string> = {};
  request.headers.forEach((val, key) => { headerMap[key] = val; });
  console.log(`[PDF GET] Request headers:`, JSON.stringify(headerMap));
  console.log(`[PDF GET] Cookies:`, request.cookies.getAll().map(c => c.name));
  const held = heldPdf(id);
  if (!held) {
    console.log(`[PDF GET] id="${id}" NOT FOUND in held map`);
    return NextResponse.json({ error: GONE }, { status: 404 });
  }
  console.log(`[PDF GET] id="${id}" FOUND — pdf bytes=${held.pdf.byteLength}, fileName="${held.fileName}"`);
  const response = pdfDownload(held.pdf, held.fileName);
  console.log(`[PDF GET] Response created, status=${response.status}`);
  return response;
});
