# --- Stage 1: Build ---
FROM node:18-alpine AS build

WORKDIR /app

COPY package.json ./
RUN yarn install

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
