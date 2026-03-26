FROM node:22-alpine

# Set pnpm as the package manager
RUN npm install -g pnpm

# Set working directory
WORKDIR /app

# Copy package.json and pnpm-lock.yaml (if exists)
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN pnpm exec prisma generate

# Expose backend port
EXPOSE 3000

# Start backend in dev mode
CMD ["pnpm", "run", "start:dev"]
