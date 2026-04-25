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
    .map((e) => ({
      title: e.title,
      slug: e.slug,
      date: e.date ? new Date(e.date) : null,
      author: e.author,
      sourceUrl: e.sourceUrl,
      image: e.image,
      imgCaption: e.imgCaption || null,
      bodyHtml: e.bodyHtml,
      dek: dekFrom(e.bodyHtml),
      readingTime: readingTime(e.bodyHtml),
      fallbackFill: fallbackFill(e.slug),
    }))
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
}
