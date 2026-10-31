# Deploy to Google Cloud Run with Docker

This guide takes the site from your computer to a live URL on Google Cloud Run, by hand, one step at a time.

## How it works

The `Dockerfile` has two stages:

1. **Build** (`node:22-alpine`): installs packages with `npm ci` and runs `npm run build`, which writes the finished site to `dist/`.
2. **Serve** (`nginx:stable-alpine`): copies only `dist/` and `nginx.conf` into a small nginx image. Node is not in the final image.

`nginx.conf` listens on port **8080**, which is the port Cloud Run sends traffic to. It also caches Astro's hashed files for a year, compresses text files, adds basic security headers and shows `404.html` for unknown pages.

Cloud Run runs the container, gives it an HTTPS URL, and scales it down to zero when nobody is visiting.

## Do I need Docker installed?

- **To deploy: no.** `gcloud run deploy --source .` uploads the project to Google Cloud Build, which builds the Dockerfile in the cloud.
- **To build and test the container on your computer: yes.** Recommended while learning. Install [Docker Desktop](https://www.docker.com/products/docker-desktop/) on Windows or macOS, or Docker Engine on Linux.

## 1. Test the container locally (needs Docker)

Build the image:

```bash
docker build -t cross-connect-labs .
```

Run it:

```bash
docker run --rm -p 8080:8080 cross-connect-labs
```

Open http://localhost:8080. Press `Ctrl+C` in the terminal to stop it.

Useful while learning:

```bash
docker images cross-connect-labs
```

```bash
docker run --rm cross-connect-labs nginx -t
```

The first shows the image and its size. The second checks the nginx config inside the image.

## 2. One-time Google Cloud setup

1. Create a Google Cloud account and a **project** at https://console.cloud.google.com. Note the **project ID**.
2. **Turn on billing** for the project. Cloud Run needs a billing account even when you stay inside the free allowance. Then go to **Billing → Budgets & alerts** and set a small monthly budget with email alerts.
3. Install the **gcloud CLI**: https://cloud.google.com/sdk/docs/install

Then, in a terminal:

```bash
gcloud init
```

```bash
gcloud config set project YOUR_PROJECT_ID
```

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

## 3a. Deploy from source (simplest, no local Docker needed)

From the project folder:

```bash
gcloud run deploy cross-connect-labs --source . --region asia-south1 --allow-unauthenticated
```

- `--source .` sends the project to Cloud Build, which builds the `Dockerfile`.
- `--region asia-south1` is Mumbai. Pick the region closest to your visitors.
- `--allow-unauthenticated` makes the site public.

The first time, it asks to create an Artifact Registry repository called `cloud-run-source-deploy` to store the image. Answer `Y`. When it finishes it prints the live URL, like `https://cross-connect-labs-xxxxx.a.run.app`.

## 3b. Build locally and push (the full container workflow)

Use this if you want to learn how images move from your computer to the cloud.

Create a repository for your images (once):

```bash
gcloud artifacts repositories create web --repository-format=docker --location=asia-south1
```

Let Docker log in to it (once):

```bash
gcloud auth configure-docker asia-south1-docker.pkg.dev
```

Build and tag the image with its full address. On an Apple Silicon Mac, add `--platform linux/amd64`, because Cloud Run runs on x86 machines.

```bash
docker build -t asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/web/cross-connect-labs:v1 .
```

Push it:

```bash
docker push asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/web/cross-connect-labs:v1
```

Deploy that exact image:

```bash
gcloud run deploy cross-connect-labs --image asia-south1-docker.pkg.dev/YOUR_PROJECT_ID/web/cross-connect-labs:v1 --region asia-south1 --allow-unauthenticated
```

Next time, use a new tag (`v2`, `v3`, …) so you can always tell versions apart.

## 4. Update the site

Change the content, then run the same deploy command again (3a, or 3b with a new tag). Each deploy creates a new **revision**. To roll back, open the service in the Cloud Run console, go to **Revisions**, and send 100% of traffic to an older revision.

## 5. Use your own domain

In the Cloud Run console, open **Manage custom domains** and add a mapping for your domain, then create the DNS records it shows at your domain provider. HTTPS certificates are issued automatically.

Domain mapping is only available in some regions. If your region is not supported, either deploy to a supported region, put **Firebase Hosting** in front of the service (free), or use a global **Application Load Balancer** (paid). Check the current Cloud Run docs for the region list.

After the domain works, set `site` in `astro.config.mjs` to the real URL and deploy again, so canonical and social links are correct.

## Costs

Cloud Run, Cloud Build and Artifact Registry each include a monthly free allowance, which a small site like this normally stays inside. Artifact Registry charges for storage beyond its free amount, so delete old image versions now and then. Free allowances change, so check the current pricing pages and keep the budget alert from step 2.

## Clean up

Delete the service:

```bash
gcloud run services delete cross-connect-labs --region asia-south1
```

Then delete old images in **Artifact Registry** in the console.

## Troubleshooting

- **`429 Too Many Requests` when pulling `node` or `nginx`:** Docker Hub limits anonymous downloads. Run `docker login` with a free Docker Hub account, or wait and try again.
- **"Container failed to start and listen on the port":** nginx must listen on 8080. If you change the port in `nginx.conf`, pass the same number to `gcloud run deploy` with `--port`.
- **Permission or API errors on the first deploy:** check that billing is on, the three APIs from step 2 are enabled, and your account has the Owner or Editor role on the project.
- **`npm ci` fails during the build:** `package-lock.json` must be committed and match `package.json`. Run `npm install` locally and commit the updated lock file.
