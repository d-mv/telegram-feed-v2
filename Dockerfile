FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ENV VITE_BASE_URL=/apps/telegram-feed/
RUN npx vite build --base=/apps/telegram-feed/

FROM pierrezemb/gostatic:latest
COPY --from=build /app/dist/ /srv/http/
CMD ["-port","8080","-enable-logging"]
