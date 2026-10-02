FROM node:18-alpine AS builder
WORKDIR /app

# Install dependencies based on package.json
COPY package*.json ./
RUN npm install --production

# Copy app source
COPY . .

FROM node:18-alpine
WORKDIR /app

# Copy installed node_modules and app files from builder
COPY --from=builder /app /app

ENV NODE_ENV=production
EXPOSE 8080

CMD ["npm", "start"]
