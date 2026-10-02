const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const env = require('./config/env');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'EVE Healthcare Diagnostic Booking API',
    version: '1.0.0',
    description:
      'Backend API for diagnostic test bookings and simulated payments for the EVE Healthcare SDE Intern Assignment.\n\n' +
      '### Authentication Guide:\n' +
      '1. Register via `POST /api/auth/signup` or authenticate via `POST /api/auth/login`.\n' +
      '2. Copy the returned `token`.\n' +
      '3. Click the **Authorize** button at the top right and paste the token.\n' +
      '4. Protected endpoints will now include the `Authorization: Bearer <token>` header automatically.',
  },
  servers: [
    {
      url: `http://localhost:${env.PORT}`,
      description: 'Local Development Server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide JWT token obtained from POST /api/auth/login',
      },
    },
    schemas: {
      // Reusable Model Schemas
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'd3b07384-d113-4c59-b1d5-866d92550186' },
          name: { type: 'string', example: 'Jane Doe' },
          email: { type: 'string', format: 'email', example: 'jane@example.com' },
        },
      },
      DiagnosticCentre: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '9a6d09c2-55db-4418-879e-e8b4e7235a90' },
          name: { type: 'string', example: 'Apex Diagnostic Centre' },
          location: { type: 'string', example: 'Connaught Place, New Delhi' },
        },
      },
      DiagnosticTest: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '1c7d23f4-3d9a-4c22-b5e8-f9b1c70e34aa' },
          name: { type: 'string', example: 'Complete Blood Count (CBC)' },
          description: { type: 'string', nullable: true, example: 'Evaluates red cells, white cells, and platelets' },
        },
      },
      CentreTest: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'b4a8e291-7d12-4c31-9f23-c4e5a6b7c8d9' },
          centreId: { type: 'string', format: 'uuid', example: '9a6d09c2-55db-4418-879e-e8b4e7235a90' },
          testId: { type: 'string', format: 'uuid', example: '1c7d23f4-3d9a-4c22-b5e8-f9b1c70e34aa' },
          price: { type: 'number', format: 'float', example: 450.0 },
        },
      },
      Booking: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '3b1675ca-3a05-4c07-b35a-9351d38402b8' },
          appointmentAt: { type: 'string', format: 'date-time', example: '2026-12-01T10:30:00.000Z' },
          amount: { type: 'number', format: 'float', example: 450.0 },
          status: {
            type: 'string',
            enum: ['PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED'],
            example: 'PENDING',
          },
        },
      },
      Payment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '5e7f12a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a' },
          providerPaymentId: { type: 'string', example: 'mock_pay_1775115200000_abc123' },
          amount: { type: 'number', format: 'float', example: 450.0 },
          status: {
            type: 'string',
            enum: ['PENDING', 'SUCCESS', 'FAILED'],
            example: 'SUCCESS',
          },
        },
      },
      PaymentEvent: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: '8f9a0b1c-2d3e-4f5a-6b7c-8d9e0f1a2b3c' },
          eventId: { type: 'string', example: 'evt_987654321' },
          paymentId: { type: 'string', example: '5e7f12a3-b4c5-6d7e-8f9a-0b1c2d3e4f5a' },
          status: { type: 'string', enum: ['SUCCESS', 'FAILED'], example: 'SUCCESS' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      // Standard Response Schemas
      StandardResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Resource not found' },
        },
      },
      ValidationErrorResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Validation failed' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'email' },
                message: { type: 'string', example: 'Invalid email address' },
              },
            },
          },
        },
      },
    },
  },
  paths: {
    // ----------------------------------------------------
    // HEALTH ENDPOINT
    // ----------------------------------------------------
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Check API service health status',
        description: 'Public endpoint to check if the EVE Healthcare service is running and responsive.',
        responses: {
          200: {
            description: 'API is healthy and operational',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'EVE Healthcare API is running' },
                  },
                },
              },
            },
          },
        },
      },
    },

    // ----------------------------------------------------
    // AUTHENTICATION ENDPOINTS
    // ----------------------------------------------------
    '/api/auth/signup': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user account',
        description: 'Creates a patient profile with a bcrypt-hashed password (10 rounds). The passwordHash is never exposed in the response.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'email', 'password'],
                properties: {
                  name: { type: 'string', example: 'Jane Doe' },
                  email: { type: 'string', format: 'email', example: 'jane@example.com' },
                  password: { type: 'string', minLength: 6, example: 'Password123!' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'User registered successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'User registered successfully' },
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation failed (e.g. invalid email, short password)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } } } },
          409: { description: 'Email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Authenticate existing user and obtain JWT',
        description: 'Validates credentials using bcrypt and issues a 24-hour signed JWT containing the user ID.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'jane@example.com' },
                  password: { type: 'string', example: 'Password123!' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Login successful with JWT token',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Login successful' },
                    token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error (missing fields)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } } } },
          401: { description: 'Invalid email or password', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Get current user profile (Protected)',
        description: 'Retrieves profile information for the authenticated user extracted from the JWT token.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Current user profile',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    user: { $ref: '#/components/schemas/User' },
                  },
                },
              },
            },
          },
          401: { description: 'Missing or invalid/expired token', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: { description: 'User not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    // ----------------------------------------------------
    // DIAGNOSTIC CENTRES
    // ----------------------------------------------------
    '/api/centres': {
      post: {
        tags: ['Diagnostic Centres'],
        summary: 'Create a diagnostic centre (Protected)',
        description: 'Creates a new diagnostic facility location. Requires valid user JWT.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name', 'location'],
                properties: {
                  name: { type: 'string', example: 'Apex Diagnostic Centre' },
                  location: { type: 'string', example: 'Connaught Place, New Delhi' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Centre created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Diagnostic centre created successfully' },
                    centre: { $ref: '#/components/schemas/DiagnosticCentre' },
                  },
                },
              },
            },
          },
          400: { description: 'Missing required fields', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      get: {
        tags: ['Diagnostic Centres'],
        summary: 'List all diagnostic centres',
        description: 'Public endpoint returning all diagnostic centres ordered alphabetically by name.',
        responses: {
          200: {
            description: 'List of centres',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    centres: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/DiagnosticCentre' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/centres/{id}': {
      get: {
        tags: ['Diagnostic Centres'],
        summary: 'Get diagnostic centre by ID with available tests and prices',
        description: 'Public endpoint returning detailed centre information along with all assigned diagnostic tests and branch-specific pricing.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID of the diagnostic centre',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Centre details with test offerings',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    centre: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        location: { type: 'string' },
                        tests: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', format: 'uuid' },
                              name: { type: 'string' },
                              description: { type: 'string', nullable: true },
                              price: { type: 'number', format: 'float', example: 450.0 },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          404: { description: 'Centre not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/centres/{id}/tests': {
      post: {
        tags: ['Diagnostic Centres'],
        summary: 'Associate a test with a centre and set price (Protected)',
        description: 'Creates a `CentreTest` junction record linking a test to a centre with branch-specific dynamic pricing. Requires valid JWT.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID of the diagnostic centre',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['testId', 'price'],
                properties: {
                  testId: { type: 'string', format: 'uuid', example: '1c7d23f4-3d9a-4c22-b5e8-f9b1c70e34aa' },
                  price: { type: 'number', minimum: 0.01, example: 450.0 },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Test associated with centre successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Test added to diagnostic centre' },
                    centreTest: { $ref: '#/components/schemas/CentreTest' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error (non-positive price)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: { description: 'Centre or Test not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          409: { description: 'Test is already associated with this centre', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    // ----------------------------------------------------
    // DIAGNOSTIC TESTS
    // ----------------------------------------------------
    '/api/tests': {
      post: {
        tags: ['Diagnostic Tests'],
        summary: 'Create a diagnostic test (Protected)',
        description: 'Creates a new medical test catalog item. Requires valid JWT.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', example: 'Complete Blood Count (CBC)' },
                  description: { type: 'string', example: 'Evaluates red cells, white cells, and platelets' },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Test created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Diagnostic test created successfully' },
                    test: { $ref: '#/components/schemas/DiagnosticTest' },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      get: {
        tags: ['Diagnostic Tests'],
        summary: 'List all diagnostic tests',
        description: 'Public endpoint returning all master diagnostic tests ordered alphabetically.',
        responses: {
          200: {
            description: 'List of diagnostic tests',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    tests: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/DiagnosticTest' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/api/tests/{id}': {
      get: {
        tags: ['Diagnostic Tests'],
        summary: 'Get diagnostic test by ID',
        description: 'Public endpoint returning test details along with all centres offering this test and their local prices.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID of the diagnostic test',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Test details with centre offerings',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    test: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        description: { type: 'string', nullable: true },
                        centres: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', format: 'uuid' },
                              name: { type: 'string' },
                              location: { type: 'string' },
                              price: { type: 'number', format: 'float', example: 450.0 },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          404: { description: 'Diagnostic test not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    // ----------------------------------------------------
    // BOOKINGS
    // ----------------------------------------------------
    '/api/bookings': {
      post: {
        tags: ['Bookings'],
        summary: 'Book a diagnostic test (Protected)',
        description:
          'Creates a diagnostic appointment reservation for the authenticated patient.\n\n' +
          '**Server Derivation Notice**:\n' +
          '- `userId` is extracted directly from the verified JWT.\n' +
          '- `amount` is derived directly from the current `CentreTest.price` record in PostgreSQL as an immutable price snapshot.\n' +
          '- `status` is strictly initialized to `PENDING`.\n' +
          '- `appointmentAt` must be a valid future ISO-8601 timestamp.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['centreTestId', 'appointmentAt'],
                properties: {
                  centreTestId: {
                    type: 'string',
                    format: 'uuid',
                    description: 'ID of the CentreTest junction record',
                    example: 'b4a8e291-7d12-4c31-9f23-c4e5a6b7c8d9',
                  },
                  appointmentAt: {
                    type: 'string',
                    format: 'date-time',
                    description: 'Future appointment date and time (ISO 8601)',
                    example: '2026-12-01T10:30:00.000Z',
                  },
                },
              },
            },
          },
        },
        responses: {
          201: {
            description: 'Booking created successfully with status PENDING',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Booking created successfully' },
                    booking: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        appointmentAt: { type: 'string', format: 'date-time' },
                        amount: { type: 'number', format: 'float', example: 450.0 },
                        status: { type: 'string', example: 'PENDING' },
                        centre: { $ref: '#/components/schemas/DiagnosticCentre' },
                        test: { $ref: '#/components/schemas/DiagnosticTest' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Validation failed (e.g. appointment date is in the past)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: { description: 'CentreTest not found or unavailable', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
      get: {
        tags: ['Bookings'],
        summary: 'List all bookings for authenticated user (Protected)',
        description: 'Returns all diagnostic test bookings belonging exclusively to the authenticated user.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'List of user bookings',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    bookings: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', format: 'uuid' },
                          appointmentAt: { type: 'string', format: 'date-time' },
                          amount: { type: 'number', format: 'float' },
                          status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED'] },
                          centre: { $ref: '#/components/schemas/DiagnosticCentre' },
                          test: { $ref: '#/components/schemas/DiagnosticTest' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/bookings/{id}': {
      get: {
        tags: ['Bookings'],
        summary: 'Get single booking details (Protected)',
        description: 'Retrieves booking details. Enforces strict multi-tenant ownership: patients can only access their own bookings (HTTP 403 Forbidden for other users).',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID of the booking',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Booking details',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    booking: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        appointmentAt: { type: 'string', format: 'date-time' },
                        amount: { type: 'number', format: 'float' },
                        status: { type: 'string', enum: ['PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED'] },
                        centre: { $ref: '#/components/schemas/DiagnosticCentre' },
                        test: { $ref: '#/components/schemas/DiagnosticTest' },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          403: { description: 'Forbidden (not booking owner)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: { description: 'Booking not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    '/api/bookings/{id}/cancel': {
      patch: {
        tags: ['Bookings'],
        summary: 'Cancel a pending booking (Protected)',
        description: 'Cancels a reservation. Only bookings with status `PENDING` can be cancelled. Ownership is enforced.',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'UUID of the booking to cancel',
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          200: {
            description: 'Booking cancelled successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Booking cancelled successfully' },
                    booking: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        status: { type: 'string', example: 'CANCELLED' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Only pending bookings can be cancelled', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          403: { description: 'Forbidden (not booking owner)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: { description: 'Booking not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    // ----------------------------------------------------
    // PAYMENTS
    // ----------------------------------------------------
    '/api/payments': {
      post: {
        tags: ['Payments'],
        summary: 'Process simulated payment for a booking (Protected)',
        description:
          'Simulates a payment outcome (`SUCCESS` or `FAILED`).\n' +
          '- `SUCCESS`: Updates Payment to `SUCCESS` and Booking to `CONFIRMED` atomically.\n' +
          '- `FAILED`: Updates Payment to `FAILED` and Booking to `FAILED` atomically.\n' +
          '- Enforces that only `PENDING` bookings can be paid and patient ownership is validated.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['bookingId', 'result'],
                properties: {
                  bookingId: { type: 'string', format: 'uuid', example: '3b1675ca-3a05-4c07-b35a-9351d38402b8' },
                  result: { type: 'string', enum: ['SUCCESS', 'FAILED'], example: 'SUCCESS' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Payment processed successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Payment successful' },
                    payment: { $ref: '#/components/schemas/Payment' },
                    booking: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        status: { type: 'string', example: 'CONFIRMED' },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Only pending bookings can be paid or invalid result value', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          401: { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          403: { description: 'Forbidden (cannot pay for another user booking)', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: { description: 'Booking not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },

    // ----------------------------------------------------
    // PAYMENT WEBHOOK
    // ----------------------------------------------------
    '/api/payments/webhook': {
      post: {
        tags: ['Payments'],
        summary: 'Payment provider webhook with idempotency (Public)',
        description:
          'Receives asynchronous payment updates from external gateways.\n\n' +
          '**Dual-Layer Idempotency**:\n' +
          '1. **Application-level check**: Checks if `eventId` was already processed and returns HTTP 200 `"Webhook already processed"` immediately.\n' +
          '2. **Database unique constraint**: `PaymentEvent.eventId` UNIQUE index guarantees race condition duplicates are safely caught (`P2002`) and acknowledged.\n' +
          '3. **No JWT Required**: Server-to-server callback.\n' +
          '4. **Terminal State Protection**: Confirmed bookings cannot be turned to `FAILED`, and cancelled bookings reject updates.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['eventId', 'paymentId', 'bookingId', 'status'],
                properties: {
                  eventId: { type: 'string', example: 'evt_987654321' },
                  paymentId: { type: 'string', example: 'mock_pay_1775115200000_abc123' },
                  bookingId: { type: 'string', format: 'uuid', example: '3b1675ca-3a05-4c07-b35a-9351d38402b8' },
                  status: { type: 'string', enum: ['SUCCESS', 'FAILED'], example: 'SUCCESS' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Webhook processed successfully or duplicate safely ignored',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: {
                      type: 'string',
                      enum: ['Webhook processed successfully', 'Webhook already processed'],
                      example: 'Webhook processed successfully',
                    },
                  },
                },
              },
            },
          },
          400: { description: 'Validation error, mismatched booking/payment, or invalid state transition', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: { description: 'Payment or Booking not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
  },
};

const swaggerSpec = swaggerJsdoc({
  swaggerDefinition,
  apis: [], // All endpoints are fully specified in swaggerDefinition
});

module.exports = {
  swaggerUi,
  swaggerSpec,
};
