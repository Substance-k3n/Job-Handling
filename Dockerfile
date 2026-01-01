FROM node:20-slim

# Use a consistent workdir inside the container
WORKDIR /usr/src/app

# Install dependencies first (leverages Docker layer caching)
COPY package*.json ./
RUN npm ci --production

# Copy application sources
COPY . .

# Optional: set NODE_ENV to production here; PORT can be provided by the orchestrator
ENV NODE_ENV=production

# Container will typically listen on the PORT env; expose the commonly used 5001 for Compose setup
EXPOSE 5001

USER root
RUN mkdir -p uploads/cvs && chmod -R 777 uploads

USER node



CMD ["npm", "start"]