// src/routes/medicalRecordRoutes.js
// Define los endpoints CRUD de Historial Médico. Módulo compartido: lectura (incluida la descarga
// de PDF) para ADMIN, VET y CLIENT, filtrada por tenant isolation en el controlador; escritura
// restringida a ADMIN y VET.

const express = require('express');
const router = express.Router();
const { param, body } = require('express-validator');
const {
  getMedicalRecords,
  getMedicalRecordById,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
  generateMedicalRecordPDF,
} = require('../controllers/medicalRecordController');
const { protect, requireRole } = require('../middlewares/authMiddleware');
const { validate } = require('../middlewares/validationMiddleware');

// Regla reutilizada en toda ruta con ":id": exige un ObjectId de Mongo válido antes de tocar la BD.
// Esto es justo lo que habría evitado el error crudo de Mongoose que vimos al probar el PDF
// con un ID de ejemplo sin reemplazar.
const validateIdParam = [param('id').isMongoId().withMessage('El ID no tiene un formato válido'), validate];

// Reglas del body para crear/actualizar un historial médico.
const validateMedicalRecordBody = [
  body('patient').isMongoId().withMessage('El paciente indicado no tiene un formato de ID válido'),
  body('veterinarian').isMongoId().withMessage('El veterinario indicado no tiene un formato de ID válido'),
  body('diagnosis').trim().notEmpty().withMessage('El diagnóstico es obligatorio'),
  body('treatment').trim().notEmpty().withMessage('El tratamiento aplicado es obligatorio'),
  body('weight').isFloat({ min: 0 }).withMessage('El peso debe ser un número positivo'),
  // "medications" es opcional (el modelo lo deja como arreglo vacío por defecto), pero si llega,
  // debe ser una lista — no un string suelto ni un número.
  body('medications').optional().isArray().withMessage('Los medicamentos deben enviarse como una lista'),
  validate,
];

/**
 * @openapi
 * /medical-records:
 *   get:
 *     summary: Listar historiales médicos (paginado). Un CLIENT solo ve los de sus mascotas
 *     tags: [Historial Médico]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200: { description: Lista paginada de historiales médicos }
 */
router.get('/', protect, requireRole('ADMIN', 'VET', 'CLIENT'), getMedicalRecords);

/**
 * @openapi
 * /medical-records/{id}/pdf:
 *   get:
 *     summary: Descargar la historia clínica en PDF (stream directo, no se guarda en disco)
 *     tags: [Historial Médico]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Archivo PDF de la historia clínica
 *         content:
 *           application/pdf:
 *             schema: { type: string, format: binary }
 *       404: { description: Historial no encontrado (o no pertenece al usuario) }
 */
router.get('/:id/pdf', protect, requireRole('ADMIN', 'VET', 'CLIENT'), validateIdParam, generateMedicalRecordPDF);

/**
 * @openapi
 * /medical-records/{id}:
 *   get:
 *     summary: Obtener un historial médico por ID
 *     tags: [Historial Médico]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Historial encontrado }
 *       404: { description: Historial no encontrado (o no pertenece al usuario) }
 */
router.get('/:id', protect, requireRole('ADMIN', 'VET', 'CLIENT'), validateIdParam, getMedicalRecordById);

/**
 * @openapi
 * /medical-records:
 *   post:
 *     summary: Crear un historial médico (solo ADMIN/VET)
 *     tags: [Historial Médico]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [patient, veterinarian, diagnosis, treatment, weight]
 *             properties:
 *               patient: { type: string, description: "ObjectId del paciente" }
 *               veterinarian: { type: string, description: "ObjectId del veterinario" }
 *               diagnosis: { type: string, example: "Otitis leve en oído derecho" }
 *               treatment: { type: string, example: "Limpieza y gotas óticas" }
 *               weight: { type: number, example: 22.5 }
 *               medications:
 *                 type: array
 *                 items: { type: string }
 *                 example: ["Otibiotic gotas", "Meloxicam 1.5mg"]
 *     responses:
 *       201: { description: Historial creado }
 *       400: { description: Datos inválidos, o patient/veterinarian inexistentes }
 *       403: { description: Rol sin permiso (solo ADMIN y VET) }
 */
router.post('/', protect, requireRole('ADMIN', 'VET'), validateMedicalRecordBody, createMedicalRecord);

/**
 * @openapi
 * /medical-records/{id}:
 *   put:
 *     summary: Actualizar un historial médico (solo ADMIN/VET)
 *     tags: [Historial Médico]
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
 *               diagnosis: { type: string }
 *               treatment: { type: string }
 *               weight: { type: number }
 *               medications:
 *                 type: array
 *                 items: { type: string }
 *     responses:
 *       200: { description: Historial actualizado }
 *       404: { description: Historial no encontrado }
 */
router.put(
  '/:id',
  protect,
  requireRole('ADMIN', 'VET'),
  validateIdParam,
  validateMedicalRecordBody,
  updateMedicalRecord
);

/**
 * @openapi
 * /medical-records/{id}:
 *   delete:
 *     summary: Eliminar un historial médico (solo ADMIN/VET)
 *     tags: [Historial Médico]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Historial eliminado }
 *       404: { description: Historial no encontrado }
 */
router.delete('/:id', protect, requireRole('ADMIN', 'VET'), validateIdParam, deleteMedicalRecord);

module.exports = router;
