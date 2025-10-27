FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY turbo.json ./
COPY packages/*/package.json ./packages/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build packages
RUN npm run build

# Set working directory to worker
WORKDIR /app/apps/worker

CMD ["node", "dist/index.js"]
