FROM node:18 AS builder

WORKDIR /app

COPY package*.json .

RUN npm ci

COPY . .

RUN npm run build


FROM nginx:alpine

LABEL org.opencontainers.image.title="task-app frontend" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.description="frontend for Task App"

COPY --from=builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf



