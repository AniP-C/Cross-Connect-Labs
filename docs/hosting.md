# Hosting, domain and email

## The live site

| | |
| --- | --- |
| Host | Cloudflare Workers (free plan), static assets only |
| Address | https://cross-connect-labs.anipy2000.workers.dev |
| Worker name | `cross-connect-labs` |
| Config | `wrangler.jsonc` in the repo |
| Code | `worker/index.ts`, only for `/api/*` (call booking, see [booking.md](booking.md); visit log, see [analytics.md](analytics.md)) |
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

The site shows **hello@crossconnectlabs.com** (`contact.email` in `src/data/site.ts`).

The address only works once mail for the domain is routed somewhere. The free way is **Cloudflare Email Routing**: mail sent to `hello@crossconnectlabs.com` lands in your Gmail.

### Receive mail: Cloudflare Email Routing

The domain's DNS is on Cloudflare. It was registered at Porkbun, and its MX records still point to Porkbun's forwarding servers (`fwd1.porkbun.com`, `fwd2.porkbun.com`), with a Porkbun SPF record. Cloudflare replaces these in step 2.

1. In the Cloudflare dashboard, open **crossconnectlabs.com**, then **Email → Email Routing**, and click **Get started** or **Enable Email Routing**.
2. Cloudflare lists the DNS records it needs and the old ones that conflict. Let it **delete the Porkbun MX and SPF records** and **add its own**: three `route*.mx.cloudflare.net` MX records and an SPF TXT record.
3. Go to **Destination addresses → Add destination address**, enter your Gmail, and click the link in the email Cloudflare sends you.
4. Go to **Routing rules → Create address**:
   - **Custom address:** `hello`
   - **Action:** Send to an email
   - **Destination:** your Gmail
5. Optional: turn on **Catch-all** and send it to the same Gmail, so `anything@crossconnectlabs.com` also arrives.
6. Test it: from a different email account, send a message to `hello@crossconnectlabs.com`. It should arrive in Gmail within a minute.

### Reply as hello@: Gmail "Send mail as"

1. Turn on 2-Step Verification on your Google account. Then go to https://myaccount.google.com/apppasswords and create an app password called `crossconnect smtp`.
2. In Gmail, go to **Settings → See all settings → Accounts and Import → Send mail as → Add another email address**.
   - **Name:** Cross-Connect Labs
   - **Email:** `hello@crossconnectlabs.com`
   - Untick **Treat as an alias**.
3. Enter these SMTP settings:
   - **Server:** `smtp.gmail.com`
   - **Port:** `587`
   - **Username:** your Gmail address
   - **Password:** the app password from step 1
   - **TLS:** on
4. Gmail sends a code to `hello@crossconnectlabs.com`, which now forwards to you. Enter the code.
5. In Cloudflare, go to **DNS → Records** and edit the SPF TXT record on `crossconnectlabs.com` to include Google:
   ```
   v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all
   ```
6. Add a DMARC record so mail providers trust the domain:
   - **Type:** TXT
   - **Name:** `_dmarc`
   - **Content:** `v=DMARC1; p=none; rua=mailto:hello@crossconnectlabs.com`

Now choose "From: hello@crossconnectlabs.com" when you reply in Gmail.

### Contact form

The contact form doesn't need an inbox on your domain. It opens WhatsApp with the message typed in. For a form that delivers by email instead, set up Web3Forms or Formspree in `src/data/site.ts`.

### Inbox options

| Option | Cost (USD) | Notes |
| --- | --- | --- |
| **Cloudflare Email Routing** (set up above) | Free | Forwards `hello@crossconnectlabs.com` to your Gmail. Replies go out through Gmail's "Send mail as". |
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
