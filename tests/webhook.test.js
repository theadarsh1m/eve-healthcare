const request = require('supertest');
const app = require('../src/app');
const prisma = require('../src/config/prisma');

describe('Payment Webhook & Idempotency (Phase 7 & 8 Edge Cases)', () => {
  const timestamp = Date.now();
  let userToken = '';
  let userId = '';
  let centreId = '';
  let testId = '';
  let centreTestId = '';
  const testPrice = 900.0;

  beforeAll(async () => {
    // 1. Create and authenticate a test user
    const userEmail = `webhook_user_${timestamp}@example.com`;
    const signup = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Webhook User', email: userEmail, password: 'Password123!' });
    userId = signup.body.user.id;

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: userEmail, password: 'Password123!' });
    userToken = login.body.token;

    // 2. Setup Centre and Test
    const centreRes = await request(app)
      .post('/api/centres')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: `Webhook Centre ${timestamp}`, location: 'Mumbai' });
    centreId = centreRes.body.centre.id;

    const testRes = await request(app)
      .post('/api/tests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: `Lipid Profile ${timestamp}` });
    testId = testRes.body.test.id;

    const linkRes = await request(app)
      .post(`/api/centres/${centreId}/tests`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ testId, price: testPrice });
    centreTestId = linkRes.body.centreTest.id;
  });

  afterAll(async () => {
    // Cleanup events, payments, bookings, centres, tests, and user
    await prisma.paymentEvent.deleteMany({
      where: { eventId: { contains: `evt_` } },
    });
    await prisma.payment.deleteMany({
      where: { booking: { userId } },
    });
    await prisma.booking.deleteMany({
      where: { userId },
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
    await prisma.user.deleteMany({ where: { id: userId } });
    await prisma.$disconnect();
  });

  // Helper to create a fresh booking and initial payment
  async function createBookingAndPayment(result = 'SUCCESS') {
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const bRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ centreTestId, appointmentAt: futureDate });
    const booking = bRes.body.booking;

    const pRes = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ bookingId: booking.id, result });
    const payment = pRes.body.payment;

    return { booking, payment };
  }

  describe('A. Successful Webhook Processing', () => {
    it('should process new SUCCESS webhook, update payment to SUCCESS, booking to CONFIRMED, and record PaymentEvent', async () => {
      const { booking, payment } = await createBookingAndPayment('SUCCESS');
      const eventId = `evt_test_001_${Date.now()}`;

      const res = await request(app)
        .post('/api/payments/webhook')
        .send({
          eventId,
          paymentId: payment.id,
          bookingId: booking.id,
          status: 'SUCCESS',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Webhook processed successfully');

      // Verify Payment record in DB
      const dbPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
      expect(dbPayment.status).toBe('SUCCESS');

      // Verify Booking record in DB
      const dbBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
      expect(dbBooking.status).toBe('CONFIRMED');

      // Verify PaymentEvent in DB
      const dbEvent = await prisma.paymentEvent.findUnique({ where: { eventId } });
      expect(dbEvent).toBeDefined();
      expect(dbEvent.paymentId).toBe(payment.id);
      expect(dbEvent.status).toBe('SUCCESS');
    });

    it('should process webhook when paymentId is providerPaymentId', async () => {
      const { booking, payment } = await createBookingAndPayment('SUCCESS');
      const eventId = `evt_test_provider_${Date.now()}`;

      const res = await request(app)
        .post('/api/payments/webhook')
        .send({
          eventId,
          paymentId: payment.providerPaymentId,
          bookingId: booking.id,
          status: 'SUCCESS',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Webhook processed successfully');
    });
  });

  describe('B. Failed Webhook Processing', () => {
    it('should process new FAILED webhook, update payment to FAILED, booking to FAILED, and record PaymentEvent', async () => {
      const { booking, payment } = await createBookingAndPayment('FAILED');
      const eventId = `evt_test_failed_${Date.now()}`;

      const res = await request(app)
        .post('/api/payments/webhook')
        .send({
          eventId,
          paymentId: payment.id,
          bookingId: booking.id,
          status: 'FAILED',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Webhook processed successfully');

      const dbPayment = await prisma.payment.findUnique({ where: { id: payment.id } });
      expect(dbPayment.status).toBe('FAILED');

      const dbBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
      expect(dbBooking.status).toBe('FAILED');
    });
  });

  describe('C. Duplicate Webhook (Idempotency Requirement)', () => {
    it('should return 200 OK and not duplicate records when exact same eventId is sent twice', async () => {
      const { booking, payment } = await createBookingAndPayment('SUCCESS');
      const eventId = `evt_duplicate_001_${Date.now()}`;

      const payload = {
        eventId,
        paymentId: payment.id,
        bookingId: booking.id,
        status: 'SUCCESS',
      };

      // First delivery: processes normally
      const res1 = await request(app)
        .post('/api/payments/webhook')
        .send(payload);

      expect(res1.status).toBe(200);
      expect(res1.body.message).toBe('Webhook processed successfully');

      // Second delivery: idempotent return
      const res2 = await request(app)
        .post('/api/payments/webhook')
        .send(payload);

      expect(res2.status).toBe(200);
      expect(res2.body.success).toBe(true);
      expect(res2.body.message).toBe('Webhook already processed');

      // Verify exactly ONE PaymentEvent exists for this eventId
      const eventCount = await prisma.paymentEvent.count({ where: { eventId } });
      expect(eventCount).toBe(1);

      // Verify no duplicate payments or booking updates
      const paymentCount = await prisma.payment.count({ where: { bookingId: booking.id } });
      expect(paymentCount).toBe(1);

      const dbBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
      expect(dbBooking.status).toBe('CONFIRMED');
    });
  });

  describe('D. State Transition Consistency Across Events', () => {
    it('should NOT allow CONFIRMED booking to transition to FAILED via later webhook (HTTP 400)', async () => {
      const { booking, payment } = await createBookingAndPayment('SUCCESS');
      const eventId1 = `evt_first_${Date.now()}`;

      // First webhook confirms the booking
      await request(app)
        .post('/api/payments/webhook')
        .send({
          eventId: eventId1,
          paymentId: payment.id,
          bookingId: booking.id,
          status: 'SUCCESS',
        });

      // Later webhook with different eventId attempts to fail the confirmed booking
      const eventId2 = `evt_second_${Date.now()}`;
      const conflictRes = await request(app)
        .post('/api/payments/webhook')
        .send({
          eventId: eventId2,
          paymentId: payment.id,
          bookingId: booking.id,
          status: 'FAILED',
        });

      expect(conflictRes.status).toBe(400);
      expect(conflictRes.body.success).toBe(false);
      expect(conflictRes.body.message).toMatch(/cannot fail an already confirmed booking/i);

      // Verify booking remains CONFIRMED
      const dbBooking = await prisma.booking.findUnique({ where: { id: booking.id } });
      expect(dbBooking.status).toBe('CONFIRMED');
    });

    it('should NOT allow FAILED booking to transition to CONFIRMED via later webhook (HTTP 400)', async () => {
      const { booking, payment } = await createBookingAndPayment('FAILED');
      const eventId1 = `evt_first_fail_${Date.now()}`;

      // First webhook fails the booking
      await request(app)
        .post('/api/payments/webhook')
        .send({
          eventId: eventId1,
          paymentId: payment.id,
          bookingId: booking.id,
          status: 'FAILED',
        });

      // Later webhook with different eventId attempts to confirm the failed booking
      const eventId2 = `evt_second_success_${Date.now()}`;
      const conflictRes = await request(app)
        .post('/api/payments/webhook')
        .send({
          eventId: eventId2,
          paymentId: payment.id,
          bookingId: booking.id,
          status: 'SUCCESS',
        });

      expect(conflictRes.status).toBe(400);
      expect(conflictRes.body.success).toBe(false);
      expect(conflictRes.body.message).toMatch(/cannot confirm an already failed booking/i);
    });
  });

  describe('E. Invalid Webhook Requests & Error Handling', () => {
    it('should reject webhook without JWT header (should succeed without 401)', async () => {
      const res = await request(app)
        .post('/api/payments/webhook')
        .send({
          eventId: `evt_probe_${Date.now()}`,
          paymentId: '00000000-0000-0000-0000-000000000000',
          bookingId: '00000000-0000-0000-0000-000000000000',
          status: 'SUCCESS',
        });

      // Should not be 401 Unauthorized
      expect(res.status).not.toBe(401);
      expect(res.status).toBe(404); // 404 payment not found
    });

    it('should reject webhook with missing eventId (HTTP 400)', async () => {
      const res = await request(app)
        .post('/api/payments/webhook')
        .send({
          paymentId: 'pay_123',
          bookingId: 'book_123',
          status: 'SUCCESS',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject webhook with missing paymentId (HTTP 400)', async () => {
      const res = await request(app)
        .post('/api/payments/webhook')
        .send({
          eventId: 'evt_123',
          bookingId: 'book_123',
          status: 'SUCCESS',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject webhook with missing bookingId (HTTP 400)', async () => {
      const res = await request(app)
        .post('/api/payments/webhook')
        .send({
          eventId: 'evt_123',
          paymentId: 'pay_123',
          status: 'SUCCESS',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject webhook with invalid status value (HTTP 400)', async () => {
      const res = await request(app)
        .post('/api/payments/webhook')
        .send({
          eventId: 'evt_123',
          paymentId: 'pay_123',
          bookingId: 'book_123',
          status: 'PENDING',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject webhook when payment does not belong to provided bookingId (HTTP 400)', async () => {
      const { payment: p1 } = await createBookingAndPayment('SUCCESS');
      const { booking: b2 } = await createBookingAndPayment('SUCCESS');

      const res = await request(app)
        .post('/api/payments/webhook')
        .send({
          eventId: `evt_mismatch_${Date.now()}`,
          paymentId: p1.id,
          bookingId: b2.id, // Mismatched booking
          status: 'SUCCESS',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/does not match/i);
    });
  });
});
