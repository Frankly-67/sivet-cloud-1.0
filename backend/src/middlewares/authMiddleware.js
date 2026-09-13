// src/middlewares/authMiddleware.js
// Middleware que protege las rutas exigiendo un JSON Web Token válido en el header Authorization (Bearer Token).

const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  let token;

  // El token debe llegar en el header Authorization con el formato: "Bearer <token>"
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer')) {
    try {
      // Separamos la palabra "Bearer" del token real (authHeader = "Bearer eyJhbGciOi...")
      token = authHeader.split(' ')[1];

      // Verificamos el token contra el secreto definido en .env; lanza error si es inválido, fue alterado o expiró
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Guardamos los datos decodificados (id del usuario autenticado) en req.user
      // para que los controladores protegidos puedan usarlos si lo necesitan.
      req.user = decoded;

      next(); // Token válido: dejamos continuar la petición hacia el controlador correspondiente
    } catch (error) {
      return res.status(401).json({ message: 'No autorizado: token inválido o expirado' });
    }
  } else {
    // No llegó ningún header Authorization, o no tiene el formato "Bearer <token>"
    return res.status(401).json({ message: 'No autorizado: no se proporcionó un token' });
  }
};

// Middleware de autorización por rol (RBAC). SIEMPRE se usa DESPUÉS de "protect" en la cadena
// (ej. router.get('/ruta', protect, requireRole('ADMIN', 'VET'), controlador)), porque depende
// de que req.user ya exista con el rol decodificado del JWT.
//
// requireRole(...roles) es una función que RECIBE los roles permitidos y DEVUELVE el middleware
// real — por eso se usa como requireRole('ADMIN') y no requireRole(req, res, next).
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      // Esto solo pasaría si requireRole se usa SIN "protect" antes, o con un token viejo
      // emitido antes de que el JWT incluyera el campo "role" (ver nota en authController.js).
      return res.status(403).json({ message: 'No autorizado: no se pudo determinar el rol del usuario' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'No tienes permisos para realizar esta acción' });
    }

    next();
  };
};

module.exports = { protect, requireRole };
