export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy("CNAME");
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  // The design system is the dependency @chrisns/design, not a copy in this repo.
  // colors_and_type.css @imports tokens.css relatively, so they must stay siblings.
  eleventyConfig.addPassthroughCopy({
    "node_modules/@chrisns/design/tokens.css": "assets/design/tokens.css",
    "node_modules/@chrisns/design/colors_and_type.css": "assets/design/colors_and_type.css",
    "node_modules/@chrisns/design/ui_kits/blog/blog.css": "assets/design/blog.css",
  });
  eleventyConfig.addWatchTarget("node_modules/@chrisns/design");

  eleventyConfig.addFilter("isoDate", (d) => new Date(d).toISOString());
  eleventyConfig.addFilter("humanDate", (d) =>
    new Date(d).toLocaleDateString("en-GB", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  );
  eleventyConfig.addFilter("rfc822", (d) => new Date(d).toUTCString());
  eleventyConfig.addFilter("humanYear", () => new Date().getFullYear());

  eleventyConfig.addFilter("absoluteUrl", (path, base) => {
    try {
      return new URL(path, base).toString();
    } catch {
      return path;
    }
  });

  eleventyConfig.addFilter("excerpt", (html, len = 200) => {
    if (!html) return "";
    const text = String(html)
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return text.length > len ? text.slice(0, len - 1) + "…" : text;
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
