# cns-blog

Source for [blog.cns.me](https://blog.cns.me) — a static rendering of Chris's LinkedIn newsletter
[*Cloudy with a chance of freefall*](https://www.linkedin.com/newsletters/cloudy-with-chance-of-freefall-7439561267528458241/).

## Architecture

- **Source**: RSS feed from `linkedinrss.cns.me/7439561267528458241` (the sibling
  [`linkedin-newsletter-rss`](https://github.com/chrisns/linkedin-newsletter-rss) Worker).
- **Generator**: [Eleventy](https://www.11ty.dev/) (11ty).
- **Hosting**: GitHub Pages, custom domain `blog.cns.me`.
- **Refresh**: GitHub Action on an hourly cron rebuilds and deploys.

## Develop

```bash
nvm use
npm install
npm run dev
```

## Build

```bash
npm run build
```

Output is written to `_site/`.
