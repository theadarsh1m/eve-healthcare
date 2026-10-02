const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

describe('Booking Endpoints & Authorization (Phase 5 & 8 Edge Cases)', () => {
  const timestamp = Date.now();
  let userAToken = '';
  let userBToken = '';
  let userAId = '';
  let userBId = '';
  let centreId = '';
  let testId = '';
  let centreTestId = '';
  const testPrice = 750.0;

  beforeAll(async () => {
    // 1. Create User A
    const userAEmail = `user_a_${timestamp}@example.com`;
    const signupA = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'User A', email: userAEmail, password: 'Password123!' });
    userAId = signupA.body.user.id;

    const loginA = await request(app)
      .post('/api/auth/login')
      .send({ email: userAEmail, password: 'Password123!' });
    userAToken = loginA.body.token;

    // 2. Create User B
    const userBEmail = `user_b_${timestamp}@example.com`;
    const signupB = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'User B', email: userBEmail, password: 'Password123!' });
    userBId = signupB.body.user.id;

    const loginB = await request(app)
      .post('/api/auth/login')
      .send({ email: userBEmail, password: 'Password123!' });
    userBToken = loginB.body.token;

    // 3. Create Diagnostic Centre, Test, and Link
    const centreRes = await request(app)
      .post('/api/centres')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: `Booking Hub ${timestamp}`, location: 'Gurugram' });
    centreId = centreRes.body.centre.id;

    const testRes = await request(app)
      .post('/api/tests')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: `HbA1c Test ${timestamp}` });
    testId = testRes.body.test.id;

    const linkRes = await request(app)
      .post(`/api/centres/${centreId}/tests`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ testId, price: testPrice });
    centreTestId = linkRes.body.centreTest.id;
  });

  afterAll(async () => {
    // Cleanup payments, bookings, junction, centres, tests, and users
    await prisma.payment.deleteMany({
      where: { booking: { userId: { in: [userAId, userBId] } } },
    });
    await prisma.booking.deleteMany({
      where: { userId: { in: [userAId, userBId] } },
    });
    if (centreTestId) {
      await prisma.centreTest.deleteMany({ where: { id: centreTestId } });
    }
    if (centreId) {
      await prisma.diagnosticCentre.deleteMany({ where: { id: centreId } });
    }
    if (testId) {
      await prisma.diagnosticTest.deleteMany({ where: { id: testId } });
    }
    await prisma.user.deleteMany({
      where: { id: { in: [userAId, userBId] } },
    });
    await prisma.$disconnect();
  });

  describe('POST /api/bookings (Creation & Server-side derivation)', () => {
    it('should create booking where amount and user are derived by server, not client', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      // Intentionally NOT sending userId, amount, or status from client
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          centreTestId,
          appointmentAt: futureDate,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.booking).toBeDefined();

      const booking = res.body.booking;
      expect(booking.amount).toBe(testPrice); // Verified server derived from CentreTest.price
      expect(booking.status).toBe('PENDING'); // Verified initial status strictly PENDING

      // Check DB directly to verify userId was extracted from JWT
      const dbBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
      expect(dbBooking.userId).toBe(userAId);
    });

    it('should reject appointment date in the past (HTTP 400)', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          centreTestId,
          appointmentAt: pastDate,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/future/i);
    });

    it('should reject non-existent centreTestId (HTTP 404)', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          centreTestId: '00000000-0000-0000-0000-000000000000',
          appointmentAt: futureDate,
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should reject booking without authentication (HTTP 401)', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/bookings')
        .send({
          centreTestId,
          appointmentAt: futureDate,
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Authorization & Ownership Boundary (User A vs User B)', () => {
    let bookingAId = '';

    beforeEach(async () => {
      const futureDate = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ centreTestId, appointmentAt: futureDate });
      bookingAId = res.body.booking.id;
    });

    it("User A can view their own booking (HTTP 200)", async () => {
      const res = await request(app)
        .get(`/api/bookings/${bookingAId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.booking.id).toBe(bookingAId);
    });

    it("User B CANNOT view User A's booking (HTTP 403 Forbidden)", async () => {
      const res = await request(app)
        .get(`/api/bookings/${bookingAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it("User B CANNOT cancel User A's booking (HTTP 403 Forbidden)", async () => {
      const res = await request(app)
        .patch(`/api/bookings/${bookingAId}/cancel`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it("User A can cancel their own PENDING booking (HTTP 200)", async () => {
      const res = await request(app)
        .patch(`/api/bookings/${bookingAId}/cancel`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.booking.status).toBe('CANCELLED');
    });

    it("Cannot cancel an already CANCELLED booking (HTTP 400 Bad Request)", async () => {
      // First cancel
      await request(app)
        .patch(`/api/bookings/${bookingAId}/cancel`)
        .set('Authorization', `Bearer ${userAToken}`);

      // Attempt second cancel
      const res = await request(app)
        .patch(`/api/bookings/${bookingAId}/cancel`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/only pending bookings can be cancelled/i);
    });

    it("Cannot cancel a CONFIRMED booking (HTTP 400 Bad Request)", async () => {
      // Manually set status to CONFIRMED
      await prisma.booking.update({
        where: { id: bookingAId },
        data: { status: 'CONFIRMED' },
      });

      const res = await request(app)
        .patch(`/api/bookings/${bookingAId}/cancel`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/only pending bookings can be cancelled/i);
    });
  });
});
