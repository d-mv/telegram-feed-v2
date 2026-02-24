FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx vite build

FROM pierrezemb/gostatic:latest
COPY --from=build /app/dist/ /srv/http/
CMD ["-port","8080","-https-promote","-enable-logging"]
