# Use ECR Public Node.js image (Docker Hub is blocked in government environments)
FROM public.ecr.aws/docker/library/node:20-slim

# Set working directory
WORKDIR /app

# Disable SSL strict mode for government VPN environments (MUST be before any npm commands)
RUN npm config set strict-ssl false

# Install pnpm
RUN npm install -g pnpm@9.15.4 && pnpm config set strict-ssl false

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY api/package.json ./api/
COPY shared/package.json ./shared/
COPY web/package.json ./web/

# Install dependencies needed for build
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source and workspace files
COPY . .

# Build only runtime-required artifacts inside Docker
RUN pnpm run build:shared && pnpm run build:api && pnpm run build:web

# Expose port
EXPOSE 80

# Set production environment
ENV NODE_ENV=production
ENV VITE_APP_ENV=production
ENV PORT=80

# Start the selected runtime role
WORKDIR /app/api
CMD ["node", "dist/runtime-entry.js"]
