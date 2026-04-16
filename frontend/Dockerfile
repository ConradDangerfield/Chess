# --- Stage 1: Build ---
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install --legacy-peer-deps && npm install ajv@8 --legacy-peer-deps

COPY . .

ARG REACT_APP_BACKEND_URL=""
ARG REACT_APP_DISCORD_CLIENT_ID="1494226832709386351"
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
ENV REACT_APP_DISCORD_CLIENT_ID=$REACT_APP_DISCORD_CLIENT_ID

RUN npx craco build

# --- Stage 2: Serve with nginx ---
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

# Inline nginx config — no external file needed
RUN printf 'server {\n\
    listen 80;\n\
    server_name _;\n\
    location / {\n\
        root   /usr/share/nginx/html;\n\
        index  index.html;\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
    location /api/ {\n\
        proxy_pass         http://backend:8001;\n\
        proxy_set_header   Host $host;\n\
        proxy_set_header   X-Real-IP $remote_addr;\n\
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;\n\
    }\n\
    location /api/socket.io/ {\n\
        proxy_pass         http://backend:8001;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header   Upgrade $http_upgrade;\n\
        proxy_set_header   Connection "upgrade";\n\
        proxy_set_header   Host $host;\n\
        proxy_set_header   X-Real-IP $remote_addr;\n\
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;\n\
        proxy_read_timeout 86400;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
