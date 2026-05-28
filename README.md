# Nest Auth Service

Authentication and account lifecycle API built with NestJS, PostgreSQL, Redis, and JWT.

## Overview

The service supports two auth modes running side-by-side:

- DB-backed mode: stores sessions and verification tokens in PostgreSQL.
- Redis-backed mode: stores OTPs, sessions, and refresh-token families in Redis.

Core capabilities:

- Register and verify account (OTP + tokenized link support).
- Login and issue access/refresh JWTs.
- Refresh token rotation.
- Logout current device or all devices.
- Forgot/reset password.
- API versioning, Swagger docs, health checks, global error formatting, and response wrapping.

## Tech Stack

- Node.js 20+
- NestJS 10
- PostgreSQL 16 (TypeORM)
- Redis
- SMTP mailer + Resend client
- Swagger
- Docker Compose for local infrastructure

## Runtime Routing

The app uses both a global API prefix and URI versioning:

- Global prefix: /api
- API version: /v1

This means controller routes are served under /api/v1.

Examples:

- Swagger UI: /api
- Health check: /api/v1/health
- Auth login (DB flow): /api/v1/auth/login

## Auth Endpoints

### DB-backed flow

- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/verify
- POST /api/v1/auth/resend-verification
- POST /api/v1/auth/forgot-password
- POST /api/v1/auth/reset-password
- POST /api/v1/auth/refresh-token
- POST /api/v1/auth/logout
- POST /api/v1/auth/logout-all

### Redis-backed flow

- POST /api/v1/auth/redis/register
- POST /api/v1/auth/redis/login
- POST /api/v1/auth/redis/verify
- POST /api/v1/auth/redis/resend-otp
- POST /api/v1/auth/redis/forgot-password
- POST /api/v1/auth/redis/reset-password
- POST /api/v1/auth/redis/refresh-token
- POST /api/v1/auth/redis/logout
- POST /api/v1/auth/redis/logout-all

## Health Endpoints

- GET /api/v1/health
- GET /api/v1/health/live
- GET /api/v1/health/ready

## Redis Keys and TTLs

Default TTLs:

- OTP: 10 minutes
- Email verification: 10 minutes
- Session: 7 days
- Refresh token record: 7 days
- OTP rate limiter: 1 hour

## Environment Variables

Create a .env file in the project root.

Required app settings:
check .env.example

## Local Development

### 1) Install dependencies

npm install

### 2) Start infrastructure

docker compose up -d

This starts:

- PostgreSQL on 5432
- pgAdmin on 8080
- Redis on 6379
- RedisInsight on 5540

### 3) Run the API

npm run start:dev

By default, the app process inside Docker Compose maps container port 3010 to host port 3011.

### 4) Swagger

Open:

http://localhost:3010/api (or your configured PORT)

## Useful NPM Scripts

- npm run start
- npm run start:dev
- npm run start:prod
- npm run build
- npm run lint
- npm run migration:generate
- npm run migration:create
- npm run migration:run
- npm run migration:revert

## Notes

- Throttling is enabled globally with Redis storage using three windows:
  - short: 3 requests / 5s
  - medium: 10 requests / 30s
  - long: 20 requests / 60s
- Responses are wrapped in a standard success envelope unless a handler already returns a full response shape.
- Exceptions are normalized by a global exception filter.
- docker-compose.prod.yml currently references Dockerfile.prod, but this repository contains Dockerfile and Dockerfile.dev.
