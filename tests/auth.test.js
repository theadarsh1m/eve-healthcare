const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

describe('Auth Endpoints (Phase 3 & 8 Edge Cases)', () => {
  const timestamp = Date.now();
  const testUser = {
    name: 'Auth Test User',
    email: `auth_test_${timestamp}@example.com`,
    password: 'Password123!',
  };
  let authToken = '';

  afterAll(async () => {
    // Cleanup test user
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: `auth_test_${timestamp}`,
        },
      },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/auth/signup', () => {
    it('should register a new user successfully and not expose passwordHash', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.name).toBe(testUser.name);
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.user.password).toBeUndefined();
    });

    it('should reject signup with duplicate email (HTTP 409)', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send(testUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should reject signup with missing required fields (HTTP 400)', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'missing_fields@example.com',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
    });

    it('should reject signup with invalid email format (HTTP 400)', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Invalid Email',
          email: 'not-an-email',
          password: 'Password123!',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject signup with short password (HTTP 400)', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Short Password',
          email: `short_pw_${timestamp}@example.com`,
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate user and return valid JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
      expect(typeof res.body.token).toBe('string');
      authToken = res.body.token;
    });

    it('should reject login with incorrect password (HTTP 401)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('should reject login for non-existent user (HTTP 401)', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: `non_existent_${timestamp}@example.com`,
          password: 'Password123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });
  });

  describe('GET /api/auth/me (Protected)', () => {
    it('should return profile for valid JWT token without exposing passwordHash', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(testUser.email);
      expect(res.body.user.name).toBe(testUser.name);
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('should reject request missing Authorization header (HTTP 401)', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/token required/i);
    });

    it('should reject request with malformed or invalid JWT token (HTTP 401)', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.value');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid or expired token/i);
    });
  });
});
