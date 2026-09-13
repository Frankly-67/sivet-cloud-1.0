// src/controllers/patientController.js
// Controlador para el CRUD de Pacientes (mascotas). El método de listado (GET) implementa paginación obligatoria.

const Patient = require('../models/Patient');
const User = require('../models/User');

// @desc    Obtener lista paginada de pacientes
// @route   GET /api/patients?page=1&limit=10
// @access  Privado (requiere Bearer Token)
const getPatients = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filtro de pertenencia (tenant isolation): un CLIENT solo debe ver SUS propias mascotas.
    // ADMIN y VET ven el listado completo, sin restricción — por eso el filtro queda vacío ({}) para ellos.
    const filter = req.user.role === 'CLIENT' ? { owner: req.user.id } : {};

    // Filtro de búsqueda opcional (?search=firulais), combinado con el de arriba: coincidencia
    // parcial, sin distinguir mayúsculas/minúsculas, en el nombre de la mascota.
    if (req.query.search) {
      filter.name = new RegExp(req.query.search, 'i');
    }

    // countDocuments cuenta el total de registros (ya filtrados) para calcular cuántas páginas existen
    const total = await Patient.countDocuments(filter);

    const patients = await Patient.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    res.status(200).json({
      data: patients,
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los pacientes', error: error.message });
  }
};

// @desc    Obtener un paciente por ID
// @route   GET /api/patients/:id
// @access  Privado
const getPatientById = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);

    if (!patient) {
      return res.status(404).json({ message: 'Paciente no encontrado' });
    }

    // Si es CLIENT, además de existir, el paciente debe pertenecerle. Respondemos 404 (no 403)
    // a propósito, para no revelarle que ese ID existe pero es de otra persona.
    // El "!patient.owner" cubre el caso de pacientes viejos creados antes de este campo existir.
    if (req.user.role === 'CLIENT' && (!patient.owner || patient.owner.toString() !== req.user.id)) {
      return res.status(404).json({ message: 'Paciente no encontrado' });
    }

    res.status(200).json(patient);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el paciente', error: error.message });
  }
};

// @desc    Crear un nuevo paciente
// @route   POST /api/patients
// @access  Privado
const createPatient = async (req, res) => {
  try {
    let ownerId;

    if (req.user.role === 'CLIENT') {
      // Un CLIENT solo puede registrar mascotas para sí mismo: ignoramos cualquier "owner" que
      // llegue en el body (mismo principio que aplicamos con "role" en el registro público).
      ownerId = req.user.id;
    } else {
      // ADMIN o VET registran la mascota en nombre de un cliente real, así que SÍ deben indicar
      // el owner explícitamente en el body — y lo validamos, igual que ya hacemos con
      // patient/veterinarian en Appointments, para evitar referencias inválidas o a un no-CLIENT.
      ownerId = req.body.owner;

      if (!ownerId) {
        return res.status(400).json({ message: 'Debes indicar el owner (usuario CLIENT) al registrar el paciente' });
      }

      const ownerUser = await User.findById(ownerId);
      if (!ownerUser || ownerUser.role !== 'CLIENT') {
        return res.status(400).json({ message: 'El owner indicado no existe o no es un usuario con rol CLIENT' });
      }
    }

    const patient = await Patient.create({ ...req.body, owner: ownerId });
    res.status(201).json(patient);
  } catch (error) {
    res.status(400).json({ message: 'Error al crear el paciente', error: error.message });
  }
};

// @desc    Actualizar un paciente existente
// @route   PUT /api/patients/:id
// @access  Privado
const updatePatient = async (req, res) => {
  try {
    // Descartamos "owner" del body a propósito: reasignar el dueño de una mascota no debería
    // ser posible desde una actualización general (evita que alguien "robe" un paciente
    // cambiándole el owner por un PUT). Si algún día se necesita transferir una mascota entre
    // clientes, debería ser una acción explícita y controlada aparte, no un efecto secundario de editar.
    const { owner, ...updateData } = req.body;

    // Filtro de pertenencia también en escritura: si es CLIENT, primero confirmamos que el
    // paciente exista Y le pertenezca, antes de permitir el update. 404 (no 403) a propósito,
    // para no revelar que el ID pertenece a otra persona.
    if (req.user.role === 'CLIENT') {
      const existing = await Patient.findById(req.params.id);
      if (!existing || !existing.owner || existing.owner.toString() !== req.user.id) {
        return res.status(404).json({ message: 'Paciente no encontrado' });
      }
    }

    const patient = await Patient.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!patient) {
      return res.status(404).json({ message: 'Paciente no encontrado' });
    }

    res.status(200).json(patient);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar el paciente', error: error.message });
  }
};

// @desc    Eliminar un paciente
// @route   DELETE /api/patients/:id
// @access  Privado
const deletePatient = async (req, res) => {
  try {
    // Mismo filtro de pertenencia que en updatePatient: un CLIENT solo puede eliminar SU
    // propio paciente. ADMIN y VET no tienen esta restricción.
    if (req.user.role === 'CLIENT') {
      const existing = await Patient.findById(req.params.id);
      if (!existing || !existing.owner || existing.owner.toString() !== req.user.id) {
        return res.status(404).json({ message: 'Paciente no encontrado' });
      }
    }

    const patient = await Patient.findByIdAndDelete(req.params.id);

    if (!patient) {
      return res.status(404).json({ message: 'Paciente no encontrado' });
    }

    res.status(200).json({ message: 'Paciente eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el paciente', error: error.message });
  }
};

module.exports = {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient,
};
