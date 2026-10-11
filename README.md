# 4th Wall Experiential website

Static website for [4th Wall Experiential](https://4thwallexp.co.za/), an experiential agency based in South Africa.

Plain HTML, CSS and JavaScript. No build step and no dependencies.

## Running it locally

From the repository root:

```bash
python3 -m http.server 4321
```

Then open `http://localhost:4321`. Any static host works for deployment (GitHub Pages, Netlify, Cloudflare Pages or a standard web server).

## Pages

| File | Page |
|---|---|
| `index.html` | Home: pinned horizontal hero, services, process, story, contact band |
| `about.html` | About: approach, full service list, team |
| `portfolio.html` | Our Portfolio: filterable case study cards |
| `project-the-soil.html` | Case study: The Soil and Joy Nectar MCC |
| `project-joyous-celebration.html` | Case study: Joyous Celebration 30 Year Celebration Tour |
| `project-where-business-gets-done.html` | Case study: Marsh |
| `contact.html` | Hire Us: contact details and enquiry form |
| `careers.html` | Careers |
| `privacy.html` | Privacy policy |

Assets live in `assets/css`, `assets/js`, `assets/img` and `assets/video`.

## Tuning the motion

All scroll behaviour is in `assets/js/site.js`.

- **Hero pacing.** `HERO_SCROLL_PER_SLIDE` sets how many screen heights of scrolling each slide gets, and `HERO_HOLD` sets how much of that the slide stays parked in place. Raise either to slow the hero down.
- **Card cascades.** Any container with `data-stagger` reveals its children one at a time as each scrolls into view. The number is the gap between cards in milliseconds, for example `data-stagger="220"`.
- **Text choreography.** A wrapper with `data-reveal="split"` brings its children in one after another: labels from the left, headings rising out of a mask, paragraphs from the right, buttons lifting in.

Everything respects `prefers-reduced-motion`, and every hidden-until-revealed rule is scoped to a `js` class, so the site stays fully readable with JavaScript turned off.

## Videos

Self-hosted in `assets/video`: the 4th Wall recap on the home page, the Joy Nectar MCC launch on The Soil case study, and the Talent Indaba recap on the Marsh case study. Keep new files as H.264 MP4 at around 720p so they play in every browser and stay light on mobile data.

## Before going live

1. **Forms.** The contact form and the footer newsletter box validate in the browser but are not connected to anything yet. Point them at a form handler such as Formspree, Netlify Forms or a PHP mailer.
2. **Social links.** The Facebook, X and Instagram icons in the footer still link to `#`.
