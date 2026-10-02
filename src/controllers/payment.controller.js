const prisma = require('../config/prisma');

/**
 * Process a simulated payment for a pending booking
 * POST /api/payments (Protected)
 */
const processPayment = async (req, res, next) => {
  try {
    const { bookingId, result } = req.body;

    // 1. Find the booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // 2. Ownership verification: User can only pay for their own booking
    if (booking.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to pay for this booking',
      });
    }

    // 3. State verification: Only PENDING bookings can be paid
    if (booking.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Only pending bookings can be paid',
      });
    }

    // 4. Map payment and booking statuses based on deterministic simulation result
    const isSuccess = result === 'SUCCESS';
    const paymentStatus = isSuccess ? 'SUCCESS' : 'FAILED';
    const bookingStatus = isSuccess ? 'CONFIRMED' : 'FAILED';
    const message = isSuccess ? 'Payment successful' : 'Payment failed';

    // 5. Generate a unique simulated provider payment ID
    const providerPaymentId = `mock_pay_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    // 6. Execute payment creation and booking status update atomically in a Prisma transaction
    const { payment, updatedBooking } = await prisma.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          bookingId: booking.id,
          providerPaymentId,
          amount: booking.amount,
          status: paymentStatus,
        },
      });

      const updated = await tx.booking.update({
        where: { id: booking.id },
        data: { status: bookingStatus },
      });

      return { payment: newPayment, updatedBooking: updated };
    });

    return res.status(200).json({
      success: true,
      message,
      payment: {
        id: payment.id,
        providerPaymentId: payment.providerPaymentId,
        amount: Number(payment.amount),
        status: payment.status,
      },
      booking: {
        id: updatedBooking.id,
        status: updatedBooking.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle simulated payment provider webhook with idempotency
 * POST /api/payments/webhook (Public / Provider-to-server)
 */
const handleWebhook = async (req, res, next) => {
  try {
    const { eventId, paymentId, bookingId, status } = req.body;

    // 1. Application-level idempotency check: Has this event already been processed?
    const existingEvent = await prisma.paymentEvent.findUnique({
      where: { eventId },
    });

    if (existingEvent) {
      return res.status(200).json({
        success: true,
        message: 'Webhook already processed',
      });
    }

    // 2. Process webhook event in an atomic database transaction
    await prisma.$transaction(async (tx) => {
      // Find the payment by ID or providerPaymentId
      const payment = await tx.payment.findFirst({
        where: {
          OR: [
            { id: paymentId },
            { providerPaymentId: paymentId },
          ],
        },
      });

      if (!payment) {
        const error = new Error('Payment not found');
        error.statusCode = 404;
        throw error;
      }

      // Verify booking association
      if (payment.bookingId !== bookingId) {
        const error = new Error('Booking ID does not match payment record');
        error.statusCode = 400;
        throw error;
      }

      const booking = await tx.booking.findUnique({
        where: { id: payment.bookingId },
      });

      if (!booking) {
        const error = new Error('Booking not found');
        error.statusCode = 404;
        throw error;
      }

      // Guard against invalid state transitions
      if (booking.status === 'CANCELLED') {
        const error = new Error('Cannot process webhook for a cancelled booking');
        error.statusCode = 400;
        throw error;
      }

      if (status === 'SUCCESS' && booking.status === 'FAILED') {
        const error = new Error('Cannot confirm an already failed booking');
        error.statusCode = 400;
        throw error;
      }

      if (status === 'FAILED' && booking.status === 'CONFIRMED') {
        const error = new Error('Cannot fail an already confirmed booking');
        error.statusCode = 400;
        throw error;
      }

      // Record the PaymentEvent (database UNIQUE constraint on eventId prevents race condition duplicates)
      await tx.paymentEvent.create({
        data: {
          eventId,
          paymentId: payment.id,
          status,
        },
      });

      // Update Payment and Booking statuses
      const newPaymentStatus = status === 'SUCCESS' ? 'SUCCESS' : 'FAILED';
      const newBookingStatus = status === 'SUCCESS' ? 'CONFIRMED' : 'FAILED';

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: newPaymentStatus },
      });

      await tx.booking.update({
        where: { id: booking.id },
        data: { status: newBookingStatus },
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    // Database unique constraint violation on eventId (Prisma P2002) - concurrent duplicate request
    if (error.code === 'P2002') {
      return res.status(200).json({
        success: true,
        message: 'Webhook already processed',
      });
    }

    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

module.exports = {
  processPayment,
  handleWebhook,
};
