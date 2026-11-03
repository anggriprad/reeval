FROM node:22.23.4-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy hanya dependencies terlebih dahulu
COPY package*.json ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# Copy seluruh source code
COPY . .

# Build Next.js
RUN npm run build

# Expose port
EXPOSE 3006

# Start App
CMD ["npm", "start"]
