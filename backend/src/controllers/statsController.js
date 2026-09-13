// src/controllers/statsController.js
// Controlador de Estadísticas: devuelve un resumen numérico para la vista principal del dashboard.
// No tiene modelo propio: consulta datos ya existentes de Patient, Veterinarian y Appointment.

const Patient = require('../models/Patient');
const Veterinarian = require('../models/Veterinarian');
const Appointment = require('../models/Appointment');

// @desc    Obtener resumen numérico: total de pacientes, citas pendientes de hoy, veterinarios activos
// @route   GET /api/stats
// @access  Privado (requiere Bearer Token)
const getDashboardStats = async (req, res) => {
  try {
    // Calculamos el rango exacto de "hoy" (00:00:00.000 a 23:59:59.999) para filtrar las citas
    // por fecha correctamente, sin importar a qué hora del día se consulte este endpoint.
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // Promise.all ejecuta las 3 consultas en paralelo (más rápido que esperarlas una tras otra,
    // ya que ninguna depende del resultado de otra).
    const [totalPatients, pendingAppointmentsToday, activeVeterinarians] = await Promise.all([
      // Total de pacientes registrados (histórico completo, sin filtrar por estado)
      Patient.countDocuments(),

      // Citas cuyo estado es "pendiente" Y cuya fecha cae dentro del día de hoy
      Appointment.countDocuments({
        status: 'pendiente',
        date: { $gte: startOfToday, $lte: endOfToday },
      }),

      // Solo veterinarios marcados como activos (campo "active" del modelo Veterinarian)
      Veterinarian.countDocuments({ active: true }),
    ]);

    res.status(200).json({
      totalPatients,
      pendingAppointmentsToday,
      activeVeterinarians,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener las estadísticas', error: error.message });
  }
};

module.exports = { getDashboardStats };
