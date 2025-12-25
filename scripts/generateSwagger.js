const swaggerJsDoc = require('swagger-jsdoc');
const fs = require('fs');

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Job Board API',
      version: '1.0.0'
    }
  },
  apis: ['./src/routes/*.js', './src/models/*.js']
};

const specs = swaggerJsDoc(swaggerOptions);
fs.writeFileSync('swagger-output.json', JSON.stringify(specs, null, 2));
console.log('swagger-output.json generated');
