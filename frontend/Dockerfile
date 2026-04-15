# --- Stage 1: Build ---
FROM node:18-alpine AS build

# Disable corepack so packageManager field doesn't cause issues
RUN corepack disable 2>/dev/null || true

WORKDIR /app

COPY package.json ./
RUN yarn install --network-timeout 600000

COPY . .

# REACT_APP_BACKEND_URL is empty so the frontend calls
# the same origin (nginx proxies /api → backend)
ARG REACT_APP_BACKEND_URL=""
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL

RUN yarn build

# --- Stage 2: Serve with nginx ---
FROM nginx:alpine

# Copy the React build output
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
