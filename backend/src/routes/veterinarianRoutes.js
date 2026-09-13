// src/routes/veterinarianRoutes.js
// Define los endpoints CRUD de Veterinarios. Módulo administrativo de uso exclusivo interno:
// lectura permitida a ADMIN y VET; escritura (crear/editar/eliminar) restringida solo a ADMIN.

const express = require('express');
const router = express.Router();
const { param, body } = require('express-validator');
const {
  getVeterinarians,
  getVeterinarianById,
  createVeterinarian,
  updateVeterinarian,
  deleteVeterinarian,
} = require('../controllers/veterinarianController');
const { protect, requireRole } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validationMiddleware');

// Regla reutilizada en toda ruta con ":id": exige que sea un ObjectId de Mongo válido (24 caracteres
// hexadecimales), ANTES de que el controlador intente usarlo en una consulta. Esto evita el error
// crudo de Mongoose "Cast to ObjectId failed" que vimos al probar el PDF con un ID de ejemplo sin reemplazar.
const validateIdParam = [param('id').isMongoId().withMessage('El ID no tiene un formato válido'), validate];

// Reglas del body para crear/actualizar un veterinario. Se usan las mismas en POST y PUT porque
// el frontend siempre envía el objeto completo al editar (no actualizaciones parciales).
const validateVeterinarianBody = [
  body('name').trim().notEmpty().withMessage('El nombre es obligatorio'),
  body('email').isEmail().withMessage('El correo no es válido').normalizeEmail(),
  body('phone').trim().notEmpty().withMessage('El teléfono es obligatorio'),
  body('specialty').trim().notEmpty().withMessage('La especialidad es obligatoria'),
  body('licenseNumber').trim().notEmpty().withMessage('El número de tarjeta profesional es obligatorio'),
  validate,
];

/**
 * @openapi
 * /veterinarians:
 *   get:
 *     summary: Listar veterinarios (paginado)
 *     tags: [Veterinarios]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200: { description: Lista paginada de veterinarios }
 *       403: { description: Rol sin permiso (solo ADMIN y VET) }
 */
router.get('/', protect, requireRole('ADMIN', 'VET'), getVeterinarians);

/**
 * @openapi
 * /veterinarians/{id}:
 *   get:
 *     summary: Obtener un veterinario por ID
 *     tags: [Veterinarios]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Veterinario encontrado }
 *       404: { description: Veterinario no encontrado }
 */
router.get('/:id', protect, requireRole('ADMIN', 'VET'), validateIdParam, getVeterinarianById);

/**
 * @openapi
 * /veterinarians:
 *   post:
 *     summary: Crear un veterinario (solo ADMIN)
 *     tags: [Veterinarios]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, phone, specialty, licenseNumber]
 *             properties:
 *               name: { type: string, example: "Dra. Laura Gómez" }
 *               email: { type: string, example: "laura.gomez@sivetcloud.com" }
 *               phone: { type: string, example: "3109876543" }
 *               specialty: { type: string, example: "Medicina general" }
 *               licenseNumber: { type: string, example: "TP-12345" }
 *     responses:
 *       201: { description: Veterinario creado }
 *       400: { description: Datos inválidos }
 *       403: { description: Rol sin permiso (solo ADMIN) }
 */
router.post('/', protect, requireRole('ADMIN'), validateVeterinarianBody, createVeterinarian);

/**
 * @openapi
 * /veterinarians/{id}:
 *   put:
 *     summary: Actualizar un veterinario (solo ADMIN)
 *     tags: [Veterinarios]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               phone: { type: string }
 *               specialty: { type: string }
 *               licenseNumber: { type: string }
 *     responses:
 *       200: { description: Veterinario actualizado }
 *       404: { description: Veterinario no encontrado }
 */
router.put('/:id', protect, requireRole('ADMIN'), validateIdParam, validateVeterinarianBody, updateVeterinarian);

/**
 * @openapi
 * /veterinarians/{id}:
 *   delete:
 *     summary: Eliminar un veterinario (solo ADMIN)
 *     tags: [Veterinarios]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Veterinario eliminado }
 *       404: { description: Veterinario no encontrado }
 */
router.delete('/:id', protect, requireRole('ADMIN'), validateIdParam, deleteVeterinarian);

module.exports = router;
