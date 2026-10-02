# EVE Healthcare Diagnostic Booking Backend

## 1. Project Overview

The **EVE Healthcare Diagnostic Booking Backend** is an interview-ready, production-grade REST API service built for diagnostic test bookings, dynamic pricing management, simulated payment processing, and idempotent payment webhooks.

The service allows patients to authenticate securely, discover diagnostic centres and test catalogs, book medical appointments with immutable price snapshots, simulate payments, and process asynchronous provider webhooks with guaranteed idempotency and state protection.

---

## 2. Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js (v5)
- **Language**: JavaScript (ES6+ / CommonJS)
- **Database**: PostgreSQL (Neon Cloud Serverless)
- **ORM**: Prisma ORM (v6.19.3)
- **Authentication**: JSON Web Tokens (JWT) + Bcryptjs
- **Validation**: Zod (v4)
- **Testing**: Jest + Supertest

---

## 3. Features

1. **Authentication & Authorization**:
   - Secure customer registration and login with bcrypt password hashing (10 salt rounds).
   - Stateless JWT authentication with standard 24-hour expiration.
   - Zero sensitive credential leakage (passwords and hashes are never returned by any endpoint).
   - Strict multi-tenant data ownership verification (User A cannot view, modify, or pay for User B's bookings).

2. **Diagnostic Centres & Tests**:
   - Diagnostic branch management with physical location details.
   - Master medical test catalog with descriptions.
   - Dynamic many-to-many junction entity (`CentreTest`) with centre-specific custom test pricing.

3. **Diagnostic Test Booking System**:
   - User identity derived strictly from validated JWT (no client spoofing).
   - Historical pricing snapshot: Captures test price at appointment booking time to protect against future price updates.
   - Future appointment date validation (past timestamps rejected).
   - Patient self-service cancellation for pending reservations.

4. **Simulated Payment Processing**:
   - Deterministic payment simulation supporting both `SUCCESS` and `FAILED` outcomes.
   - Atomic database transactions synchronizing payment creation and booking status updates.
   - State transition enforcement (only `PENDING` bookings can be paid).

5. **Payment Webhook & Dual-Layer Idempotency**:
   - Public provider-to-server webhook endpoint (`POST /api/payments/webhook`) operating without user JWT.
   - Dual-layer idempotency defense: Rapid application-level check + PostgreSQL database `UNIQUE` constraint on `eventId`.
   - Replay protection: Receiving duplicate webhooks returns HTTP 200 without creating duplicate records or mutating database states.
   - Terminal state protection: Prevents invalid transitions (e.g., `CONFIRMED -> FAILED` or `CANCELLED -> CONFIRMED`).

6. **Comprehensive Integration Testing**:
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
├── package.json
└── README.md
```

---

## 5. Prerequisites

Before running the application, ensure the following are installed:
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: Accessible PostgreSQL database instance (local or cloud provider such as Neon)

---

## 6. Installation

```bash
# 1. Clone the repository
git clone https://github.com/theadarsh1m/eve-healthcare.git
cd eve-healthcare

# 2. Install project dependencies
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
| `DATABASE_URL` | PostgreSQL connection string (pooled) | `postgresql://user:pass@ep-host.neon.tech/db?sslmode=require` |
| `DIRECT_URL` | Direct PostgreSQL connection string (for migrations) | `postgresql://user:pass@ep-host.neon.tech/db?sslmode=require` |
| `JWT_SECRET` | Secret key used to sign and verify JWTs | `your_super_secret_jwt_key` |

> **Security Note**: Never commit your `.env` file to version control. It is explicitly listed in `.gitignore`.

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

## 10. API Endpoints

### Authentication
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/signup` | Public | Register a new user |
| `POST` | `/api/auth/login` | Public | Authenticate user & obtain JWT |
| `GET` | `/api/auth/me` | Protected | Get current authenticated user profile |

### Centres
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/centres` | Protected | Create a new diagnostic centre |
| `GET` | `/api/centres` | Public | List all diagnostic centres |
| `GET` | `/api/centres/:id` | Public | Get single centre with assigned tests & prices |

### Tests
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/tests` | Protected | Create a diagnostic test |
| `GET` | `/api/tests` | Public | List all diagnostic tests |
| `GET` | `/api/tests/:id` | Public | Get single diagnostic test by ID |

### Centre Tests (Pricing Association)
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/centres/:id/tests` | Protected | Link test to centre with custom dynamic price |

### Bookings
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/bookings` | Protected | Book a test (derives price snapshot & user) |
| `GET` | `/api/bookings` | Protected | List all bookings for authenticated user |
| `GET` | `/api/bookings/:id` | Protected | Get single booking details (ownership enforced) |
| `PATCH` | `/api/bookings/:id/cancel` | Protected | Cancel a pending booking |

### Payments
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/payments` | Protected | Execute simulated payment (`SUCCESS` or `FAILED`) |

### Webhook
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/payments/webhook` | Public | Provider webhook with dual-layer idempotency |

---

## Swagger / API Documentation

The API provides interactive **Swagger / OpenAPI 3.0** documentation.

When the server is running, open:
```
http://localhost:<PORT>/api-docs
```
*(Default: [http://localhost:5000/api-docs](http://localhost:5000/api-docs))*

From the Swagger UI interface, you can:
- **Inspect Endpoints**: View all 17 public and protected API endpoints with descriptions and route paths.
- **Inspect Schemas**: See request body schemas, required parameters, and structured JSON responses.
- **Authorize using JWT**: Click the green **Authorize 🔓** button, paste the token from `POST /api/auth/login`, and test protected endpoints directly.
- **Execute API Requests**: Trigger live requests directly from your browser.
- **Raw OpenAPI Specification**: Available in JSON format at `http://localhost:<PORT>/api-docs.json`.

---

## 11. Example API Requests

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

### 7. Process Simulated Payment
```bash
curl -X POST http://localhost:5000/api/payments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{
    "bookingId": "<BOOKING_ID>",
    "result": "SUCCESS"
  }'
```

### 8. Provider Payment Webhook
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

## 12. Authentication & Authorization

- **JWT Issuance**: Successful login generates an HMAC-SHA256 signed JSON Web Token containing `{ userId }` with a 24-hour expiration.
- **Header Format**: Protected endpoints require the standard header:
  ```http
  Authorization: Bearer <token>
  ```
- **Identity Derivation**: Handlers extract `req.user.id` directly from the validated token.
- **Tenant Isolation**: When querying, cancelling, or paying for bookings, the controller enforces:
  ```javascript
  if (booking.userId !== req.user.id) {
    return res.status(403).json({
      success: false,
      message: 'You are not authorized to access this booking',
    });
  }
  ```

---

## 13. Database Design

```
┌──────────────┐         1:N         ┌───────────────────┐
│     User     ├────────────────────►│      Booking      │
└──────────────┘                     └─────────┬─────────┘
                                               │ 1:1
┌──────────────────────┐                       ▼
│   DiagnosticCentre   │             ┌───────────────────┐
└──────────┬───────────┘             │      Payment      │
           │ 1:N                     └───────────────────┘
           ▼
┌──────────────────────┐             ┌───────────────────┐
│      CentreTest      │◄────────────┤   PaymentEvent    │
└──────────▲───────────┘    1:N      └───────────────────┘
           │ 1:N
┌──────────┴───────────┐
│    DiagnosticTest    │
└──────────────────────┘
```

### Key Relational Models:
1. `User`: Customer profile and authentication credentials.
2. `DiagnosticCentre`: Medical diagnostic lab branch locations.
3. `DiagnosticTest`: Master catalog of medical diagnostic tests.
4. `CentreTest`: Many-to-many junction entity linking centres and tests.
5. `Booking`: Customer appointment reservation entity.
6. `Payment`: 1:1 transaction tracking record linked to bookings.
7. `PaymentEvent`: Idempotency ledger storing processed webhook events.

### Critical Design Decisions:

#### Why `CentreTest` exists
Diagnostic tests do not have a uniform price across all locations. A central flagship lab may charge ₹800 for an MRI or CBC, while a suburban branch charges ₹600. `CentreTest` acts as a junction model storing the centre-specific `price` and enforcing a composite unique constraint `@@unique([centreId, testId])`.

#### Why `Booking` stores `amount`
Diagnostic centres frequently update their pricing over time. If a patient books a test for ₹500 today, and the centre raises the price to ₹750 next week, the patient must still be billed ₹500. Storing `amount` directly on `Booking` creates an **immutable financial snapshot**.

#### Why `PaymentEvent` exists
The `PaymentEvent` table acts as a dedicated audit and idempotency ledger. By recording every processed webhook with a unique `eventId` (`@unique`), the system decouples event tracking from payment status, allowing efficient deduplication without mutating existing records.

---

## 14. Booking Flow

```
User selects centre & test
           │
           ▼
   POST /api/bookings
   - Validates appointment is in the future
   - Fetches active price from CentreTest
   - Creates booking with status: PENDING
           │
           ▼
  POST /api/payments (or Webhook)
           │
   ┌───────┴───────┐
   ▼               ▼
SUCCESS          FAILED
   │               │
   ▼               ▼
Booking:        Booking:
CONFIRMED        FAILED

[Cancellation Path]:
If booking is PENDING:
PATCH /api/bookings/:id/cancel ──► Booking: CANCELLED
```

---

## 15. Webhook Idempotency

Webhooks from payment gateways are delivered over unreliable networks and are frequently retried.

### Dual-Layer Idempotency Architecture:
1. **Application-Level Check**:
   Before initiating a database transaction, `handleWebhook` queries `prisma.paymentEvent.findUnique({ where: { eventId } })`. If found, it immediately responds with `HTTP 200 OK` (`"Webhook already processed"`), avoiding database locks.
2. **Database Unique Constraint**:
   `PaymentEvent.eventId` is backed by a PostgreSQL `UNIQUE` index. If two identical requests hit the server concurrently within milliseconds, PostgreSQL rejects the second insertion with code `P2002`. The controller catches this and returns `200 OK`.
3. **Atomic Transaction Scope (`prisma.$transaction`)**:
   Inserting `PaymentEvent`, updating `Payment.status`, and updating `Booking.status` are executed within a single ACID transaction, preventing partial updates.

---

## 16. Error Handling

The application uses centralized error handling with consistent structured JSON responses:

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

---

## 17. Testing

### Run All Integration Tests
```bash
npm test
```

### Test Suite Summary:
- **`tests/auth.test.js`**: 11 tests covering user lifecycle, authentication, and password privacy.
- **`tests/centres.test.js`**: 14 tests covering centres, tests, pricing associations, and validation.
- **`tests/bookings.test.js`**: 10 tests covering booking derivation, dates, and ownership checks.
- **`tests/payments.test.js`**: 7 tests covering simulated payments, amounts, and state guards.
- **`tests/webhook.test.js`**: 12 tests covering webhooks, idempotency, duplicate events, and transition rules.
- **Total**: **54 tests passing (100% pass rate)**.

---

## 18. Assumptions

1. **Simulated Payment Gateway**: Payments and webhooks simulate real-world gateway mechanics (like Stripe or Razorpay) without requiring external gateway developer credentials.
2. **Webhook Signature Verification**: Simulated webhooks bypass HMAC-SHA256 signature verification because no real gateway secret is involved.
3. **No Partial Refunds**: Payments transition directly to `SUCCESS` or `FAILED`; refund workflows are out of scope for this assignment.
4. **Ownership Boundary**: Users are only permitted to inspect, cancel, or pay for their own bookings.
5. **No Slot Lockouts**: Multiple appointments can be scheduled in the same time window unless center capacity logic is added.

---

## 19. Future Improvements

The following improvements would be considered for production deployment:
- **Redis Caching & Distributed Locks**: Cache frequently read diagnostic catalogs and use Redlock for distributed reservation locking.
- **Background Jobs**: Integrate BullMQ / Celery for asynchronous notification delivery (SMS, email confirmation).
- **Webhook HMAC Verification**: Verify gateway signature headers (`Stripe-Signature` or `X-Razorpay-Signature`) against shared secrets.
- **Rate Limiting**: Protect authentication and payment endpoints with sliding-window rate limiters.
- **Docker & Containerization**: Provide a `docker-compose.yml` bundling Node.js and PostgreSQL.
- **Pagination & Filtering**: Add cursor-based pagination and search filters to centre and test endpoints.
