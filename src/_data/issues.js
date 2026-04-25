import archive from "./archive.json" with { type: "json" };

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
    }))
    .sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0));
}
