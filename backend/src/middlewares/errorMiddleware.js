// src/middlewares/errorMiddleware.js
// Manejo centralizado de errores: reemplaza el formato disperso e inconsistente de cada
// try/catch por un solo lugar que da formato uniforme a cualquier error, y un manejador
// para rutas que no existen (404).

// notFound: se coloca DESPUÉS de todas las rutas montadas en server.js. Si una petición llega
// hasta aquí, significa que ninguna ruta coincidió — construimos un error y lo pasamos con
// next(error) para que lo procese errorHandler (en vez de responder aquí mismo).
const notFound = (req, res, next) => {
  const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// errorHandler: middleware de ERROR (4 parámetros: err, req, res, next). Express lo reconoce como
// manejador de errores únicamente por tener esta firma exacta, sin importar cómo se llame la función.
// Debe ir al FINAL de todos los app.use()/rutas en server.js, después incluso de "notFound".
const errorHandler = (err, req, res, next) => {
  // Si algún código ya fijó un status distinto de 200 antes de lanzar el error (ej. notFound puso 404),
  // lo respetamos. Si no, asumimos 500 (error interno) por defecto.
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    message: err.message || 'Error interno del servidor',
    // El stack trace de depuración solo se envía fuera de producción, para no filtrar detalles
    // internos del servidor (rutas de archivos, librerías usadas, etc.) a un cliente real.
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

module.exports = { notFound, errorHandler };
