const express = require('express');
const cors = require('cors');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const mongoose = require('mongoose');

// Import routes
const authRoutes = require('./routes/authRoutes');
const publicRoutes = require('./routes/publicRoutes');
const adminRoutes = require('./routes/adminRoutes');
const pipelineRoutes = require('./routes/pipelineRoutes');
const auditRoutes = require('./routes/auditRoutes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const captureMetadata = require('./middleware/captureMetadata');

const app = express();

// ========================
// MIDDLEWARE
// ========================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(captureMetadata); // Apply globally

// Static files for uploaded CVs
app.use('/uploads', express.static('uploads'));

// ========================
// SWAGGER CONFIGURATION
// ========================
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Talent Pool System API',
      version: '1.0.0',
      description: 'Job application platform with dynamic form builder, admin management, and public job applications.',
      contact: {
        name: 'API Support',
        email: 'support@company.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5001',
        description: 'Development server'
      },
      {
        url: 'https://api.yourcompany.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter JWT token obtained from /auth/login'
        }
      },
      schemas: {
        // Auth Schemas
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              example: 'admin@company.com'
            },
            password: {
              type: 'string',
              format: 'password',
              example: 'password123'
            }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Login successful'
            },
            data: {
              type: 'object',
              properties: {
                user: {
                  type: 'object',
                  properties: {
                    _id: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string' },
                    role: { type: 'string', enum: ['admin', 'user'] }
                  }
                },
                token: {
                  type: 'string',
                  example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                }
              }
            }
          }
        },

        // Job Schemas
        CreateJobRequest: {
          type: 'object',
          required: ['title', 'description', 'validTo'],
          properties: {
            title: {
              type: 'string',
              example: 'Frontend Developer'
            },
            description: {
              type: 'string',
              example: 'We are hiring a React developer'
            },
            validFrom: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-12T10:00:00Z'
            },
            validTo: {
              type: 'string',
              format: 'date-time',
              example: '2026-01-31T23:59:59Z'
            }
          }
        },
        JobResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'job_123' }
              }
            }
          }
        },
        JobStatusUpdateResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Job published and live successfully' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string', example: '677a1b2c3d4e5f6789abcdef' },
                previousStatus: { type: 'string', example: 'INACTIVE' },
                status: { type: 'string', example: 'ACTIVE' },
                hasField: { type: 'boolean', example: true },
                validFrom: { type: 'string', format: 'date-time', example: '2026-01-12T10:00:00Z' },
                validTo: { type: 'string', format: 'date-time', example: '2026-01-31T23:59:59Z' },
                updatedAt: { type: 'string', format: 'date-time', example: '2026-01-12T10:05:00Z' }
              }
            }
          }
        },
        UpdateJobStatusRequest: {
          type: 'object',
          required: ['status'],
          properties: {
            status: {
              type: 'string',
              enum: ['ACTIVE', 'INACTIVE'],
              example: 'ACTIVE'
            }
          }
        },
        UpdateJobRequest: {
          type: 'object',
          properties: {
            title: { type: 'string', example: 'Frontend Developer' },
            description: { type: 'string', example: 'We are hiring a React developer' },
            status: { type: 'string', enum: ['ACTIVE', 'INACTIVE'], example: 'INACTIVE' },
            validFrom: { type: 'string', format: 'date-time', example: '2026-01-12T10:00:00Z' },
            validTo: { type: 'string', format: 'date-time', example: '2026-01-14T11:30:00Z' }
          }
        },
        UpdateJobResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Job updated successfully' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'string', example: '677a1b2c3d4e5f6789abcdef' },
                title: { type: 'string', example: 'Frontend Developer' },
                description: { type: 'string', example: 'We are hiring a React developer' },
                status: { type: 'string', example: 'INACTIVE' },
                validFrom: { type: 'string', format: 'date-time', example: '2026-01-12T10:00:00Z' },
                validTo: { type: 'string', format: 'date-time', example: '2026-01-14T11:30:00Z' },
                updatedAt: { type: 'string', format: 'date-time', example: '2026-01-12T10:05:00Z' }
              }
            }
          }
        },

        // Job Field Schemas
        AddFieldRequest: {
          type: 'object',
          required: ['type', 'question', 'required', 'order'],
          properties: {
            type: {
              type: 'string',
              enum: ['short_answer', 'paragraph', 'multiple_choice', 'checkboxes', 'dropdown', 'file', 'rating', 'date', 'time'],
              example: 'multiple_choice'
            },
            question: {
              type: 'string',
              example: 'Years of Experience'
            },
            options: {
              type: 'array',
              items: { type: 'string' },
              example: ['0-1', '2-3', '4-5', '5+']
            },
            required: {
              type: 'boolean',
              example: true
            },
            order: {
              type: 'number',
              example: 3
            }
          }
        },
        FieldResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                fieldId: { type: 'string', example: 'field_34353454' }
              }
            }
          }
        },
        ReorderFieldsRequest: {
          type: 'object',
          required: ['fields'],
          properties: {
            fields: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  order: { type: 'number' }
                }
              },
              example: [
                { id: 'field_1', order: 1 },
                { id: 'field_3', order: 2 }
              ]
            }
          }
        },

        // Public Job Schemas
        PublicJobListItem: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'job_123' },
            title: { type: 'string', example: 'Frontend Developer' },
            shortDescription: { type: 'string', example: 'React developer needed' },
            validFrom: { type: 'string', format: 'date-time' },
            validTo: { type: 'string', format: 'date-time' }
          }
        },
        PublicJobDetail: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            fields: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string' },
                  question: { type: 'string' },
                  options: { type: 'array', items: { type: 'string' } },
                  required: { type: 'boolean' },
                  order: { type: 'number' }
                }
              }
            }
          }
        },

        // Application Response Schemas
        ApplicationResponseList: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  responseId: { type: 'string' },
                  applicantName: { type: 'string' },
                  applicantEmail: { type: 'string' },
                  applicantPhoneNumber: { type: 'string' },
                  submittedAt: { type: 'string', format: 'date-time' },
                  isSaved: { type: 'boolean' },
                  isInvited: { type: 'boolean' },
                  isAccepted: { type: 'boolean' }
                }
              }
            }
          }
        },
        ApplicationResponseDetail: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                applicant: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    email: { type: 'string' },
                    phoneNumber: { type: 'string' }
                  }
                },
                answers: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      question: { type: 'string' },
                      type: { type: 'string' },
                      value: { oneOf: [{ type: 'string' }, { type: 'array' }] }
                    }
                  }
                },
                isSaved: { type: 'boolean' },
                isInvited: { type: 'boolean' },
                isAccepted: { type: 'boolean' },
                submittedAt: { type: 'string', format: 'date-time' }
              }
            }
          }
        },

        // Interview/Acceptance Schemas
        SendInvitationRequest: {
          type: 'object',
          required: ['interviewDate', 'interviewTime'],
          properties: {
            interviewDate: {
              type: 'string',
              format: 'date',
              example: '2026-01-20'
            },
            interviewTime: {
              type: 'string',
              example: '10:00'
            }
          }
        },

        // Error Schema
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            code: {
              type: 'string',
              example: 'DUPLICATE_APPLICATION'
            },
            message: {
              type: 'string',
              example: 'You have already applied for this job.'
            }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'Admin authentication endpoints'
      },
      {
        name: 'Jobs - Public',
        description: 'Public job viewing endpoints (No auth required)'
      },
      {
        name: 'Applications - Public',
        description: 'Job application endpoints (No auth required)'
      },
      {
        name: 'Jobs - Admin',
        description: 'Job management endpoints (Admin only)'
      },
      {
        name: 'Job Fields - Admin',
        description: 'Dynamic form builder endpoints (Admin only)'
      },
      {
        name: 'Applications - Admin',
        description: 'Application management endpoints (Admin only)'
      },
      {
        name: 'Pipeline',
        description: 'Pipeline and application stage management (Phase 2)'
      },
      {
        name: 'Audit',
        description: 'System audit logging (Phase 2)'
      }
    ]
  },
  apis: ['./src/routes/*.js']
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Enable Swagger in development or when explicitly enabled
const swaggerEnabled = (process.env.NODE_ENV !== 'production') || process.env.SWAGGER_ENABLED === 'true';

if (swaggerEnabled) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Talent Pool System API',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      syntaxHighlight: {
        activate: true,
        theme: 'monokai'
      }
    }
  }));

  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocs);
  });

  console.log('📚 Swagger documentation available at http://localhost:5001/api-docs');
}

// ========================
// HEALTH CHECK
// ========================
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    version: '2.0.0',
    features: ['Dynamic Form Builder', 'Job Applications', 'Admin Dashboard'],
    db: {
      readyState: dbState,
      connected: dbState === 1
    }
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Talent Pool System API',
    documentation: '/api-docs',
    health: '/health',
    version: '1.0.0'
  });
});

// ========================
// ROUTES (NO DUPLICATES!)
// ========================

// PUBLIC ROUTES (No Authentication)
app.use('/api', publicRoutes);

// AUTHENTICATION ROUTES
app.use('/api/auth', authRoutes);

// ADMIN ROUTES (Requires Authentication + Admin Role)
app.use('/api/admin', adminRoutes);

// PHASE 2 ROUTES
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/audit', auditRoutes);

// ========================
// 404 HANDLER
// ========================
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: {
      documentation: 'GET /api-docs',
      health: 'GET /health',
      publicJobs: 'GET /api/jobs',
      jobDetail: 'GET /api/jobs/:jobId',
      applyJob: 'POST /api/jobs/:jobId/apply',
      adminLogin: 'POST /api/auth/login',
      adminJobs: 'GET /api/admin/jobs (requires auth)',
      createJob: 'POST /api/admin/jobs (requires auth)'
    }
  });
});

// ========================
// ERROR HANDLER
// ========================
app.use(errorHandler);

module.exports = app;