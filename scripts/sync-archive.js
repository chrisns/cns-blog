#!/usr/bin/env node
// Reconcile src/_data/archive.json with what's available from the
// linkedin-newsletter-rss Worker. Always refreshes the top-of-feed
// pages (in case LinkedIn updated something there) and back-fills
// content for any archive slug that doesn't yet have a body.
//
// Reasoning behind this design:
// - LinkedIn truncates the public listing to a handful of recent
//   issues, so the live RSS alone can never be the source of truth
//   for older posts. The archive is our durable record.
// - Older archive entries were seeded by a one-off authenticated
//   scrape; they carry only a slug until this script back-fills.
// - Bursts of >5 issues between hourly refreshes are unavoidably
//   lossy (matches the agreed-upon trade-off).

import fs from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";

const FEED_BASE = process.env.FEED_BASE || "https://linkedinrss.cns.me";
const NEWSLETTER_ID = process.env.NEWSLETTER_ID || "7439561267528458241";
const ARCHIVE_PATH = new URL("../src/_data/archive.json", import.meta.url);

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  cdataPropName: "__cdata",
  parseTagValue: false,
});

function slugFromUrl(url) {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts[parts.length - 1];
  } catch {
    return url;
  }
}

function entryFromRssItem(it) {
  return {
    slug: slugFromUrl(it.link),
    title: it.title,
    date: it.pubDate ? new Date(it.pubDate).toISOString() : null,
    sourceUrl: it.link,
    image: it.enclosure?.["@_url"] ?? null,
    imgCaption: it.imgCaption || null,
    bodyHtml: it.description?.__cdata ?? it.description ?? "",
    fetchedAt: new Date().toISOString(),
  };
}

function entryFromArticleJson(slug, j) {
  return {
    slug,
    title: j.title,
    date: j.pubDate ? new Date(j.pubDate).toISOString() : null,
    sourceUrl: j.link,
    image: j.img || null,
    imgCaption: j.imgCaption || null,
    bodyHtml: j.description || "",
    fetchedAt: new Date().toISOString(),
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchTopPages() {
  const items = [];
  for (let page = 1; page <= 100; page++) {
    const res = await fetch(`${FEED_BASE}/${NEWSLETTER_ID}?page=${page}`);
    if (!res.ok) {
      // Don't abort the whole sync on a transient upstream failure — the
      // archive is additive, so a missed live refresh is less bad than
      // skipping the back-fill step entirely.
      console.warn(
        `Worker page ${page} returned ${res.status}; stopping live refresh early`
      );
      break;
    }
    const xml = await res.text();
    const parsed = parser.parse(xml);
    const raw = parsed.rss?.channel?.item;
    const pageItems = raw ? (Array.isArray(raw) ? raw : [raw]) : [];
    if (pageItems.length === 0) break;
    items.push(...pageItems);
    await sleep(500);
  }
  return items.map(entryFromRssItem);
}

async function fetchArticleBySlug(slug) {
  const res = await fetch(`${FEED_BASE}/article/${slug}`);
  if (!res.ok) {
    throw new Error(`/article/${slug} returned ${res.status}`);
  }
  return entryFromArticleJson(slug, await res.json());
}

function isComplete(entry) {
  return Boolean(entry && entry.title && entry.bodyHtml);
}

async function loadArchive() {
  try {
    return JSON.parse(await fs.readFile(ARCHIVE_PATH, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return {};
    throw e;
  }
}

async function saveArchive(archive) {
  // Stable, sorted-by-key write so diffs stay small.
  const ordered = {};
  for (const k of Object.keys(archive).sort()) ordered[k] = archive[k];
  await fs.writeFile(ARCHIVE_PATH, JSON.stringify(ordered, null, 2) + "\n");
}

async function main() {
  const archive = await loadArchive();
  let touched = false;

  // 1. Refresh whatever the Worker currently exposes (top-of-feed).
  const live = await fetchTopPages();
  for (const entry of live) {
    archive[entry.slug] = entry;
    touched = true;
  }
  console.log(`Refreshed ${live.length} live issues`);

  // 2. Back-fill any archived slug that doesn't have content yet.
  const incomplete = Object.values(archive).filter((e) => !isComplete(e));
  if (incomplete.length) {
    console.log(`Back-filling ${incomplete.length} archive entries`);
    for (const stub of incomplete) {
      try {
        const filled = await fetchArticleBySlug(stub.slug);
        archive[stub.slug] = filled;
        touched = true;
        console.log(`  + ${stub.slug}`);
      } catch (e) {
        console.error(`  ! ${stub.slug}: ${e.message}`);
      }
      await sleep(750);
    }
  }

  if (touched) {
    await saveArchive(archive);
    console.log(`Wrote ${Object.keys(archive).length} entries to archive.json`);
  } else {
    console.log("No changes");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
