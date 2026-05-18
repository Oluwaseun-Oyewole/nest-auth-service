# Nest Auth Service

Production-oriented authentication and account lifecycle service built with NestJS, PostgreSQL, and Redis.

This service supports two authentication pipelines:

- Database-backed token and session persistence.
- Redis-backed OTP/session/token-family flow for faster revocation and low-latency verification.

## 1. System Overview

### 1.1 Responsibilities

- User registration and account verification (email OTP + tokenized link).
- Login and JWT issuance (access + refresh tokens).
- Refresh token rotation.
- Device/session logout and global logout.
- Forgot/reset password workflows.
- API versioning, Swagger docs, consistent response envelope, and global exception handling.

### 1.2 Runtime Architecture

```mermaid
flowchart LR
  C[Client Apps] --> A[NestJS Auth API]
  A --> P[(PostgreSQL)]
  A --> R[(Redis)]
  A --> M[SMTP Provider]
  A --> RS[Resend API]

  subgraph A1[Auth API Internal Modules]
    AU[Auth Module]
    US[User Module]
    TS[Token Module]
    OS[OTP Module]
    SS[Sessions Module]
    RSS[Redis Sessions Module]
    MS[Mail Service Module]
  end
```

### 1.3 Infrastructure Components

- API Runtime: NestJS 10 on Node.js 20.
- Database: PostgreSQL 16 (TypeORM).
- Cache/State: Redis (OTP, refresh token families, Redis sessions, throttling storage).
- API Docs: Swagger UI at /api.
- Local Infra Orchestration: Docker Compose (Postgres, pgAdmin, Redis, RedisInsight).

## 2. Codebase Topology

### 2.1 Core Modules

- auth: Controllers, guards, JWT strategies, auth business logic.
- user: User entity and user lifecycle services.
- user-tokens: Persistent verification/reset tokens (DB-backed flow).
- sessions: Persistent DB sessions keyed by JWT jti.
- redis-sessions: Session state in Redis for Redis-backed flow.
- otp: OTP generation/validation with attempt counters in Redis.
- token: Refresh/access token issuance and family revocation in Redis.
- integration-services/mail-service: SMTP and Resend email delivery.
- redis: Global Redis client and helper service.
- shared: Config, decorators, exception hierarchy, response wrappers, interceptors.

### 2.2 Request Lifecycle

1. Request hits versioned route prefix /v1.
2. Global throttler checks limits (stored in Redis).
3. Route-level guards validate access or refresh token.
4. Business service executes with Postgres and/or Redis.
5. Global response interceptor wraps non-standard responses.
6. Global exception filter maps errors to consistent JSON format.

## 3. Authentication Flows

### 3.1 Standard DB-Backed Flow

- register: Creates user, stores verification token and OTP in Postgres, sends email.
- login: Validates credentials, issues JWT pair, stores session in Postgres by jti.
- verify: Validates token/OTP from verification_tokens and activates account.
- forgot/reset password: Uses Postgres-stored token/OTP and revokes existing sessions.
- refresh-token: Verifies refresh token, rotates jti session, re-issues pair.
- logout/logout-all: Revokes one or all DB sessions.

### 3.2 Redis-Backed Flow

- register-redis: Creates user, generates OTP + verify token in Redis.
- login-redis: Creates Redis session, issues family-scoped refresh token.
- verify-redis: Validates OTP from Redis and activates account.
- forgot/reset-password-redis: Uses Redis OTP and updates password.
- refresh-token-redis: Verifies family record, rotates pair, revokes family/session.
- logout-redis/logout-all-redis: Revokes session(s) and token family/families.

## 4. API Surface

### 4.1 Base URLs

- API (local): http://localhost:3010
- Versioned routes: /v1/\*
- Swagger: /api

### 4.2 Auth Endpoints

Redis-backed:

- POST /v1/auth/register-redis
- POST /v1/auth/login-redis
- POST /v1/auth/verify-redis
- POST /v1/auth/resend-otp-redis
- POST /v1/auth/forgot-password-redis
- POST /v1/auth/reset-password-redis
- POST /v1/auth/refresh-token-redis
- POST /v1/auth/logout-redis
- POST /v1/auth/logout-all-redis

DB-backed:

- POST /v1/auth/register
- POST /v1/auth/login
- POST /v1/auth/verify
- POST /v1/auth/resend-verification
- POST /v1/auth/forgot-password
- POST /v1/auth/reset-password
- POST /v1/auth/refresh-token
- POST /v1/auth/logout
- POST /v1/auth/logout-all

## 5. Data and State Design

### 5.1 PostgreSQL Entities

- users
  - Identity and account status.
  - Password stored as hash.
  - Activation/password change/login timestamps.

- verification_tokens
  - OTP + token records for EMAIL_VERIFICATION and PASSWORD_RESET.
  - Used/expiry metadata.

- sessions
  - Active device sessions keyed by JWT jti.
  - Device and IP metadata.

### 5.2 Redis Keyspace

- otp:register:{email}
- otp:reset:{email}
- verify:email:token:{token}
- session:{sessionId}
- sessions:{userId}
- refresh-token:{userId}:{family}
- token-families:{userId}
- rate:otp:{identifier}

Default TTLs:

- OTP: 10 minutes.
- Email verification token: 10 minutes.
- Session: 7 days.
- Refresh token record: 7 days.

## 6. Security and Platform Controls

### 6.1 JWT and Session Controls

- Access and refresh tokens use separate secrets.
- Refresh endpoints validate token signatures and session state.
- Session revoke-on-expiry behavior for stale refresh tokens.
- Logout-all support in both storage modes.

### 6.2 Request Throttling

Global throttler profiles:

- short: 3 requests / 5s
- medium: 10 requests / 30s
- long: 20 requests / 60s

Throttler state is persisted in Redis.

## 8. Local Development

### 8.1 Prerequisites

- Node.js 20+
- npm 10+
- Docker and Docker Compose

### 8.2 Start Infrastructure Dependencies

````bash
docker compose up -d

### 8.3 Install and Run API

```bash
npm install
npm run start:dev
````

### 8.4 Swagger and Health Check

- Swagger UI: http://localhost:3010/api
- Sample app endpoint: GET /v1/

<!-- ## 11. Production Hardening Checklist -->
<!-- - Add structured logging and request correlation IDs.
- Ensure SMTP/Resend failover and delivery observability.
- Add CI pipeline gates for lint, test, and security scans. -->
