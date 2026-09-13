// src/routes/authRoutes.js
// Define los endpoints del módulo de Autenticación y los conecta con sus funciones del controlador.

const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { registerUser, loginUser } = require('../controllers/authController');
const { validate } = require('../middlewares/validationMiddleware');
const { authLimiter } = require('../middlewares/rateLimitMiddleware');

// Aplica el límite estricto (10 intentos / 15 min por IP) a TODAS las rutas de este router,
// ya que register y login son los dos objetivos típicos de un ataque de fuerza bruta.
router.use(authLimiter);

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Registrar un nuevo usuario (siempre se crea con rol CLIENT)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name:
 *                 type: string
 *                 example: Carlos Pérez
 *               email:
 *                 type: string
 *                 example: carlos.perez@example.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       201:
 *         description: Usuario creado correctamente, incluye el token JWT
 *       400:
 *         description: Datos inválidos o correo ya registrado
 *       429:
 *         description: Demasiados intentos desde esta IP
 */
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('El nombre es obligatorio'),
    body('email').isEmail().withMessage('El correo no es válido').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    validate,
  ],
  registerUser
);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Iniciar sesión y obtener un token JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: carlos.perez@example.com
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login exitoso, incluye el token JWT y el rol del usuario
 *       401:
 *         description: Correo o contraseña incorrectos
 *       429:
 *         description: Demasiados intentos desde esta IP
 */
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('El correo no es válido').normalizeEmail(),
    body('password').notEmpty().withMessage('La contraseña es obligatoria'),
    validate,
  ],
  loginUser
);

module.exports = router;
