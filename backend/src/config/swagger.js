// src/config/swagger.js
// Configuración de Swagger/OpenAPI: genera la documentación interactiva de la API a partir de
// comentarios JSDoc (@openapi) escritos directamente en los archivos de rutas.

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SIVET CLOUD API',
      version: '1.0.0',
      description:
        'API REST del Sistema de Gestión Veterinaria en la Nube (SIVET CLOUD) — proyecto de grado SENA. ' +
        'Incluye Auth, Veterinarios, Pacientes, Citas, Historial Médico y Estadísticas, con RBAC de 3 roles ' +
        '(ADMIN, VET, CLIENT) y aislamiento de datos por usuario (tenant isolation).',
    },
    servers: [{ url: 'http://localhost:5000/api', description: 'Servidor local de desarrollo' }],
    // Define el esquema de seguridad "Bearer Token" una sola vez aquí; cada endpoint documentado
    // que lo necesite solo referencia "bearerAuth" (ver ejemplo en authRoutes.js).
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  // Archivos donde swagger-jsdoc busca los comentarios /** @openapi ... */ para construir la doc.
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = swaggerSpec;
