// src/server.js
// Punto de entrada de la aplicación: configura Express, conecta la base de datos y levanta el servidor.

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const veterinarianRoutes = require('./routes/veterinarianRoutes');
const patientRoutes = require('./routes/patientRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const medicalRecordRoutes = require('./routes/medicalRecordRoutes');
const statsRoutes = require('./routes/statsRoutes');
const { notFound, errorHandler } = require('./middlewares/errorMiddleware');
const { generalLimiter } = require('./middlewares/rateLimitMiddleware');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

// Carga las variables definidas en el archivo .env hacia process.env (debe ir antes de usar cualquier process.env.*)
dotenv.config();

// Establece la conexión con MongoDB Atlas antes de que el servidor empiece a recibir peticiones
connectDB();

// Inicializa la aplicación Express
const app = express();

// Helmet agrega automáticamente varias cabeceras HTTP de seguridad recomendadas
// (ej. evita que el navegador adivine el tipo de contenido, oculta qué framework corre el servidor, etc.)
app.use(helmet());

// Middleware CORS: permite que el frontend (Vanilla JS, corriendo en otro origen/puerto) consuma esta API
app.use(cors());

// Middleware para parsear automáticamente los bodies JSON entrantes (necesario para leer req.body en los controladores)
app.use(express.json());

// Limitador general de peticiones: aplica a toda la API montada después de esta línea.
app.use(generalLimiter);

// Ruta de prueba temporal, solo para verificar visualmente que el servidor y la conexión responden.
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'SIVET CLOUD API funcionando correctamente' });
});

// Documentación interactiva de la API (Swagger UI), generada a partir de los comentarios @openapi
// en los archivos de rutas. Sin autenticación propia — es documentación pública del API, no datos.
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Montamos las rutas del módulo de Autenticación bajo el prefijo /api/auth
app.use('/api/auth', authRoutes);

// Montamos las rutas del módulo de Veterinarios bajo el prefijo /api/veterinarians (protegidas)
app.use('/api/veterinarians', veterinarianRoutes);

// Montamos las rutas del módulo de Pacientes bajo el prefijo /api/patients (protegidas)
app.use('/api/patients', patientRoutes);

// Montamos las rutas del módulo de Citas bajo el prefijo /api/appointments (protegidas)
app.use('/api/appointments', appointmentRoutes);

// Montamos las rutas del módulo de Historial Médico bajo el prefijo /api/medical-records (protegidas)
app.use('/api/medical-records', medicalRecordRoutes);

// Montamos la ruta del endpoint de Estadísticas bajo el prefijo /api/stats (protegida)
app.use('/api/stats', statsRoutes);

// A partir de aquí, SOLO manejo de errores — deben ir en este orden y al final de todo:
// 1) notFound: captura cualquier petición que no coincidió con ninguna ruta de arriba.
// 2) errorHandler: dará formato a ese error (y a cualquier otro que llegue por next(error)).
app.use(notFound);
app.use(errorHandler);

// Puerto tomado de las variables de entorno, con 5000 como valor de respaldo si no está definido
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
