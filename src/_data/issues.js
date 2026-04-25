import { XMLParser } from "fast-xml-parser";

const FEED = "https://linkedinrss.cns.me/7439561267528458241";
const MAX_PAGES = 100;

function slugFromUrl(url) {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts[parts.length - 1];
  } catch {
    return url;
  }
}

export default async function () {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    cdataPropName: "__cdata",
    parseTagValue: false,
  });

  const items = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(`${FEED}?page=${page}`);
    if (!res.ok) {
      throw new Error(`Feed returned ${res.status} on page ${page}`);
    }
    const xml = await res.text();
    const parsed = parser.parse(xml);
    const raw = parsed.rss?.channel?.item;
    const pageItems = raw ? (Array.isArray(raw) ? raw : [raw]) : [];
    if (pageItems.length === 0) break;
    items.push(...pageItems);
  }

  const issues = items.map((it) => ({
    title: it.title,
    slug: slugFromUrl(it.link),
    date: new Date(it.pubDate),
    author: it.author,
    sourceUrl: it.link,
    image: it.enclosure?.["@_url"] ?? null,
    bodyHtml: it.description?.__cdata ?? it.description ?? "",
  }));

  // Belt-and-braces: ensure newest-first regardless of feed order.
  issues.sort((a, b) => b.date - a.date);

  return issues;
}
