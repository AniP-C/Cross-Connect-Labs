# Hosting, domain and email

## The live site

| | |
| --- | --- |
| Host | Cloudflare Workers (free plan), static assets only |
| Address | https://cross-connect-labs.anipy2000.workers.dev |
| Worker name | `cross-connect-labs` |
| Config | `wrangler.jsonc` in the repo |
| Production branch | `main` |

### How a deploy works

1. You push to GitHub.
2. Cloudflare's build system (Workers Builds) clones the repo, runs `npm ci`, then:
   - for a push to **`main`**, it runs `npx wrangler deploy` and the site goes live
   - for a push to **any other branch**, it runs `npx wrangler versions upload`, which gives a **preview link** (`<something>-cross-connect-labs.anipy2000.workers.dev`) and doesn't touch the live site
3. Wrangler reads `wrangler.jsonc`, runs `npm run build`, and uploads `dist/`.

`wrangler.jsonc` sets:

- `build.command`: `npm run build`
- `assets.directory`: `./dist`
- `not_found_handling`: `404-page`, so unknown addresses get `404.html` with a 404 status
- `name`: must stay `cross-connect-labs`, the Worker's name in the dashboard

`public/_headers` caches the hashed files in `/_astro/` for a year and adds basic security headers. Cloudflare reads it automatically.

The Node version comes from `.node-version` (22.22.0). Astro 7 refuses to build on older Node.

### Settings to check once in the dashboard

Go to **Workers & Pages**, then **cross-connect-labs**, then **Settings → Build**:

- **Git repository:** `AniP-C/Cross-Connect-Labs`
- **Production branch:** `main`
- **Build command:** empty or `npm run build`. Either works, because `wrangler.jsonc` runs the build anyway.
- **Deploy command:** `npx wrangler deploy`
- **Non-production branch deploy command:** `npx wrangler versions upload`, with builds for non-production branches turned on if you want preview links
- **Root directory:** `/`

### Rollback

1. Open **Workers & Pages**, then **cross-connect-labs**, then **Deployments**.
2. Open the menu on an older version and choose **Rollback**.

You can roll back to the last 10 versions. You can also use `git revert` and push.

### Free plan limits

- **Builds:** 3,000 build minutes a month and 1 build at a time. One build takes about a minute.
- **Visitors:** requests for static files are free and unlimited.

Check Cloudflare's current limits page if the site grows.

## Own domain

1. **Get a domain.** If you buy it from **Cloudflare Registrar**, it is sold at cost and the DNS is already on Cloudflare. If you buy it elsewhere, add the domain to your Cloudflare account and change its nameservers at the registrar.
2. **Connect it to the Worker.** Go to **Workers & Pages**, then **cross-connect-labs**, then **Settings → Domains & Routes → Add → Custom domain**, and enter `yourdomain.com`. Add `www.yourdomain.com` too if you want it. Cloudflare creates the DNS record and the HTTPS certificate.
3. **Update the site address.** Set `site` in `astro.config.mjs` to `https://yourdomain.com` and push to `main`.
4. **Optional:** in **Settings → Domains & Routes**, turn off the `workers.dev` address, so only your domain serves the site.

## Email

You need two things:

- **An inbox** for `you@yourdomain`.
- **The contact form**, which doesn't need an inbox on your domain. Web3Forms or Formspree send enquiries to any address, including Gmail. Set it up in `src/data/site.ts`.

### Inbox options

| Option | Cost (USD) | Notes |
| --- | --- | --- |
| **Cloudflare Email Routing** | Free | Forwards `hello@yourdomain` to your Gmail. To reply *as* that address, add it in Gmail under **Settings → Accounts → Send mail as**, using an SMTP relay such as Brevo's free plan. Set up the SPF and DKIM records or replies land in spam. |
| **Zoho Mail Forever Free** | Free | Up to 5 users, 5 GB each, one domain. Web and Zoho apps only; no IMAP, so Outlook and other mail apps can't connect. |
| **Google Workspace Business Starter** | $7 per user a month (yearly), $8.40 (monthly) | Gmail on your domain, plus Drive and Meet. The closest to what you use now. |
| **Microsoft 365 Business Basic** | $7 per user a month (yearly), $8.40 (monthly) | Outlook on your domain, plus Teams and OneDrive. |

**Suggested path:** start with Cloudflare Email Routing, and move to Google Workspace when you want a proper business inbox.

### Sending email from your own code

You only need this for future apps. The site doesn't need it.

- **Azure Communication Services Email:** about $0.25 per 1,000 small emails.
- **Google Cloud:** has no email-sending service of its own. Use a partner such as SendGrid, Mailgun or Brevo.
- **Cloudflare Email Sending:** needs the Workers Paid plan (about $5 a month). It was in beta in 2026.

## Why Cloudflare and not the others

Prices were checked in October 2026.

| Host | Cost for this site | Notes |
| --- | --- | --- |
| **Cloudflare** | $0 | Business use allowed on the free plan. |
| Netlify | $0 | Free plan is credit-based. Deploys and traffic use credits, so a busy month can run out. |
| Vercel | $20 a month | The free Hobby plan is non-commercial only. |
| GCP: Firebase Hosting | $0 | 10 GB storage, 360 MB of traffic a day. |
| GCP: Cloud Run (Docker) | About $0 | Needs a billing account. Stored images over 0.5 GB cost $0.10/GB. |
| Azure Static Web Apps Free | $0 | Microsoft says it's for hobby or personal use, with no uptime guarantee. |
| Azure Static Web Apps Standard | About $9 an app a month | 100 GB of traffic a month included. |

## Sources

- [Cloudflare Workers Builds limits](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/)
- [Workers Builds configuration](https://developers.cloudflare.com/workers/ci-cd/builds/configuration)
- [Workers custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/index.md)
- [Workers rollbacks](https://blog.cloudflare.com/introducing-rollbacks-for-workers-deployments/)
- [Cloudflare Email Service pricing](https://developers.cloudflare.com/email-service/platform/pricing/)
- [Cloudflare Email Routing with Gmail](https://dev.to/pierre/gmail-with-cloudflare-email-routing-4413)
- [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- [Netlify credit-based plans](https://www.netlify.com/changelog/netlify-pricing-update-introducing-credit-based-plans/)
- [Firebase pricing](https://firebase.google.com/pricing?hl=hu)
- [Cloud Run pricing](https://cloud.google.com/run/pricing?hl=sl)
- [Azure Static Web Apps plans](https://learn.microsoft.com/en-us/azure/static-web-apps/plans)
- [Azure Communication Services email pricing](https://learn.microsoft.com/azure/communication-services/concepts/email-pricing)
- [Google Workspace pricing 2026](https://dupple.com/learn/google-workspace-pricing)
- [Microsoft 365 business price increase 2026](https://office-watch.com/2026/microsoft-365-business-price-increase-2026/)
- [Zoho Mail pricing](https://www.zoho.com/mail/images/mail-pricing-usd.pdf)
