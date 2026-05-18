FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/site/package.json apps/site/package.json

RUN npm ci

COPY . .

RUN npm run build

FROM nginx:1.27-alpine

COPY ops/docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/site/dist /usr/share/nginx/html
