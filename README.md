# PWindows Quiz Engine

A classroom quiz engine with a real terminal. First game: **Crypto Mayhem**.

## Local dev

Requires Ruby 3+.

```bash
bundle install
bundle exec jekyll serve --livereload
```

Open http://localhost:4000.
No Ruby? Use Docker:

```docker
docker run --rm -v "$PWD:/srv/jekyll" -p 4000:4000 jekyll/jekyll \
  jekyll serve --livereload --host 0.0.0.0
```

## Deploy
Hosted at https://quizengine.pwindows.qzz.io (GitHub Pages, custom domain).
* Settings → Pages → Source: main / (root)
* Settings → Pages → Custom domain: quizengine.pwindows.qzz.io
* Settings → Pages → Enforce HTTPS: on (after DNS propagates)
DNS: quizengine CNAME pwindows.github.io.
The CNAME file at the repo root pins the domain. Don't delete it

## Structure
```text
_config.yml, Gemfile, CNAME
_layouts/default.html          ← HTML shell, every page uses it
_includes/terminal.html        ← the terminal frame (shared by games)
_data/config.yml               ← global balance numbers
_data/shells.yml               ← shell table
config.js                      ← Jekyll-generated globals (window.GAME_CONFIG, GAME_SHELLS)
styles.css
index.html                     ← landing, list of games
crypto-mayhem/                 ← first game
  index.html
  src/{main,terminal,commands,server}.js
```

## Styles
Shared styles live in `styles.css` (base + terminal) and are loaded by every
page via `_layouts/default.html`. A page can request additional stylesheets
through `styles:` in its front matter:
```yaml
---
layout: default
styles:
  - /landing.css
---
```
Themes are applied by overriding CSS custom properties defined in `:root` in
`styles.css`. A game's `style.css` is the right place for that.