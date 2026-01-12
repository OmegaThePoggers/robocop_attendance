FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose Vite port
EXPOSE 5173

# Start development server (host 0.0.0.0 is needed for container access)
CMD ["npm", "run", "dev", "--", "--host"]
