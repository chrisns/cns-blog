import archive from "./archive.json" with { type: "json" };

const FILLS = ["warm", "hot", "cool", "paper"];

function fallbackFill(slug = "") {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return FILLS[h % FILLS.length];
}

function plainText(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function stripLeadingTitleHeading(html, title) {
  // LinkedIn often repeats the article title as an <h2> at the top of the
  // body. Drop the first heading if its text matches the post's title — but
  // not real in-body headings.
  if (!html || !title) return html;
  const norm = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
  const wanted = norm(title);
  const match = html.match(/^([\s\S]{0,2000}?)<(h[12])\b[^>]*>([\s\S]*?)<\/\2>/i);
  if (!match) return html;
  if (norm(match[3]) !== wanted) return html;
  // Also drop the wrapping <div> if the heading was the only child.
  const wrapped = html.match(/^([\s\S]{0,2000}?)<div\b[^>]*>\s*<(h[12])\b[^>]*>([\s\S]*?)<\/\2>\s*<\/div>/i);
  if (wrapped && norm(wrapped[3]) === wanted) {
    return html.replace(wrapped[0], wrapped[1]);
  }
  return html.replace(match[0], match[1]);
}

function dekFrom(html, max = 220) {
  const text = plainText(html);
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const lastDot = slice.lastIndexOf(". ");
  return (lastDot > 80 ? slice.slice(0, lastDot + 1) : slice.replace(/\s+\S*$/, "")) + "…";
}

function readingTime(html) {
  const words = plainText(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

export default function () {
  return Object.values(archive)
    .filter((e) => e.title && e.bodyHtml)
    .map((e) => {
      const bodyHtml = stripLeadingTitleHeading(e.bodyHtml, e.title);
      return {
        title: e.title,
        slug: e.slug,
        date: e.date ? new Date(e.date) : null,
        author: e.author,
        sourceUrl: e.sourceUrl,
        image: e.image,
        imgCaption: e.imgCaption || null,
        bodyHtml,
        dek: dekFrom(bodyHtml),
        readingTime: readingTime(bodyHtml),
        fallbackFill: fallbackFill(e.slug),
      };
    })
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
}
