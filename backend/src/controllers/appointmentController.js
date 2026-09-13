// src/controllers/appointmentController.js
// Controlador para el CRUD de Citas. Relaciona Patient y Veterinarian mediante sus ObjectId.

const Appointment = require('../models/Appointment');
const Patient = require('../models/Patient');
const Veterinarian = require('../models/Veterinarian');

// @desc    Obtener lista paginada de citas (con datos del paciente y veterinario "poblados")
// @route   GET /api/appointments?page=1&limit=10
// @access  Privado (requiere Bearer Token)
const getAppointments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filtro de pertenencia (tenant isolation): Appointment no tiene un campo "owner" propio,
    // solo referencia a Patient. Así que si es CLIENT, primero buscamos los IDs de SUS pacientes,
    // y filtramos las citas por esos IDs. ADMIN y VET no reciben ningún filtro (ven todo).
    let filter = {};
    if (req.user.role === 'CLIENT') {
      const ownedPatients = await Patient.find({ owner: req.user.id }).select('_id');
      const ownedPatientIds = ownedPatients.map((p) => p._id);
      filter = { patient: { $in: ownedPatientIds } };
    }

    // Filtro opcional por estado (?status=pendiente), combinado con el de pertenencia de arriba.
    if (req.query.status) {
      filter.status = req.query.status;
    }

    const total = await Appointment.countDocuments(filter);

    const appointments = await Appointment.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ date: -1 })
      // populate reemplaza el ObjectId por los datos reales del documento relacionado,
      // seleccionando solo los campos útiles para no sobrecargar la respuesta.
      .populate('patient', 'name species ownerName ownerPhone')
      .populate('veterinarian', 'name specialty');

    res.status(200).json({
      data: appointments,
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener las citas', error: error.message });
  }
};

// @desc    Obtener una cita por ID
// @route   GET /api/appointments/:id
// @access  Privado
const getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      // Incluimos "owner" en el select del patient poblado: lo necesitamos para verificar
      // pertenencia abajo, aunque no se muestre directamente al frontend.
      .populate('patient', 'name species ownerName ownerPhone owner')
      .populate('veterinarian', 'name specialty');

    if (!appointment) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    // Si es CLIENT, la cita solo es visible si el paciente asociado le pertenece.
    if (req.user.role === 'CLIENT') {
      const belongsToClient =
        appointment.patient && appointment.patient.owner && appointment.patient.owner.toString() === req.user.id;

      if (!belongsToClient) {
        return res.status(404).json({ message: 'Cita no encontrada' });
      }
    }

    res.status(200).json(appointment);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la cita', error: error.message });
  }
};

// @desc    Crear una nueva cita
// @route   POST /api/appointments
// @access  Privado
const createAppointment = async (req, res) => {
  try {
    const { patient, veterinarian } = req.body;

    // Validamos que el paciente y el veterinario referenciados realmente existan en la base de datos,
    // antes de crear la cita. Esto evita citas "huérfanas" apuntando a IDs inexistentes.
    const patientExists = await Patient.findById(patient);
    if (!patientExists) {
      return res.status(404).json({ message: 'El paciente indicado no existe' });
    }

    const veterinarianExists = await Veterinarian.findById(veterinarian);
    if (!veterinarianExists) {
      return res.status(404).json({ message: 'El veterinario indicado no existe' });
    }

    const appointment = await Appointment.create(req.body);
    res.status(201).json(appointment);
  } catch (error) {
    res.status(400).json({ message: 'Error al crear la cita', error: error.message });
  }
};

// @desc    Actualizar una cita existente (ej. cambiar estado, fecha o notas)
// @route   PUT /api/appointments/:id
// @access  Privado
const updateAppointment = async (req, res) => {
  try {
    // Filtro de pertenencia también en escritura: si es CLIENT, la cita solo se puede actualizar
    // si el paciente asociado le pertenece. Mismo criterio 404 (no 403) que usamos en Patient,
    // para no revelar que el ID existe pero es de otra persona.
    if (req.user.role === 'CLIENT') {
      const existing = await Appointment.findById(req.params.id).populate('patient', 'owner');
      const belongsToClient =
        existing && existing.patient && existing.patient.owner && existing.patient.owner.toString() === req.user.id;

      if (!belongsToClient) {
        return res.status(404).json({ message: 'Cita no encontrada' });
      }
    }

    const appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!appointment) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    res.status(200).json(appointment);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar la cita', error: error.message });
  }
};

// @desc    Eliminar (cancelar definitivamente) una cita
// @route   DELETE /api/appointments/:id
// @access  Privado
const deleteAppointment = async (req, res) => {
  try {
    // Mismo filtro de pertenencia que en updateAppointment.
    if (req.user.role === 'CLIENT') {
      const existing = await Appointment.findById(req.params.id).populate('patient', 'owner');
      const belongsToClient =
        existing && existing.patient && existing.patient.owner && existing.patient.owner.toString() === req.user.id;

      if (!belongsToClient) {
        return res.status(404).json({ message: 'Cita no encontrada' });
      }
    }

    const appointment = await Appointment.findByIdAndDelete(req.params.id);

    if (!appointment) {
      return res.status(404).json({ message: 'Cita no encontrada' });
    }

    res.status(200).json({ message: 'Cita eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar la cita', error: error.message });
  }
};

module.exports = {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  deleteAppointment,
};
