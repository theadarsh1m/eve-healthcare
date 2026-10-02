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

module.exports = {
  processPayment,
};
