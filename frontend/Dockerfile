# ---- Build stage ----
FROM node:20-alpine AS build

WORKDIR /app

# VITE_API_URL must be provided at build time (Vite inlines env vars).
ARG VITE_API_URL=http://localhost:8000
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ---- Serve stage (lightweight nginx) ----
FROM nginx:1.27-alpine

# SPA-friendly nginx config (deep links fall back to index.html).
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
