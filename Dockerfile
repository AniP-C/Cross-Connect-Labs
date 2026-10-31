# syntax=docker/dockerfile:1

# Stage 1: build the static site with Node.
FROM node:22-alpine AS build
WORKDIR /app

# Install dependencies first so Docker can cache this layer between builds.
COPY package.json package-lock.json ./
RUN npm ci

# Copy the source and build it into /app/dist.
COPY . .
RUN npm run build

# Stage 2: serve the built files with nginx. Node is not part of the final image.
FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

# Cloud Run sends traffic to port 8080 by default; nginx.conf listens there.
EXPOSE 8080
