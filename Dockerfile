FROM node:20-alpine AS deps

WORKDIR /app
COPY package*.json ./
RUN npm ci --force

FROM node:20-alpine AS build

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS prod-deps

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --force

FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3010

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package*.json ./

USER node
EXPOSE 3010

CMD ["node", "dist/main"]