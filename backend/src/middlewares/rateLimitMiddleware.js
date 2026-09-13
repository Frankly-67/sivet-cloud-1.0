// src/middlewares/rateLimitMiddleware.js
// Limitadores de tasa (rate limiting): protegen contra ataques de fuerza bruta y abuso de la API,
// bloqueando temporalmente a una IP que hace demasiadas peticiones en poco tiempo.

const rateLimit = require('express-rate-limit');

// Limitador general: aplica a TODA la API. Bastante permisivo — solo frena abuso evidente
// (ej. un script descontrolado), no afecta el uso normal de la aplicación.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Ventana de 15 minutos
  max: 200, // Máximo 200 peticiones por IP en esa ventana
  message: { message: 'Demasiadas peticiones desde esta IP. Intenta de nuevo más tarde.' },
  standardHeaders: true, // Incluye la info del límite en los headers estándar RateLimit-*
  legacyHeaders: false, // Desactiva los headers X-RateLimit-* antiguos (redundantes)
});

// Limitador estricto: SOLO para /api/auth (login y registro), el objetivo típico de un ataque
// de fuerza bruta (probar miles de contraseñas contra una cuenta). Mucho más restrictivo.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Máximo 10 intentos de login/registro por IP cada 15 minutos
  message: { message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en unos minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { generalLimiter, authLimiter };
