// src/routes/statsRoutes.js
// Define el endpoint de Estadísticas. Módulo administrativo interno: solo ADMIN y VET
// (un CLIENT no debe ver el total de pacientes del negocio ni cuántas citas hay pendientes hoy).

const express = require('express');
const router = express.Router();
const { getDashboardStats } = require('../controllers/statsController');
const { protect, requireRole } = require('../middlewares/authMiddleware');

/**
 * @openapi
 * /stats:
 *   get:
 *     summary: Resumen numérico del dashboard (solo ADMIN/VET, no visible para CLIENT)
 *     tags: [Estadísticas]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Totales del negocio
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalPatients: { type: integer, example: 12 }
 *                 pendingAppointmentsToday: { type: integer, example: 3 }
 *                 activeVeterinarians: { type: integer, example: 2 }
 *       403: { description: Rol sin permiso (CLIENT no ve estadísticas del negocio) }
 */
router.get('/', protect, requireRole('ADMIN', 'VET'), getDashboardStats);

module.exports = router;
