const prisma = require('../config/prisma');

/**
 * Create a new diagnostic centre
 * POST /api/centres (Protected)
 */
const createCentre = async (req, res, next) => {
  try {
    const { name, location } = req.body;

    const centre = await prisma.diagnosticCentre.create({
      data: {
        name,
        location,
      },
      select: {
        id: true,
        name: true,
        location: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Diagnostic centre created successfully',
      centre,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all diagnostic centres
 * GET /api/centres (Public)
 */
const getCentres = async (req, res, next) => {
  try {
    const centres = await prisma.diagnosticCentre.findMany({
      select: {
        id: true,
        name: true,
        location: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return res.status(200).json({
      success: true,
      centres,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single diagnostic centre with available tests and prices
 * GET /api/centres/:id (Public)
 */
const getCentreById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const centre = await prisma.diagnosticCentre.findUnique({
      where: { id },
      include: {
        centreTests: {
          include: {
            test: true,
          },
        },
      },
    });

    if (!centre) {
      return res.status(404).json({
        success: false,
        message: 'Diagnostic centre not found',
      });
    }

    // Format tests with price from junction table
    const tests = centre.centreTests.map((ct) => ({
      id: ct.test.id,
      name: ct.test.name,
      description: ct.test.description,
      price: Number(ct.price),
    }));

    return res.status(200).json({
      success: true,
      centre: {
        id: centre.id,
        name: centre.name,
        location: centre.location,
        tests,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Associate a diagnostic test with a centre and assign price
 * POST /api/centres/:id/tests (Protected)
 */
const addTestToCentre = async (req, res, next) => {
  try {
    const { id: centreId } = req.params;
    const { testId, price } = req.body;

    // Verify diagnostic centre exists
    const centre = await prisma.diagnosticCentre.findUnique({
      where: { id: centreId },
    });

    if (!centre) {
      return res.status(404).json({
        success: false,
        message: 'Diagnostic centre not found',
      });
    }

    // Verify diagnostic test exists
    const test = await prisma.diagnosticTest.findUnique({
      where: { id: testId },
    });

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Diagnostic test not found',
      });
    }

    // Check if test is already assigned to this centre
    const existingAssociation = await prisma.centreTest.findUnique({
      where: {
        centreId_testId: {
          centreId,
          testId,
        },
      },
    });

    if (existingAssociation) {
      return res.status(409).json({
        success: false,
        message: 'Test is already associated with this diagnostic centre',
      });
    }

    // Create the junction record
    const centreTest = await prisma.centreTest.create({
      data: {
        centreId,
        testId,
        price: Number(price),
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Test added to diagnostic centre',
      centreTest: {
        id: centreTest.id,
        centreId: centreTest.centreId,
        testId: centreTest.testId,
        price: Number(centreTest.price),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createCentre,
  getCentres,
  getCentreById,
  addTestToCentre,
};
