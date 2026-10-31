# Learn Docker with this project

A short course built around this repo's `Dockerfile`. When you are ready to deploy the container, continue with [cloud-run.md](cloud-run.md). The live site doesn't need Docker; it runs on Cloudflare (see [hosting.md](hosting.md)).

**Install:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) on Windows or macOS. On Windows it asks to turn on WSL 2: accept, then restart.

## 1. The core ideas

- **Image:** a packaged, read-only snapshot of an app plus everything it needs (OS files, runtime, code). Like a recipe that has already been cooked and frozen.
- **Container:** a running copy of an image. You can start many containers from one image.
- **Dockerfile:** the step-by-step recipe Docker follows to build an image.
- **Layers and caching:**
  - Each step that changes files (`RUN`, `COPY`) adds a layer on top of the previous one.
  - Docker caches layers. When you rebuild, it reuses every layer up to the first step whose instruction or files changed, then rebuilds from there.
  - **So put the things that change least at the top.**
- **Build context:** the folder you send to Docker (the `.` in `docker build .`).
  - `COPY` can only take files from it.
  - `.dockerignore` keeps junk such as `node_modules` and `.git` out of it.

## 2. Our Dockerfile, line by line

```dockerfile
# syntax=docker/dockerfile:1
```
Tells Docker which Dockerfile syntax version to use. Optional, but good practice.

```dockerfile
FROM node:22-alpine AS build
```
**FROM** picks the starting image. `node:22-alpine` is Node 22 on Alpine Linux, which is very small. `AS build` names this stage so we can refer to it later.

```dockerfile
WORKDIR /app
```
Creates `/app` inside the image and makes it the current folder for the steps that follow. Like `cd`, but it sticks.

```dockerfile
COPY package.json package-lock.json ./
RUN npm ci
```
Copy **only** the dependency list first, then install. This is the caching trick:
- `npm ci` (about 70 seconds) only re-runs when those two files change, not every time you edit a page.
- `npm ci` installs exactly what's in the lock file, which keeps builds repeatable.

```dockerfile
COPY . .
RUN npm run build
```
Now copy the rest of the source and build. The output goes to `/app/dist`.

```dockerfile
FROM nginx:stable-alpine
```
A **second FROM starts a new, clean image**. This is a **multi-stage build**: Node, `node_modules` and the source code are all left behind, so the final image is about 95 MB instead of several hundred.

```dockerfile
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
```
Put our web server settings in place, then take **only** the finished site from the `build` stage.

```dockerfile
EXPOSE 8080
```
Documents which port the app listens on. It doesn't open anything by itself; `docker run -p` does that.

There's no `CMD` line because the nginx image already includes one that starts nginx. Most Dockerfiles end with `CMD [...]` to say what to run when the container starts.

## 3. Steps to write any Dockerfile

1. **Answer four questions about the app:** What runtime does it need? Which files? What command starts it? Which port?
2. **Pick a base image.** Use official images, prefer `-alpine` or `-slim` for size, and fix the version (`node:22`, not just `node`).
3. **Set `WORKDIR`.**
4. **Copy the dependency files, then install** (cache-friendly order).
5. **Copy the source code.**
6. **Build it**, if the app needs a build step.
7. **Say how to run it:** `EXPOSE` the port and `CMD` the start command.
8. **Optimise:** multi-stage builds, `.dockerignore`, a smaller base image, a non-root user.
9. **Build, run, test, repeat.**

## 4. Commands you'll use every day

| Command | What it does |
| --- | --- |
| `docker build -t cross-connect-labs .` | Build the image |
| `docker run --rm -p 8080:8080 cross-connect-labs` | Run it, then open http://localhost:8080 |
| `docker ps` | List running containers |
| `docker exec -it CONTAINER_ID sh` | Open a shell inside a running container |
| `docker images` | List your images and their sizes |
| `docker history cross-connect-labs` | Show the image's layers and the size of each |
| `docker system prune` | Delete stopped containers and unused data |

In `docker run`:
- In `-p 8080:8080`, the first number is the port on your computer and the second is the port inside the container.
- `--rm` deletes the container when it stops.

## 5. Practice exercises (about 30 minutes)

1. **Hello world.** In an empty folder, create a `Dockerfile` with these two lines, then build and run it.
   ```dockerfile
   FROM alpine:3.20
   CMD ["echo", "hello from a container"]
   ```
2. **Serve a page.** Make an `index.html`, then use:
   ```dockerfile
   FROM nginx:stable-alpine
   COPY index.html /usr/share/nginx/html/
   ```
   Run it with `-p 8080:80` (this nginx listens on 80) and open http://localhost:8080.
3. **Watch the cache.**
   1. In this project, build twice. The second build shows `CACHED` on almost every step.
   2. Edit one line in `src/data/site.ts` and rebuild. `npm ci` stays cached and only the build step re-runs.
4. **See why multi-stage matters.** Temporarily delete the nginx stage so the image ends after `npm run build`. Rebuild and compare sizes with `docker images`.
5. **Look inside.** Run our container, then `docker exec -it <id> sh` and `ls /usr/share/nginx/html`. Those are your site's files.
6. **Break it on purpose.**
   1. Change `listen 8080` to `listen 80` in `nginx.conf`, rebuild, and try `-p 8080:8080`.
   2. The page won't load, which shows why the port numbers must match.
   3. Change it back afterwards.

## 6. Common beginner mistakes

- **Wrong order:** copying all the code **before** installing dependencies, so every small edit re-installs everything.
- **No `.dockerignore`:** Docker gets `node_modules` and `.git`, which makes builds slow and images bloated.
- **Unpinned base images:** using `latest` or no version, so builds change without warning.
- **Secrets in the Dockerfile:** passwords or API keys stay in the image layers. Use environment variables at run time instead.
- **Listening on `127.0.0.1` inside the container:** the app must listen on all addresses (`0.0.0.0`) to be reachable from outside.

## Troubleshooting

- **`429 Too Many Requests` when pulling `node` or `nginx`:** Docker Hub limits anonymous downloads. Run `docker login` with a free Docker Hub account, or wait and try again.
- **`npm ci` fails during the build:** `package-lock.json` must be committed and match `package.json`. Run `npm install` locally and commit the updated lock file.
