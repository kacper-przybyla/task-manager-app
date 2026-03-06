FROM nginx:alpine

LABEL org.opencontainers.image.title="task-app proxy" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.description="proxy for Task App"

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

