import { NextResponse } from "next/server";
import { auth }         from "@/lib/auth/config";

// Extract Google Doc/Slides ID from various URL formats
function parseGoogleUrl(url) {
  const docMatch   = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  const slideMatch = url.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);

  if (docMatch)   return { id: docMatch[1],   type: "doc" };
  if (slideMatch) return { id: slideMatch[1], type: "slides" };
  return null;
}

export async function POST(request) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  const { url } = await request.json();
  if (!url?.trim()) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const parsed = parseGoogleUrl(url);
  if (!parsed) {
    return NextResponse.json({
      error: "Couldn't find a Google Doc or Slides ID in that URL. Make sure you're pasting the full URL from your browser."
    }, { status: 400 });
  }

  const exportBase = parsed.type === "doc"
    ? `https://docs.google.com/document/d/${parsed.id}/export?format=txt`
    : `https://docs.google.com/presentation/d/${parsed.id}/export?format=txt`;

  // Also try to get the title from the HTML page
  const pageUrl = parsed.type === "doc"
    ? `https://docs.google.com/document/d/${parsed.id}/edit`
    : `https://docs.google.com/presentation/d/${parsed.id}/edit`;

  try {
    // Fetch the text content
    const exportRes = await fetch(exportBase, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0" },
    });

    if (exportRes.status === 401 || exportRes.status === 403) {
      return NextResponse.json({
        error: "This document is private. Open the document in Google Drive, click Share, and set it to 'Anyone with the link can view', then try again."
      }, { status: 403 });
    }

    if (!exportRes.ok) {
      return NextResponse.json({
        error: `Google returned an error (${exportRes.status}). Make sure the document exists and is shared with 'Anyone with the link can view'.`
      }, { status: 400 });
    }

    const rawText = await exportRes.text();
    const content = rawText.trim();

    if (!content) {
      return NextResponse.json({ error: "The document appears to be empty." }, { status: 400 });
    }

    // Try to get the title from the HTML page
    let title = "";
    try {
      const htmlRes = await fetch(pageUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });
      if (htmlRes.ok) {
        const html = await htmlRes.text();
        const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
        if (titleMatch) {
          // Google Docs titles look like "My Doc - Google Docs"
          title = titleMatch[1]
            .replace(/ - Google (Docs|Slides|Drive)$/i, "")
            .trim();
        }
      }
    } catch {
      // Title fetch failed — that's fine, user can enter it manually
    }

    return NextResponse.json({
      content,
      title,
      type: parsed.type,
    });

  } catch (err) {
    console.error("fetch-gdoc error:", err);
    return NextResponse.json({
      error: "Failed to fetch the document. Make sure it's shared with 'Anyone with the link can view'."
    }, { status: 500 });
  }
}
