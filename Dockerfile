# Build stage
FROM node:24-alpine AS builder

RUN npm install -g pnpm@9
WORKDIR /app

# Accept build arguments for environment-specific variables
ARG NEXT_PUBLIC_API_URL=http://localhost:8080
ARG NEXT_PUBLIC_KEYCLOAK_ENABLED=true
ARG NEXT_PUBLIC_KEYCLOAK_URL=https://aran-stg.zpoa.com
ARG NEXT_PUBLIC_KEYCLOAK_REALM=master
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=ciyex-app

# Set as environment variables for Next.js build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_KEYCLOAK_ENABLED=$NEXT_PUBLIC_KEYCLOAK_ENABLED
ENV NEXT_PUBLIC_KEYCLOAK_URL=$NEXT_PUBLIC_KEYCLOAK_URL
ENV NEXT_PUBLIC_KEYCLOAK_REALM=$NEXT_PUBLIC_KEYCLOAK_REALM
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=$NEXT_PUBLIC_KEYCLOAK_CLIENT_ID

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

# Copy project files
COPY . .

RUN pnpm run build

# Production stage
FROM node:24-alpine AS runner

RUN npm install -g pnpm@9
WORKDIR /app

ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./next.config.mjs

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["pnpm", "start"]
