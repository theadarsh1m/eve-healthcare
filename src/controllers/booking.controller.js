const prisma = require('../config/prisma');

/**
 * Create a new diagnostic test booking
 * POST /api/bookings (Protected)
 */
const createBooking = async (req, res, next) => {
  try {
    const { centreTestId, appointmentAt } = req.body;

    // Validate that appointment date is in the future
    const appointmentDate = new Date(appointmentAt);
    if (appointmentDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Appointment date must be in the future',
      });
    }

    // Verify CentreTest exists and retrieve centre, test, and active price
    const centreTest = await prisma.centreTest.findUnique({
      where: { id: centreTestId },
      include: {
        centre: true,
        test: true,
      },
    });

    if (!centreTest) {
      return res.status(404).json({
        success: false,
        message: 'Diagnostic test is not available at this centre',
      });
    }

    // Create booking: user identity from JWT, price snapshot from centreTest, status strictly PENDING
    const booking = await prisma.booking.create({
      data: {
        userId: req.user.id,
        centreTestId,
        appointmentAt: appointmentDate,
        amount: centreTest.price,
        status: 'PENDING',
      },
      include: {
        centreTest: {
          include: {
            centre: true,
            test: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: {
        id: booking.id,
        appointmentAt: booking.appointmentAt,
        amount: Number(booking.amount),
        status: booking.status,
        centre: {
          id: booking.centreTest.centre.id,
          name: booking.centreTest.centre.name,
          location: booking.centreTest.centre.location,
        },
        test: {
          id: booking.centreTest.test.id,
          name: booking.centreTest.test.name,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all bookings belonging to the authenticated user
 * GET /api/bookings (Protected)
 */
const getUserBookings = async (req, res, next) => {
  try {
    // Filter bookings strictly by authenticated user's ID
    const bookings = await prisma.booking.findMany({
      where: {
        userId: req.user.id,
      },
      include: {
        centreTest: {
          include: {
            centre: true,
            test: true,
          },
        },
      },
      orderBy: {
        appointmentAt: 'desc',
      },
    });

    const formattedBookings = bookings.map((b) => ({
      id: b.id,
      appointmentAt: b.appointmentAt,
      amount: Number(b.amount),
      status: b.status,
      centre: {
        id: b.centreTest.centre.id,
        name: b.centreTest.centre.name,
        location: b.centreTest.centre.location,
      },
      test: {
        id: b.centreTest.test.id,
        name: b.centreTest.test.name,
      },
    }));

    return res.status(200).json({
      success: true,
      bookings: formattedBookings,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single booking by ID (only accessible by booking owner)
 * GET /api/bookings/:id (Protected)
 */
const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        centreTest: {
          include: {
            centre: true,
            test: true,
          },
        },
      },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Authorization check: Ensure requester owns this booking
    if (booking.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to access this booking',
      });
    }

    return res.status(200).json({
      success: true,
      booking: {
        id: booking.id,
        appointmentAt: booking.appointmentAt,
        amount: Number(booking.amount),
        status: booking.status,
        centre: {
          id: booking.centreTest.centre.id,
          name: booking.centreTest.centre.name,
          location: booking.centreTest.centre.location,
        },
        test: {
          id: booking.centreTest.test.id,
          name: booking.centreTest.test.name,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Cancel a pending booking
 * PATCH /api/bookings/:id/cancel (Protected)
 */
const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // Authorization check: Ensure requester owns this booking
    if (booking.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this booking',
      });
    }

    // State transition check: Only PENDING bookings can be cancelled
    if (booking.status !== 'PENDING') {
      return res.status(400).json({
        success: false,
        message: 'Only pending bookings can be cancelled',
      });
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        status: 'CANCELLED',
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
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
  createBooking,
  getUserBookings,
  getBookingById,
  cancelBooking,
};
