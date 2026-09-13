// src/models/Veterinarian.js
// Modelo de Veterinario: representa al personal médico que puede ser asignado a citas.

const mongoose = require('mongoose');

const veterinarianSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre del veterinario es obligatorio'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'El correo es obligatorio'],
      unique: true, // No puede haber dos veterinarios registrados con el mismo correo
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: [true, 'El teléfono es obligatorio'],
      trim: true,
    },
    specialty: {
      type: String,
      required: [true, 'La especialidad es obligatoria'],
      trim: true, // Ej: "Medicina general", "Cirugía", "Dermatología veterinaria"
    },
    licenseNumber: {
      type: String,
      required: [true, 'El número de tarjeta profesional es obligatorio'],
      unique: true, // Identificador único del veterinario a nivel profesional
      trim: true,
    },
    active: {
      type: Boolean,
      default: true, // Permite "desactivar" un veterinario (baja lógica) sin borrar su historial de citas asociadas
    },
  },
  {
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
  }
);

module.exports = mongoose.model('Veterinarian', veterinarianSchema);
