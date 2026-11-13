# Call booking ("Let's hop on a call")

Visitors who don't know what they need can book a free call. They pick a day and a time, and enter a name and an email address. The booking then:

- goes into your Google Calendar with a Google Meet link
- sends the visitor a calendar invite with the Meet link

## How it works

| Part | File | What it does |
| --- | --- | --- |
| Buttons | `Hero.astro`, `ContactSection.astro` | Any button with `data-book` opens the dialog |
| Shared link | `src/scripts/booking.ts` | Any page address ending in `#book` opens the dialog on load, for links in emails and messages: `https://crossconnectlabs.com/?utm_source=email&utm_campaign=outreach#book` |
| Dialog | `ContactDialog.astro` (second `<dialog>`) and `src/scripts/booking.ts` | Shows free times in the visitor's own time zone and sends the booking |
| API | `worker/index.ts` | `GET /api/slots` reads your free/busy times. `POST /api/book` checks the slot is still free, then creates the event. |
| Settings | `booking` in `src/data/site.ts` | Time zone, working days and hours, call length, how far ahead people can book, shortest notice |

The Worker only runs for `/api/*`. Every other address is served straight from `dist/`.

**Before setup:** until the Google secrets below are added, the dialog offers WhatsApp and email instead, with a "can we hop on a call?" message typed in. The dev server and the Docker image work the same way, because they have no Worker.

## One-time setup (about 15 minutes)

### 1. Google Cloud project

1. Open https://console.cloud.google.com and create a project, for example `cross-connect-labs`.
2. Go to **APIs & Services → Library**, search for **Google Calendar API** and click **Enable**.

### 2. OAuth consent screen

1. Go to **Google Auth Platform → Branding**, or **OAuth consent screen** in older menus.
2. Set the app name to `Cross-Connect Labs booking` and enter your email. The user type is **External**.
3. Go to **Audience** and click **Publish app**, so the status is **In production**.
   - This matters: in "Testing" mode, Google cancels the refresh token after 7 days and booking stops.
   - You don't need Google's verification, because only you will sign in. You'll see a "Google hasn't verified this app" warning once. Click **Advanced → Go to …**.

### 3. OAuth client

1. Go to **Google Auth Platform → Clients → Create client**.
2. Choose **Web application**.
3. Under **Authorized redirect URIs**, add `https://developers.google.com/oauthplayground`.
4. Copy the **Client ID** and **Client secret**.

### 4. Refresh token

1. Open https://developers.google.com/oauthplayground.
2. Click the gear icon (top right), tick **Use your own OAuth credentials**, and paste the client ID and secret.
3. In **Step 1**, paste these two scopes, separated by a space, into the box at the bottom. Then click **Authorize APIs**.
   ```
   https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.freebusy
   ```
4. Sign in with the Google account whose calendar should take the bookings, and allow access.
5. In **Step 2**, click **Exchange authorization code for tokens**, then copy the **Refresh token**.

### 5. Secrets in Cloudflare

Go to **Workers & Pages → cross-connect-labs → Settings → Variables and Secrets → Add**. Set the type to **Secret** for each one:

| Name | Value |
| --- | --- |
| `GOOGLE_CLIENT_ID` | from step 3 |
| `GOOGLE_CLIENT_SECRET` | from step 3 |
| `GOOGLE_REFRESH_TOKEN` | from step 4 |
| `GOOGLE_CALENDAR_ID` | optional. Leave it out to use your main calendar. |

Use **Secret**, not **Text**: deploys from GitHub keep secrets but can replace text variables. Never put these values in the repo.

The secrets apply from the next request, so you don't need to redeploy.

### 6. Test it

1. Open the site and click **Let's hop on a call**. Days and times should appear.
2. Book a slot using a second email address of yours. Check that the event and the Meet link show up in your calendar, and that the invite arrives.
3. Delete the test event.

## Changing hours and length

Edit `booking` in `src/data/site.ts` and push. For example:

- `days: [1, 2, 3, 4, 5]` for Monday to Friday
- `dayStart: '11:00'` and `dayEnd: '19:00'` to change the hours
- `minutes: 20` for shorter calls

Only your main calendar (or the one in `GOOGLE_CALENDAR_ID`) is checked for busy times. Block time there to stop bookings.

## Abuse limits

- Bookings are accepted only for real free slots, and each slot can be booked once. That's at most 16 bookings a day with the default settings.
- Requests from other websites are refused, and the hidden bot field is checked.

If spam bookings start anyway, add Cloudflare Turnstile to the dialog.

## When it doesn't work

| Symptom | Cause |
| --- | --- |
| Dialog shows WhatsApp and email instead of times | Secrets missing, or Google refused the request. Open **Workers & Pages → cross-connect-labs → Observability → Logs** and look for `booking failed`. |
| Log says `invalid_grant` | The refresh token expired or was revoked. Check that the app is **In production** (step 2), then repeat step 4 and update `GOOGLE_REFRESH_TOKEN`. |
| Log says `403` with `insufficient scopes` | One of the two scopes was missing in step 4. Repeat step 4. |
