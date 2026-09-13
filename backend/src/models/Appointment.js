// src/models/Appointment.js
// Modelo de Cita médica: relaciona un Patient (mascota) con un Veterinarian mediante referencias a sus ObjectId.

const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient', // Referencia al modelo Patient: permite hacer .populate('patient') para traer los datos completos de la mascota
      required: [true, 'La cita debe estar asociada a un paciente'],
    },
    veterinarian: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Veterinarian', // Referencia al modelo Veterinarian: permite .populate('veterinarian')
      required: [true, 'La cita debe estar asociada a un veterinario'],
    },
    date: {
      type: Date,
      required: [true, 'La fecha y hora de la cita son obligatorias'],
    },
    reason: {
      type: String,
      required: [true, 'El motivo de la consulta es obligatorio'], // Ej: "Vacunación", "Control general", "Cirugía menor"
      trim: true,
    },
    status: {
      type: String,
      enum: ['pendiente', 'confirmada', 'completada', 'cancelada'],
      default: 'pendiente', // Toda cita nace como "pendiente" hasta que se confirme o gestione
    },
    notes: {
      type: String,
      trim: true,
      default: '', // Notas u observaciones adicionales que el veterinario puede agregar tras la consulta
    },
  },
  {
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
  }
);

module.exports = mongoose.model('Appointment', appointmentSchema);
