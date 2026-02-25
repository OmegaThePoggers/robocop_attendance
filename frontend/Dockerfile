FROM node:22-alpine

# Add bash and curl for potential debugging
RUN apk add --no-cache bash curl

WORKDIR /app

# Copy package files first to leverage Docker cache
COPY package.json package-lock.json ./

# Install dependencies cleanly
RUN npm ci

# Copy rest of the application
COPY . .

# Expose Vite default port
EXPOSE 5173

# Ensure Vite runs bound to all interfaces
ENV HOST=0.0.0.0

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
