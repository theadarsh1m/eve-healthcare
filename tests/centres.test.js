const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

describe('Centres & Tests Endpoints (Phase 4 & 8 Edge Cases)', () => {
  const timestamp = Date.now();
  let authToken = '';
  let centreId = '';
  let testId = '';

  beforeAll(async () => {
    // Create admin/test user and authenticate
    const email = `centres_tester_${timestamp}@example.com`;
    await request(app)
      .post('/api/auth/signup')
      .send({
        name: 'Centre Tester',
        email,
        password: 'Password123!',
      });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email,
        password: 'Password123!',
      });

    authToken = loginRes.body.token;
  });

  afterAll(async () => {
    // Cleanup junction, centres, tests, and user
    if (centreId && testId) {
      await prisma.centreTest.deleteMany({
        where: { centreId, testId },
      });
    }
    if (centreId) {
      await prisma.diagnosticCentre.deleteMany({
        where: { id: centreId },
      });
    }
    if (testId) {
      await prisma.diagnosticTest.deleteMany({
        where: { id: testId },
      });
    }
    await prisma.user.deleteMany({
      where: {
        email: { contains: `centres_tester_${timestamp}` },
      },
    });
    await prisma.$disconnect();
  });

  describe('Diagnostic Centres', () => {
    it('should create a diagnostic centre with valid token (HTTP 201)', async () => {
      const res = await request(app)
        .post('/api/centres')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `City Diagnostic Hub ${timestamp}`,
          location: 'Connaught Place, New Delhi',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.centre).toBeDefined();
      expect(res.body.centre.name).toBe(`City Diagnostic Hub ${timestamp}`);
      centreId = res.body.centre.id;
    });

    it('should reject centre creation without authentication (HTTP 401)', async () => {
      const res = await request(app)
        .post('/api/centres')
        .send({
          name: 'Unauthorized Centre',
          location: 'Delhi',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject centre creation with missing name or location (HTTP 400)', async () => {
      const res = await request(app)
        .post('/api/centres')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          location: 'Delhi',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should retrieve list of all diagnostic centres publicly (HTTP 200)', async () => {
      const res = await request(app).get('/api/centres');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.centres)).toBe(true);
      expect(res.body.centres.length).toBeGreaterThan(0);
    });

    it('should retrieve single centre by ID publicly (HTTP 200)', async () => {
      const res = await request(app).get(`/api/centres/${centreId}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.centre.id).toBe(centreId);
    });

    it('should return 404 for non-existent centre ID', async () => {
      const res = await request(app).get('/api/centres/00000000-0000-0000-0000-000000000000');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Diagnostic Tests', () => {
    it('should create a diagnostic test with valid token (HTTP 201)', async () => {
      const res = await request(app)
        .post('/api/tests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: `Thyroid Panel ${timestamp}`,
          description: 'Measures T3, T4, and TSH levels',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.test).toBeDefined();
      expect(res.body.test.name).toBe(`Thyroid Panel ${timestamp}`);
      testId = res.body.test.id;
    });

    it('should reject test creation with missing name (HTTP 400)', async () => {
      const res = await request(app)
        .post('/api/tests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'No test name provided',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should retrieve list of all tests publicly (HTTP 200)', async () => {
      const res = await request(app).get('/api/tests');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.tests)).toBe(true);
      expect(res.body.tests.length).toBeGreaterThan(0);
    });
  });

  describe('Centre-Test Association & Pricing', () => {
    it('should link test to centre with valid price (HTTP 201)', async () => {
      const res = await request(app)
        .post(`/api/centres/${centreId}/tests`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          testId,
          price: 650.0,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.centreTest).toBeDefined();
      expect(res.body.centreTest.price).toBe(650.0);
    });

    it('should reject duplicate centre-test association (HTTP 409)', async () => {
      const res = await request(app)
        .post(`/api/centres/${centreId}/tests`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          testId,
          price: 700.0,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already associated/i);
    });

    it('should reject non-positive price (HTTP 400)', async () => {
      const dummyTestRes = await request(app)
        .post('/api/tests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: `Negative Price Test ${timestamp}` });

      const res = await request(app)
        .post(`/api/centres/${centreId}/tests`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          testId: dummyTestRes.body.test.id,
          price: -50,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);

      // Clean up dummy test
      await prisma.diagnosticTest.delete({ where: { id: dummyTestRes.body.test.id } });
    });

    it('should reject linking to non-existent centre (HTTP 404)', async () => {
      const res = await request(app)
        .post('/api/centres/00000000-0000-0000-0000-000000000000/tests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          testId,
          price: 500,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should reject linking non-existent test to centre (HTTP 404)', async () => {
      const res = await request(app)
        .post(`/api/centres/${centreId}/tests`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          testId: '00000000-0000-0000-0000-000000000000',
          price: 500,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
