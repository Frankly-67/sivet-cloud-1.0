// src/routes/appointmentRoutes.js
// Define los endpoints CRUD de Citas. Módulo compartido: lectura para ADMIN, VET y CLIENT
// (filtrada por tenant isolation en el controlador); escritura restringida a ADMIN y VET.

const express = require('express');
const router = express.Router();
const { param, body } = require('express-validator');
const {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} = require('../controllers/appointmentController');
const { protect, requireRole } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validationMiddleware');

// Regla reutilizada en toda ruta con ":id": exige un ObjectId de Mongo válido antes de tocar la BD.
const validateIdParam = [param('id').isMongoId().withMessage('El ID no tiene un formato válido'), validate];

// Reglas del body para crear/actualizar una cita.
const validateAppointmentBody = [
  body('patient').isMongoId().withMessage('El paciente indicado no tiene un formato de ID válido'),
  body('veterinarian').isMongoId().withMessage('El veterinario indicado no tiene un formato de ID válido'),
  body('date').isISO8601().withMessage('La fecha debe tener un formato válido'),
  body('reason').trim().notEmpty().withMessage('El motivo de la consulta es obligatorio'),
  // "status" es opcional: si no llega, el modelo le pone "pendiente" por defecto. Si llega,
  // debe ser uno de los 4 valores válidos del enum del modelo.
  body('status')
    .optional()
    .isIn(['pendiente', 'confirmada', 'completada', 'cancelada'])
    .withMessage('El estado no es válido'),
  validate,
];

/**
 * @openapi
 * /appointments:
 *   get:
 *     summary: Listar citas (paginado). Un CLIENT solo ve las de sus propias mascotas
 *     tags: [Citas]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200: { description: Lista paginada de citas, con patient/veterinarian poblados }
 */
router.get('/', protect, requireRole('ADMIN', 'VET', 'CLIENT'), getAppointments);

/**
 * @openapi
 * /appointments/{id}:
 *   get:
 *     summary: Obtener una cita por ID (404 si un CLIENT consulta una que no es de su mascota)
 *     tags: [Citas]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Cita encontrada }
 *       404: { description: Cita no encontrada (o no pertenece al usuario) }
 */
router.get('/:id', protect, requireRole('ADMIN', 'VET', 'CLIENT'), validateIdParam, getAppointmentById);

/**
 * @openapi
 * /appointments:
 *   post:
 *     summary: Agendar una cita (solo ADMIN/VET)
 *     tags: [Citas]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patient, veterinarian, date, reason]
 *             properties:
 *               patient: { type: string, description: "ObjectId del paciente" }
 *               veterinarian: { type: string, description: "ObjectId del veterinario" }
 *               date: { type: string, format: date-time, example: "2026-09-10T15:00:00.000Z" }
 *               reason: { type: string, example: "Vacunación anual" }
 *               status:
 *                 type: string
 *                 enum: [pendiente, confirmada, completada, cancelada]
 *                 default: pendiente
 *               notes: { type: string }
 *     responses:
 *       201: { description: Cita creada }
 *       400: { description: Datos inválidos, o patient/veterinarian inexistentes }
 *       403: { description: Rol sin permiso (solo ADMIN y VET agendan citas) }
 */
router.post('/', protect, requireRole('ADMIN', 'VET'), validateAppointmentBody, createAppointment);

/**
 * @openapi
 * /appointments/{id}:
 *   put:
 *     summary: Actualizar una cita (solo ADMIN/VET, ej. cambiar estado, fecha o notas)
 *     tags: [Citas]
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
 *               patient: { type: string }
 *               veterinarian: { type: string }
 *               date: { type: string, format: date-time }
 *               reason: { type: string }
 *               status: { type: string, enum: [pendiente, confirmada, completada, cancelada] }
 *               notes: { type: string }
 *     responses:
 *       200: { description: Cita actualizada }
 *       404: { description: Cita no encontrada }
 */
router.put('/:id', protect, requireRole('ADMIN', 'VET'), validateIdParam, validateAppointmentBody, updateAppointment);

/**
 * @openapi
 * /appointments/{id}:
 *   delete:
 *     summary: Eliminar una cita (solo ADMIN/VET)
 *     tags: [Citas]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Cita eliminada }
 *       404: { description: Cita no encontrada }
 */
router.delete('/:id', protect, requireRole('ADMIN', 'VET'), validateIdParam, deleteAppointment);

module.exports = router;
