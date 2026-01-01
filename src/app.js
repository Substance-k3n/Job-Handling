const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const jobRoutes = require('./routes/jobRoutes');
const applicationRoutes = require('./routes/applicationRoutes');
const errorHandler = require('./middleware/errorHandler');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const pipelineRoutes = require('./routes/pipelineRoutes');
const auditRoutes = require('./routes/auditRoutes');
const captureMetadata = require('./middleware/captureMetadata');
const { protect } = require('./middleware/authMiddleware');
const { authorize } = require('./middleware/roleMiddleware');
const { validateMoveStage } = require('./validators/pipelineValidator');
const validateRequest = require('./middleware/validateRequest');
const { moveStage } = require('./controllers/pipelineController');
const applicationFormRoutes = require('./routes/applicationFormRoutes');
const adminRoutes = require('./routes/adminRoutes');  
const publicRoutes = require('./routes/publicRoutes');  
const app = express();


// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Job Board API',
      version: '1.0.0',
      description: 'A professional Job Board Backend API with user authentication, job management, and application tracking. Built with Node.js, Express, MongoDB, and JWT authentication.',
      contact: {
        name: 'API Support',
        email: 'support@jobboard.com',
        url: 'https://jobboard.com/support'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:5001',
        description: 'Development server'
      },
      {
        url: 'https://api.jobboard.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter your JWT token in the format: Bearer <token>'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            name: { type: 'string', example: 'Jane Doe' },
            email: { type: 'string', format: 'email', example: 'jane@example.com' },
            role: { type: 'string', enum: ['user', 'admin'], example: 'user' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        UserRegister: {
          allOf: [
            { $ref: '#/components/schemas/User' },
            {
              type: 'object',
              required: ['name', 'email', 'password'],
              properties: {
                password: { type: 'string', example: 'strongPassword123' }
              }
            }
          ]
        },
        UserLogin: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string' }
          }
        },
        AuthResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            user: { $ref: '#/components/schemas/User' }
          }
        },
        Job: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            requirements: { type: 'array', items: { type: 'string' } },
            status: { type: 'string', enum: ['active', 'closed'] },
            postedBy: { type: 'string' },
            location: { type: 'string' },
            salary: {
              type: 'object',
              properties: {
                min: { type: 'number' },
                max: { type: 'number' },
                currency: { type: 'string' }
              }
            },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        JobInput: {
          type: 'object',
          required: ['title', 'description'],
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            requirements: { type: 'array', items: { type: 'string' } },
            location: { type: 'string' },
            salary: {
              type: 'object',
              properties: {
                min: { type: 'number' },
                max: { type: 'number' },
                currency: { type: 'string' }
              }
            }
          }
        },
        Application: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            job: { type: 'string' },
            applicant: { $ref: '#/components/schemas/User' },
            coverLetter: { type: 'string' },
            cvPath: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'reviewed', 'accepted', 'rejected'] },
            adminNotes: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        ApplicationInput: {
          type: 'object',
          required: ['job'],
          properties: {
            job: { type: 'string' },
            coverLetter: { type: 'string' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    },
    tags: [
      {
        name: 'Authentication',
        description: 'User and Company authentication and registration'
      },
      {
        name: 'Jobs',
        description: 'Job posting management and retrieval'
      },
      {
        name: 'Applications',
        description: 'Job application management and tracking'
      }
      ,{
        name: 'Pipeline',
        description: 'Pipeline and application stage management'
      }
    ]
  },
  apis: ['./src/routes/*.js', './src/models/*.js'] // Path to your route and model files
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// Mount Swagger UI and JSON only in non-production or when explicitly enabled
const swaggerEnabled = (process.env.NODE_ENV !== 'production') || process.env.SWAGGER_ENABLED === 'true';

if (swaggerEnabled) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Job Board API Documentation',
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

  // Raw OpenAPI JSON (useful for tooling)
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerDocs);
  });
} else {
  // Keep a small log so it's clear why docs are not mounted
  // (no console in library code changes; safe to leave optional comment)
}
app.patch(
  '/applications/:id/move-stage',
  protect,
  authorize('admin'),
  captureMetadata, // ADD THIS
  validateMoveStage,
  validateRequest,
  moveStage
);




// Static files for uploaded CVs
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/admin', adminRoutes);  
app.use('/', publicRoutes); 
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/pipeline', pipelineRoutes);  // NEW
app.use('/api/audit', auditRoutes);  
app.use('/api/application-forms', applicationFormRoutes);  // ADD THIS

const mongoose = require('mongoose');

app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState; // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  res.status(200).json({ 
    status: 'OK', 
    message: 'Server is running',
    version: '2.0.0',
    features: ['ATS Pipeline', 'Audit Logging', 'Kanban Board'],
    db: {
      readyState: dbState,
      connected: dbState === 1
    }
  });
});

// Ensure captureRequestMetadata is applied consistently
app.use(captureMetadata);

// Error handling middleware 
app.use(errorHandler);

module.exports = app;


