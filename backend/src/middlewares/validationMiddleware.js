// src/middlewares/validationMiddleware.js
// Middleware genérico y reutilizable: revisa si las reglas de validación de express-validator
// (definidas en cada archivo de rutas con body()/param()/etc.) encontraron algún error, y si es
// así, corta la petición aquí mismo con un 400 — el controlador nunca llega a ejecutarse con
// datos inválidos.

const { validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // errors.array() da un arreglo con un objeto por cada campo que falló, incluyendo
    // en qué campo fue y qué regla no cumplió — útil para que el frontend muestre el error exacto.
    return res.status(400).json({
      message: 'Datos inválidos',
      errors: errors.array().map((err) => ({ field: err.path, message: err.msg })),
    });
  }

  next();
};

module.exports = { validate };
