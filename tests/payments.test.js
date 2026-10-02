const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

describe('Payment Endpoints (Phase 6 & 8 Edge Cases)', () => {
  const timestamp = Date.now();
  let userAToken = '';
  let userBToken = '';
  let userAId = '';
  let userBId = '';
  let centreId = '';
  let testId = '';
  let centreTestId = '';
  const testPrice = 1200.0;

  beforeAll(async () => {
    // Setup User A
    const userAEmail = `pay_usera_${timestamp}@example.com`;
    const signupA = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Pay User A', email: userAEmail, password: 'Password123!' });
    userAId = signupA.body.user.id;

    const loginA = await request(app)
      .post('/api/auth/login')
      .send({ email: userAEmail, password: 'Password123!' });
    userAToken = loginA.body.token;

    // Setup User B
    const userBEmail = `pay_userb_${timestamp}@example.com`;
    const signupB = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Pay User B', email: userBEmail, password: 'Password123!' });
    userBId = signupB.body.user.id;

    const loginB = await request(app)
      .post('/api/auth/login')
      .send({ email: userBEmail, password: 'Password123!' });
    userBToken = loginB.body.token;

    // Setup Centre and Test
    const centreRes = await request(app)
      .post('/api/centres')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: `Payment Diagnostic Hub ${timestamp}`, location: 'Bengaluru' });
    centreId = centreRes.body.centre.id;

    const testRes = await request(app)
      .post('/api/tests')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ name: `MRI Brain ${timestamp}` });
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

  // Helper to create a booking for User A
  async function createBookingA() {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ centreTestId, appointmentAt: futureDate });
    return res.body.booking;
  }

  describe('POST /api/payments (Simulated Payment Execution)', () => {
    it('should process SUCCESS payment: sets payment to SUCCESS and booking to CONFIRMED', async () => {
      const booking = await createBookingA();

      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          bookingId: booking.id,
          result: 'SUCCESS',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/successful/i);

      // Verify payment response data
      expect(res.body.payment).toBeDefined();
      expect(res.body.payment.status).toBe('SUCCESS');
      expect(res.body.payment.amount).toBe(testPrice);
      expect(res.body.payment.providerPaymentId).toBeDefined();

      // Verify booking status in response
      expect(res.body.booking.status).toBe('CONFIRMED');

      // Verify database state directly
      const dbPayment = await prisma.payment.findUnique({ where: { bookingId: booking.id } });
      expect(dbPayment.status).toBe('SUCCESS');
      expect(Number(dbPayment.amount)).toBe(testPrice);

      const dbBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
      expect(dbBooking.status).toBe('CONFIRMED');
    });

    it('should process FAILED payment: sets payment to FAILED and booking to FAILED', async () => {
      const booking = await createBookingA();

      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          bookingId: booking.id,
          result: 'FAILED',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.payment.status).toBe('FAILED');
      expect(res.body.booking.status).toBe('FAILED');

      // Verify database state
      const dbBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
      expect(dbBooking.status).toBe('FAILED');
    });

    it("User B CANNOT pay for User A's booking (HTTP 403 Forbidden)", async () => {
      const booking = await createBookingA();

      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          bookingId: booking.id,
          result: 'SUCCESS',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it('should reject payment for a CANCELLED booking (HTTP 400 Bad Request)', async () => {
      const booking = await createBookingA();

      // Cancel the booking first
      await request(app)
        .patch(`/api/bookings/${booking.id}/cancel`)
        .set('Authorization', `Bearer ${userAToken}`);

      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          bookingId: booking.id,
          result: 'SUCCESS',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/only pending bookings can be paid/i);
    });

    it('should reject payment for an already CONFIRMED booking (HTTP 400 Bad Request)', async () => {
      const booking = await createBookingA();

      // Pay once to confirm
      await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ bookingId: booking.id, result: 'SUCCESS' });

      // Attempt repeated payment
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ bookingId: booking.id, result: 'SUCCESS' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/only pending bookings can be paid/i);
    });

    it('should reject payment with invalid result value (HTTP 400 Bad Request)', async () => {
      const booking = await createBookingA();

      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          bookingId: booking.id,
          result: 'PENDING_OR_MAYBE',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject payment for non-existent booking ID (HTTP 404 Not Found)', async () => {
      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          bookingId: '00000000-0000-0000-0000-000000000000',
          result: 'SUCCESS',
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/booking not found/i);
    });
  });
});
