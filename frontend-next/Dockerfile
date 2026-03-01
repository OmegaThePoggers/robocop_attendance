FROM node:22-alpine

# Add bash for debugging
RUN apk add --no-cache bash

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy application source
COPY . .

# Expose Next.js default port
EXPOSE 3000

# Set hostname to allow external access
ENV HOSTNAME=0.0.0.0

CMD ["npm", "run", "dev"]
