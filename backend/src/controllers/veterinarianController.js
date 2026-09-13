// src/controllers/veterinarianController.js
// Controlador para el CRUD de Veterinarios. El método de listado (GET) implementa paginación obligatoria.

const Veterinarian = require('../models/Veterinarian');

// @desc    Obtener lista paginada de veterinarios
// @route   GET /api/veterinarians?page=1&limit=10
// @access  Privado (requiere Bearer Token)
const getVeterinarians = async (req, res) => {
  try {
    // Leemos page y limit desde los query params; si no llegan, usamos valores por defecto
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit; // Cantidad de documentos a saltar según la página solicitada

    // Filtro de búsqueda opcional (?search=laura): coincidencia parcial, sin distinguir
    // mayúsculas/minúsculas, en el nombre O la especialidad.
    const filter = {};
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [{ name: searchRegex }, { specialty: searchRegex }];
    }

    // countDocuments cuenta el total de registros (ya filtrados) para calcular cuántas páginas existen
    const total = await Veterinarian.countDocuments(filter);

    const veterinarians = await Veterinarian.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Los más recientes primero

    res.status(200).json({
      data: veterinarians,
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los veterinarios', error: error.message });
  }
};

// @desc    Obtener un veterinario por ID
// @route   GET /api/veterinarians/:id
// @access  Privado
const getVeterinarianById = async (req, res) => {
  try {
    const veterinarian = await Veterinarian.findById(req.params.id);

    if (!veterinarian) {
      return res.status(404).json({ message: 'Veterinario no encontrado' });
    }

    res.status(200).json(veterinarian);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el veterinario', error: error.message });
  }
};

// @desc    Crear un nuevo veterinario
// @route   POST /api/veterinarians
// @access  Privado
const createVeterinarian = async (req, res) => {
  try {
    const veterinarian = await Veterinarian.create(req.body);
    res.status(201).json(veterinarian);
  } catch (error) {
    res.status(400).json({ message: 'Error al crear el veterinario', error: error.message });
  }
};

// @desc    Actualizar un veterinario existente
// @route   PUT /api/veterinarians/:id
// @access  Privado
const updateVeterinarian = async (req, res) => {
  try {
    const veterinarian = await Veterinarian.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // Devuelve el documento ya actualizado, no el original
      runValidators: true, // Vuelve a aplicar las validaciones del schema sobre los nuevos datos
    });

    if (!veterinarian) {
      return res.status(404).json({ message: 'Veterinario no encontrado' });
    }

    res.status(200).json(veterinarian);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar el veterinario', error: error.message });
  }
};

// @desc    Eliminar un veterinario
// @route   DELETE /api/veterinarians/:id
// @access  Privado
const deleteVeterinarian = async (req, res) => {
  try {
    const veterinarian = await Veterinarian.findByIdAndDelete(req.params.id);

    if (!veterinarian) {
      return res.status(404).json({ message: 'Veterinario no encontrado' });
    }

    res.status(200).json({ message: 'Veterinario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el veterinario', error: error.message });
  }
};

module.exports = {
  getVeterinarians,
  getVeterinarianById,
  createVeterinarian,
  updateVeterinarian,
  deleteVeterinarian,
};
