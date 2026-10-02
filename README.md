# EVE Healthcare Diagnostic Booking Backend

## 1. Project Overview

The **EVE Healthcare Diagnostic Booking Backend** is an interview-ready REST API service built for diagnostic test bookings, dynamic pricing management, simulated payment processing, and idempotent payment webhooks.

The service allows patients to authenticate securely, discover diagnostic centres and test catalogs, book medical appointments with immutable price snapshots, simulate payments, and process asynchronous provider webhooks with guaranteed idempotency and state protection.

---

## 2. Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js (v5)
- **Language**: JavaScript (ES6+ / CommonJS)
- **Database**: PostgreSQL (works with standard local PostgreSQL or cloud-hosted instances such as Neon)
- **ORM**: Prisma ORM (v6.19.3)
- **Authentication**: JSON Web Tokens (JWT) + Bcryptjs
- **Validation**: Zod (v4)
- **API Documentation**: Swagger UI + swagger-jsdoc (OpenAPI 3.0)
- **Testing**: Jest + Supertest

---

## 3. Features

1. **Authentication & Authorization**:
   - Secure customer registration and login with bcrypt password hashing (10 salt rounds).
   - Stateless JWT authentication with standard 24-hour expiration (`expiresIn: '24h'`).
   - Zero sensitive credential leakage (passwords and hashes are never returned by any endpoint).
   - Strict multi-tenant data ownership verification (User A cannot view, modify, cancel, or pay for User B's bookings).

2. **Diagnostic Centres & Tests**:
   - Diagnostic branch management with physical location details.
   - Master medical test catalog with descriptions.
   - Dynamic many-to-many junction entity (`CentreTest`) with centre-specific custom test pricing.

3. **Diagnostic Test Booking System**:
   - User identity derived strictly from validated JWT (no client spoofing).
   - Historical pricing snapshot: Captures test price at appointment booking time to protect against future price changes.
   - Future appointment date validation (past timestamps are rejected).
   - Patient self-service cancellation for pending reservations.

4. **Simulated Payment Processing**:
   - Direct simulated payment endpoint (`POST /api/payments`) supporting deterministic `SUCCESS` and `FAILED` outcomes.
   - Atomic database transactions synchronizing payment record creation and booking status updates.
   - State transition enforcement (only `PENDING` bookings can be paid).

5. **Payment Webhook & Idempotency**:
   - Public provider-to-server webhook endpoint (`POST /api/payments/webhook`) operating without user JWT.
   - Webhook is completely separate from the direct simulated payment endpoint, demonstrating asynchronous provider callback handling.
   - Duplicate prevention: Pre-transaction application check + PostgreSQL database `UNIQUE` constraint on `eventId`.
   - Replay protection: Receiving duplicate webhooks returns HTTP 200 without creating duplicate records or mutating database states.
   - Terminal state protection: Prevents invalid transitions (e.g., `CONFIRMED -> FAILED` or `CANCELLED -> CONFIRMED`).

6. **Interactive Swagger Documentation**:
   - Complete OpenAPI 3.0 specification available at `/api-docs`.
   - Direct in-browser testing with JWT Bearer authentication support.

7. **Integration Testing**:
   - 54 automated integration tests across 5 test suites covering happy paths, security boundaries, and edge cases.

---

## 4. Project Structure

```
eve-healthcare/
├── prisma/
│   ├── migrations/            # SQL migration history
│   └── schema.prisma          # Relational database schema definition
├── src/
│   ├── config/
│   │   ├── env.js             # Centralized environment variable loader
│   │   └── prisma.js          # Singleton Prisma client instance
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── centre.controller.js
│   │   ├── test.controller.js
│   │   ├── booking.controller.js
│   │   ├── payment.controller.js
│   │   └── health.controller.js
│   ├── middlewares/
│   │   ├── auth.middleware.js # JWT verification and req.user attachment
│   │   ├── validate.middleware.js # Reusable Zod schema validation
│   │   └── error.middleware.js # Centralized 404 & 500 error handlers
│   ├── routes/
│   │   ├── auth.routes.js
│   │   ├── centre.routes.js
│   │   ├── test.routes.js
│   │   ├── booking.routes.js
│   │   ├── payment.routes.js
│   │   └── health.routes.js
│   ├── validators/
│   │   ├── auth.validator.js
│   │   ├── centre.validator.js
│   │   ├── test.validator.js
│   │   ├── booking.validator.js
│   │   └── payment.validator.js
│   ├── swagger.js             # Swagger UI / OpenAPI 3.0 definition
│   ├── app.js                 # Express application configuration & routing
│   └── server.js              # Server lifecycle & port binding
├── tests/
│   ├── auth.test.js           # Auth integration tests (11 tests)
│   ├── centres.test.js        # Centre & test integration tests (14 tests)
│   ├── bookings.test.js       # Booking & authorization tests (10 tests)
│   ├── payments.test.js       # Payment integration tests (7 tests)
│   └── webhook.test.js        # Webhook idempotency tests (12 tests)
├── .env.example               # Environment variables template
├── .gitignore
├── jest.config.js             # Jest test configuration
├── package.json               # Node.js project manifest & scripts
├── package-lock.json          # Deterministic dependency lockfile
└── README.md
```

---

## 5. Prerequisites

Before running the application, ensure the following are installed:
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: Accessible PostgreSQL database instance (local PostgreSQL or cloud-hosted PostgreSQL such as Neon)

---

## 6. Installation

```bash
# 1. Clone the repository
git clone https://github.com/theadarsh1m/eve-healthcare.git
cd eve-healthcare

# 2. Install project dependencies using npm
npm install
```

---

## 7. Environment Variables

Create your local `.env` configuration from the provided template:

```bash
cp .env.example .env
```

Configure the following variables in `.env`:

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `PORT` | Local HTTP server port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string used by the application and Prisma | `postgresql://username:password@localhost:5432/eve_healthcare` |
| `JWT_SECRET` | Secret key used to sign and verify JWTs | `replace_with_secure_secret` |

> - **Database Configuration**: `DATABASE_URL` is the single connection string used by both the application and Prisma for all database queries and migrations. For local PostgreSQL, it can point to the local database shown in the example above.
> - **Security Note**: Never commit your `.env` file or real secrets to version control. It is explicitly listed in `.gitignore`.

---

## 8. Database Setup

Apply the Prisma migrations to create all database tables, enums, indexes, and constraints:

```bash
# Generate the Prisma Client
npm run prisma:generate

# Apply database migrations
npx prisma migrate dev
```

---

## 9. Running the Application

### Development Mode (with Nodemon hot-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Verify Health Endpoint
```bash
curl http://localhost:5000/api/health
```

Expected Response:
```json
{
  "success": true,
  "message": "EVE Healthcare API is running"
}
```

---

## 10. Swagger / OpenAPI Documentation

The API provides interactive **Swagger / OpenAPI 3.0** documentation.

When the server is running, navigate in your browser to:
```
http://localhost:5000/api-docs
```

The raw OpenAPI JSON specification is also accessible at:
```
http://localhost:5000/api-docs.json
```

### Authenticating in Swagger UI:
1. Register a user via `POST /api/auth/signup` or login via `POST /api/auth/login`.
2. Copy the returned `token`.
3. Click the green **Authorize 🔓** button at the top right of the Swagger UI page.
4. Paste your token in the value field (Swagger will automatically send it as `Bearer <token>`).
5. You can now execute protected endpoints directly from Swagger UI.

---

## 11. API Endpoints

### Health Check
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Verify server uptime and status |

### Authentication
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Public | Register a new user |
| `POST` | `/api/auth/login` | Public | Authenticate user & obtain 24h JWT |
| `GET` | `/api/auth/me` | Protected | Get current authenticated user profile |

### Diagnostic Centres
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/centres` | Protected | Create a new diagnostic centre |
| `GET` | `/api/centres` | Public | List all diagnostic centres |
| `GET` | `/api/centres/:id` | Public | Get single centre with assigned tests & prices |

### Diagnostic Tests
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/tests` | Protected | Create a diagnostic test in catalog |
| `GET` | `/api/tests` | Public | List all diagnostic tests |
| `GET` | `/api/tests/:id` | Public | Get single diagnostic test by ID |

### Centre Tests (Pricing Association)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/centres/:id/tests` | Protected | Link test to centre with custom price |

### Bookings
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/bookings` | Protected | Book a test (derives price snapshot & user) |
| `GET` | `/api/bookings` | Protected | List all bookings for authenticated user |
| `GET` | `/api/bookings/:id` | Protected | Get single booking details (ownership enforced) |
| `PATCH` | `/api/bookings/:id/cancel` | Protected | Cancel a pending booking |

### Payments (Simulated User Operation)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/payments` | Protected | Execute simulated payment (`SUCCESS` or `FAILED`) |

### Webhook (Simulated Gateway Callback)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/payments/webhook` | Public | Provider webhook with idempotent event processing |

---

## 12. Example API Requests

### 1. User Signup
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "Password123!"
  }'
```

### 2. User Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "jane@example.com",
    "password": "Password123!"
  }'
```

### 3. Create Diagnostic Centre
```bash
curl -X POST http://localhost:5000/api/centres \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "name": "Apex Diagnostic Centre",
    "location": "Connaught Place, New Delhi"
  }'
```

### 4. Create Diagnostic Test
```bash
curl -X POST http://localhost:5000/api/tests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "name": "Complete Blood Count (CBC)",
    "description": "Evaluates red cells, white cells, and platelets"
  }'
```

### 5. Link Test to Centre with Price
```bash
curl -X POST http://localhost:5000/api/centres/<CENTRE_ID>/tests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "testId": "<TEST_ID>",
    "price": 450.00
  }'
```

### 6. Create Booking
```bash
curl -X POST http://localhost:5000/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "centreTestId": "<CENTRE_TEST_ID>",
    "appointmentAt": "2026-12-01T10:30:00.000Z"
  }'
```

### 7. Process Simulated Payment (User-Initiated)
```bash
curl -X POST http://localhost:5000/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "bookingId": "<BOOKING_ID>",
    "result": "SUCCESS"
  }'
```

### 8. Payment Provider Webhook (Simulated Gateway Callback)
```bash
curl -X POST http://localhost:5000/api/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "eventId": "evt_987654321",
    "paymentId": "<PAYMENT_ID>",
    "bookingId": "<BOOKING_ID>",
    "status": "SUCCESS"
  }'
```

---

## 13. Authentication & Authorization

- **JWT Issuance**: Successful login generates an HMAC-SHA256 signed JSON Web Token containing `{ userId }` with a **24-hour expiration** (`{ expiresIn: '24h' }`).
- **Header Format**: Protected endpoints require the standard Bearer header:
  ```http
  Authorization: Bearer <token>
  ```
- **Identity Derivation**: Handlers extract `req.user.id` directly from the validated token. Clients cannot spoof patient identity.
- **Tenant Isolation**: When querying, cancelling, or paying for bookings, the controller verifies ownership:
  ```javascript
  if (booking.userId !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You are not authorized to access this booking',
    });
  }
  ```

---

## 14. Database Design

```
┌──────────────────────┐                     ┌──────────────────────┐
│   DiagnosticCentre   │                     │    DiagnosticTest    │
└──────────┬───────────┘                     └──────────┬───────────┘
           │ 1                                          │ 1
           │                                            │
           │ N                                          │ N
           ▼                                            ▼
┌───────────────────────────────────────────────────────────────────┐
│                            CentreTest                             │
│       (Junction: centreId + testId @@unique, custom price)        │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │ 1
                                  │
                                  │ N
┌──────────────┐         1:N      ▼          1:1     ┌──────────────┐
│     User     ├──────────────►Booking ─────────────►│   Payment    │
└──────────────┘                                     └──────────────┘

┌───────────────────────────────────────────────────────────────────┐
│                           PaymentEvent                            │
│         (Dedicated Webhook Idempotency Ledger: eventId @unique)   │
└───────────────────────────────────────────────────────────────────┘
```

### Relational Models & Schemas:

1. **`User`** (`users`):
   - `id`: UUID (Primary Key)
   - `name`: String
   - `email`: String (Unique)
   - `passwordHash`: String (bcrypt hash)
   - `createdAt`, `updatedAt`: DateTime
   - Relations: Has many `Booking` records.

2. **`DiagnosticCentre`** (`diagnostic_centres`):
   - `id`: UUID (Primary Key)
   - `name`: String
   - `location`: String
   - `createdAt`, `updatedAt`: DateTime
   - Relations: Has many `CentreTest` records.

3. **`DiagnosticTest`** (`diagnostic_tests`):
   - `id`: UUID (Primary Key)
   - `name`: String
   - `description`: String (Optional)
   - `createdAt`, `updatedAt`: DateTime
   - Relations: Has many `CentreTest` records.

4. **`CentreTest`** (`centre_tests`):
   - `id`: UUID (Primary Key)
   - `centreId`: UUID (Foreign Key -> `DiagnosticCentre`)
   - `testId`: UUID (Foreign Key -> `DiagnosticTest`)
   - `price`: Decimal(10, 2)
   - `createdAt`, `updatedAt`: DateTime
   - Constraints: Composite unique constraint `@@unique([centreId, testId])`, indexes on `centreId` and `testId`.
   - Relations: Belongs to `DiagnosticCentre` and `DiagnosticTest`; has many `Booking` records.

5. **`Booking`** (`bookings`):
   - `id`: UUID (Primary Key)
   - `userId`: UUID (Foreign Key -> `User`)
   - `centreTestId`: UUID (Foreign Key -> `CentreTest`)
   - `appointmentAt`: DateTime
   - `amount`: Decimal(10, 2) (Snapshot of price at booking time)
   - `status`: `BookingStatus` enum (`PENDING`, `CONFIRMED`, `FAILED`, `CANCELLED`, default `PENDING`)
   - `createdAt`, `updatedAt`: DateTime
   - Constraints: Indexes on `userId`, `centreTestId`, `status`, and `appointmentAt`.
   - Relations: Belongs to `User` and `CentreTest`; optional 1:1 relation with `Payment`.

6. **`Payment`** (`payments`):
   - `id`: UUID (Primary Key)
   - `bookingId`: UUID (Foreign Key -> `Booking`, Unique)
   - `providerPaymentId`: String (Unique)
   - `amount`: Decimal(10, 2)
   - `status`: `PaymentStatus` enum (`PENDING`, `SUCCESS`, `FAILED`, default `PENDING`)
   - `createdAt`, `updatedAt`: DateTime
   - Constraints: Index on `status`.
   - Relations: 1:1 relation with `Booking`.

7. **`PaymentEvent`** (`payment_events`):
   - `id`: UUID (Primary Key)
   - `eventId`: String (Unique, provider webhook event identifier)
   - `paymentId`: String (Index)
   - `status`: `PaymentStatus` enum (`PENDING`, `SUCCESS`, `FAILED`)
   - `createdAt`: DateTime
   - Purpose: Dedicated audit and idempotency ledger for asynchronous webhook callbacks.

### Key Architectural Rationale:

- **Why `CentreTest` exists**: Diagnostic tests do not carry a uniform price across all branches. A flagship hospital lab may charge ₹800 for a CBC while a satellite clinic charges ₹500. `CentreTest` serves as a many-to-many junction entity holding the branch-specific `price` and enforcing `@@unique([centreId, testId])`.
- **Why `Booking` stores `amount`**: Test prices can fluctuate or be updated by administrators over time. To ensure financial accuracy and customer protection, the price is captured at the moment of booking as an immutable snapshot.
- **Why `PaymentEvent` exists**: Payment gateway webhooks deliver events asynchronously and may retry multiple times. Storing each processed `eventId` in a dedicated ledger table decouples event tracking from the core `Payment` entity and prevents duplicate processing.

---

## 15. Payment and Booking Flows

The application distinguishes between two separate payment mechanisms:

### A. User-Initiated Simulated Payment (`POST /api/payments`)
This endpoint represents the application's direct simulated payment operation for patients completing checkout:
1. The authenticated patient calls `POST /api/payments` with `{ bookingId, result: "SUCCESS" | "FAILED" }`.
2. The server verifies user ownership of the booking (`booking.userId === req.user.id`).
3. The server ensures the booking is currently in `PENDING` status.
4. In an atomic transaction (`prisma.$transaction`):
   - A `Payment` record is created with a generated `providerPaymentId` and status (`SUCCESS` or `FAILED`).
   - The corresponding `Booking` status is updated to `CONFIRMED` (if SUCCESS) or `FAILED` (if FAILED).
5. The payment and updated booking details are returned to the caller.
6. *Note*: This direct payment operation is self-contained and does NOT require calling the webhook.

```
Patient initiates payment:
POST /api/payments { bookingId, result: "SUCCESS" }
              │
              ▼
   Verify ownership & PENDING status
              │
              ▼
   Prisma Transaction:
   ├── Create Payment (status: SUCCESS)
   └── Update Booking (status: CONFIRMED)
              │
              ▼
   Return 200 OK with Payment & Booking details
```

### B. Asynchronous Payment Provider Webhook (`POST /api/payments/webhook`)
This endpoint represents a simulated payment gateway (e.g., Razorpay, Stripe) sending an asynchronous event notification to the backend:
1. The payment provider calls `POST /api/payments/webhook` with `{ eventId, paymentId, bookingId, status }`.
2. This is a public provider-to-server endpoint (no user JWT required).
3. The server performs an idempotency check:
   - If `eventId` was already processed, it immediately responds with `200 OK` (`"Webhook already processed"`).
4. If new, an atomic transaction executes:
   - Verifies the `paymentId` exists and matches the provided `bookingId`.
   - Validates state transitions (e.g., rejects transitions for `CANCELLED` bookings, or moving from `CONFIRMED` to `FAILED`).
   - Inserts a new `PaymentEvent` record with the unique `eventId`.
   - Updates `Payment` status (`SUCCESS` or `FAILED`).
   - Updates `Booking` status (`CONFIRMED` or `FAILED`).
5. If two identical webhook events arrive concurrently, the database `UNIQUE` constraint on `PaymentEvent.eventId` raises a unique violation (`P2002`), which is caught and gracefully returned as `200 OK`.

### C. Booking Cancellation Flow
1. Patient calls `PATCH /api/bookings/:id/cancel`.
2. Server validates ownership and ensures booking status is `PENDING`.
3. Booking status transitions to `CANCELLED`. Confirmed or already cancelled bookings cannot be cancelled.

---

## 16. Webhook Idempotency Mechanism

Payment gateway webhooks are transmitted over distributed networks and can be retried multiple times due to network timeouts.

The idempotency defense mechanism works through:

1. **Application-Level Pre-Check**:
   Before starting transaction work, `handleWebhook` queries `prisma.paymentEvent.findUnique({ where: { eventId } })`. If an entry exists, the request immediately terminates with `HTTP 200 OK` (`"Webhook already processed"`).
2. **Database-Level Unique Constraint**:
   `PaymentEvent.eventId` is defined with `@unique` in PostgreSQL. In high-concurrency race conditions where two identical webhook requests bypass the application check simultaneously, PostgreSQL enforces uniqueness and rejects the duplicate insert with error code `P2002`. The controller catches `P2002` and returns `HTTP 200 OK` without throwing an unhandled server error.
3. **Atomic Transaction Scope (`prisma.$transaction`)**:
   Inserting the `PaymentEvent` audit record, updating `Payment.status`, and updating `Booking.status` execute within a single database transaction. This ensures all three changes succeed together or rollback completely if an error occurs.
4. **Terminal State Guards**:
   The webhook handler explicitly prevents invalid transitions:
   - Cannot process webhooks for `CANCELLED` bookings.
   - Cannot transition an already `CONFIRMED` booking to `FAILED`.
   - Cannot transition an already `FAILED` booking to `CONFIRMED`.

---

## 17. Error Handling

The application uses centralized error handling with consistent structured JSON responses across all routes:

- **Validation Errors (HTTP 400)**:
  ```json
  {
    "success": false,
    "message": "Validation failed",
    "errors": [{ "field": "email", "message": "Invalid email address" }]
  }
  ```
- **Authentication Errors (HTTP 401)**:
  ```json
  { "success": false, "message": "Authorization token required" }
  ```
- **Authorization Errors (HTTP 403)**:
  ```json
  { "success": false, "message": "You are not authorized to access this booking" }
  ```
- **Not Found Errors (HTTP 404)**:
  ```json
  { "success": false, "message": "Diagnostic centre not found" }
  ```
- **Conflict Errors (HTTP 409)**:
  ```json
  { "success": false, "message": "User with this email already exists" }
  ```
- **Internal Server Errors (HTTP 500)**:
  ```json
  { "success": false, "message": "Internal server error" }
  ```

---

## 18. Testing

### Run All Integration Tests
```bash
npm test
```

### Verified Test Suite Breakdown:
- **`tests/auth.test.js`** (11 tests):
  - User registration, duplicate email rejection, schema validations, and password hash concealment.
  - User login, invalid credentials handling, and JWT token issuance.
  - Protected profile endpoint (`/api/auth/me`) with valid and invalid tokens.
- **`tests/centres.test.js`** (14 tests):
  - Centre creation, validation, public listing, and single centre lookup.
  - Test catalog creation, missing field validation, and public retrieval.
  - Dynamic centre-test association, duplicate association rejection, and non-positive price checks.
- **`tests/bookings.test.js`** (10 tests):
  - Server-side price snapshot and user identity derivation.
  - Rejection of past appointment dates and non-existent centre-tests.
  - Strict tenant isolation: User B cannot view or cancel User A's booking (HTTP 403).
  - Patient self-service cancellation and terminal state validation.
- **`tests/payments.test.js`** (7 tests):
  - Simulated payment execution (`SUCCESS` -> `CONFIRMED`, `FAILED` -> `FAILED`).
  - Authorization check: User B cannot pay for User A's booking (HTTP 403).
  - State guards: Cannot pay for cancelled or already confirmed bookings.
- **`tests/webhook.test.js`** (12 tests):
  - Public webhook execution without JWT authentication.
  - Idempotent deduplication: Repeated identical `eventId` returns HTTP 200 without creating duplicates.
  - State guards: Preventing invalid transitions (`CONFIRMED -> FAILED`, `FAILED -> CONFIRMED`).
  - Invalid request payload validations.

**Total**: **54 tests passing across 5 test suites (100% pass rate)**.

---

## 19. Assumptions

1. **Simulated Payment Gateway**: Payments and webhooks simulate real-world gateway mechanics (like Stripe or Razorpay) without requiring external gateway developer credentials.
2. **Webhook Signature Verification**: Simulated webhooks bypass HMAC-SHA256 signature verification headers because no real gateway secret is involved in this assignment.
3. **No Partial Refunds**: Payments transition directly to `SUCCESS` or `FAILED`; refund and chargeback workflows are out of scope for this assignment.
4. **Ownership Boundary**: Users are only permitted to inspect, cancel, or pay for their own bookings.
5. **No Slot Lockouts**: Multiple appointments can be scheduled in the same time window unless center capacity logic is added.

---

## 20. Future Improvements

The following improvements would be considered for production deployment:
- **Redis Caching**: Cache frequently read diagnostic test catalogs to minimize database reads.
- **Background Jobs**: Integrate BullMQ for asynchronous notification delivery (SMS/email booking confirmations).
- **Gateway Signature Verification**: Implement cryptographic HMAC signature verification headers (e.g., `Stripe-Signature` or `X-Razorpay-Signature`) using shared gateway secrets.
- **Rate Limiting**: Protect public authentication and webhook endpoints with sliding-window rate limiters.
- **Containerization**: Provide a `docker-compose.yml` for unified local setup.
- **Pagination & Filtering**: Add cursor-based pagination and search filters to centre and test endpoints.
