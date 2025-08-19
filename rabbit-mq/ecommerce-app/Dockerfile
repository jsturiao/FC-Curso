FROM node:18-alpine

# Set working directory
WORKDIR /app

    # Install dependencies first (for better caching)
    COPY package*.json ./
    RUN npm install

    # Copy application code
    COPY . .

    # Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Expose ports
EXPOSE 3000 3001

# Start the application
CMD ["npm", "start"]
