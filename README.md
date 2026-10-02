# EVE Healthcare — Backend Engineering

Backend service for diagnostic test bookings and simulated payments for the **EVE Healthcare SDE Intern Assignment**.

## Tech Stack
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (Neon Cloud)
- **ORM**: Prisma ORM
- **Language**: JavaScript (ES6+ / CommonJS)

---

## Project Structure
```
eve-healthcare/
├── docs/
│   ├── PHASE_1_README.md      # Phase 1 Documentation (Foundation & Architecture)
│   └── PHASE_2_README.md      # Phase 2 Documentation (Database & Data Models)
├── prisma/
│   ├── migrations/            # SQL migration history
│   └── schema.prisma          # Prisma schema definition
├── src/
│   ├── config/
│   │   └── env.js             # Centralized environment variables
│   ├── controllers/
│   │   └── health.controller.js
│   ├── middlewares/
│   │   └── error.middleware.js # Centralized 404 & 500 error handlers
│   ├── routes/
│   │   └── health.routes.js   # Health check routing
│   ├── services/              # Business logic services (upcoming phases)
│   ├── utils/                 # Helper utilities (upcoming phases)
│   ├── app.js                 # Express application configuration
│   └── server.js              # Server lifecycle & port binding
├── .env                       # Local environment variables (not committed)
├── .env.example               # Environment variables template
├── .gitignore
├── package.json
└── README.md
```


---

## Getting Started

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/theadarsh1m/eve-healthcare.git
cd eve-healthcare
npm install
```

### 2. Configure Environment Variables
Create `.env` based on `.env.example`:
```bash
cp .env.example .env
```
Ensure `DATABASE_URL` is set to your PostgreSQL connection string.

### 3. Generate Prisma Client & Run Migrations
```bash
npm run prisma:generate
npx prisma migrate dev
```

### 4. Start the Application
- **Development Mode** (with Nodemon hot-reload):
  ```bash
  npm run dev
  ```
- **Production Mode**:
  ```bash
  npm start
  ```

### 5. Verify Health Endpoint
```bash
curl http://localhost:5000/api/health
```

Response:
```json
{
  "success": true,
  "message": "EVE Healthcare API is running"
}
```
