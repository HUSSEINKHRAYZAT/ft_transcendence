# ==========================================
# Stage 1: Build the Vite application
# ==========================================
FROM node:20-bookworm-slim AS build

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci

# Copy source code and configuration
COPY Conf ./Conf
COPY src ./src
COPY public ./public
COPY index.html ./
COPY postcss.config.js ./
COPY tailwind.config.js ./

# Build the application
RUN npm run build

# ==========================================
# Stage 2: Nginx runtime with built files
# ==========================================
FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Create directories for certificates and CA
RUN mkdir -p /etc/nginx/certs /etc/nginx/ca

# Expose HTTPS port
EXPOSE 443

# Health check - use wget with SSL no-check since we're using self-signed certs
# HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=5 \
#   CMD wget --no-verbose --tries=1 --spider --no-check-certificate https://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

