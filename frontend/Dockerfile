FROM node:22-alpine

# Set pnpm as the package manager
RUN npm install -g pnpm@9

# Set working directory
WORKDIR /app

# Copy package.json and pnpm-lock.yaml (if exists)
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --config.confirmModulesPurge=false

# Copy source code
COPY . .

# Expose Vite default port
EXPOSE 8073

# Start Vite in dev mode with host flag to allow access outside container
CMD ["pnpm", "run", "dev", "--host"]
