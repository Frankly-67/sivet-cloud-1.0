// src/routes/patientRoutes.js
// Define los endpoints CRUD de Pacientes. Módulo compartido: lectura para ADMIN, VET y CLIENT
// (filtrada por tenant isolation en el controlador); escritura restringida a ADMIN y VET.

const express = require('express');
const router = express.Router();
const { param, body } = require('express-validator');
const {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
} = require('../controllers/patientController');
const { protect, requireRole } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validationMiddleware');

// Regla reutilizada en toda ruta con ":id": exige un ObjectId de Mongo válido antes de tocar la BD.
const validateIdParam = [param('id').isMongoId().withMessage('El ID no tiene un formato válido'), validate];

// Reglas del body para crear/actualizar un paciente. breed no se valida porque el modelo ya le
// pone un valor por defecto ("No especificada") si llega vacío.
const validatePatientBody = [
  body('name').trim().notEmpty().withMessage('El nombre de la mascota es obligatorio'),
  body('species').trim().notEmpty().withMessage('La especie es obligatoria'),
  body('weight')
    .optional({ checkFalsy: true })
    .isFloat({ min: 0 })
    .withMessage('El peso debe ser un número positivo'),
  body('ownerName').trim().notEmpty().withMessage('El nombre del propietario es obligatorio'),
  body('ownerPhone').trim().notEmpty().withMessage('El teléfono del propietario es obligatorio'),
  body('ownerEmail')
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage('El correo del propietario no es válido')
    .normalizeEmail(),
  // "owner" es obligatorio solo para ADMIN/VET (el controlador ya decide eso según el rol);
  // aquí solo comprobamos que, SI llega, tenga formato de ObjectId válido.
  body('owner').optional({ checkFalsy: true }).isMongoId().withMessage('El owner no tiene un formato de ID válido'),
  validate,
];

/**
 * @openapi
 * /patients:
 *   get:
 *     summary: Listar pacientes (paginado). Un CLIENT solo ve los suyos (tenant isolation)
 *     tags: [Pacientes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200: { description: Lista paginada de pacientes }
 */
router.get('/', protect, requireRole('ADMIN', 'VET', 'CLIENT'), getPatients);

/**
 * @openapi
 * /patients/{id}:
 *   get:
 *     summary: Obtener un paciente por ID (404 si un CLIENT consulta uno que no es suyo)
 *     tags: [Pacientes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paciente encontrado }
 *       404: { description: Paciente no encontrado (o no pertenece al usuario) }
 */
router.get('/:id', protect, requireRole('ADMIN', 'VET', 'CLIENT'), validateIdParam, getPatientById);

/**
 * @openapi
 * /patients:
 *   post:
 *     summary: Crear un paciente (solo ADMIN/VET; "owner" obligatorio y debe ser un CLIENT válido)
 *     tags: [Pacientes]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, species, ownerName, ownerPhone, owner]
 *             properties:
 *               name: { type: string, example: "Firulais" }
 *               species: { type: string, example: "Perro" }
 *               breed: { type: string, example: "Labrador" }
 *               weight: { type: number, example: 22 }
 *               ownerName: { type: string, example: "Carlos Pérez" }
 *               ownerPhone: { type: string, example: "3001234567" }
 *               ownerEmail: { type: string, example: "carlos.perez@example.com" }
 *               owner: { type: string, description: "ObjectId de un usuario con rol CLIENT" }
 *     responses:
 *       201: { description: Paciente creado }
 *       400: { description: Datos inválidos, o owner inexistente / no es CLIENT }
 *       403: { description: Rol sin permiso (CLIENT no puede crear pacientes) }
 */
router.post('/', protect, requireRole('ADMIN', 'VET'), validatePatientBody, createPatient);

/**
 * @openapi
 * /patients/{id}:
 *   put:
 *     summary: Actualizar un paciente (solo ADMIN/VET; "owner" no se puede reasignar por esta vía)
 *     tags: [Pacientes]
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
 *               species: { type: string }
 *               breed: { type: string }
 *               weight: { type: number }
 *               ownerName: { type: string }
 *               ownerPhone: { type: string }
 *               ownerEmail: { type: string }
 *     responses:
 *       200: { description: Paciente actualizado }
 *       404: { description: Paciente no encontrado }
 */
router.put('/:id', protect, requireRole('ADMIN', 'VET'), validateIdParam, validatePatientBody, updatePatient);

/**
 * @openapi
 * /patients/{id}:
 *   delete:
 *     summary: Eliminar un paciente (solo ADMIN/VET)
 *     tags: [Pacientes]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Paciente eliminado }
 *       404: { description: Paciente no encontrado }
 */
router.delete('/:id', protect, requireRole('ADMIN', 'VET'), validateIdParam, deletePatient);

module.exports = router;
