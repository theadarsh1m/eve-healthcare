const prisma = require('../config/prisma');

/**
 * Create a new diagnostic test
 * POST /api/tests (Protected)
 */
const createTest = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const test = await prisma.diagnosticTest.create({
      data: {
        name,
        description: description || null,
      },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Diagnostic test created successfully',
      test,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all diagnostic tests
 * GET /api/tests (Public)
 */
const getTests = async (req, res, next) => {
  try {
    const tests = await prisma.diagnosticTest.findMany({
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return res.status(200).json({
      success: true,
      tests,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single diagnostic test with centres where it is offered and prices
 * GET /api/tests/:id (Public)
 */
const getTestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const test = await prisma.diagnosticTest.findUnique({
      where: { id },
      include: {
        centreTests: {
          include: {
            centre: true,
          },
        },
      },
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Diagnostic test not found',
      });
    }

    // Format centres with price from junction table
    const centres = test.centreTests.map((ct) => ({
      id: ct.centre.id,
      name: ct.centre.name,
      location: ct.centre.location,
      price: Number(ct.price),
    }));

    return res.status(200).json({
      success: true,
      test: {
        id: test.id,
        name: test.name,
        description: test.description,
        centres,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTest,
  getTests,
  getTestById,
};
