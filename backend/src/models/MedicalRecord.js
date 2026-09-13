// src/models/MedicalRecord.js
// Modelo de Historial Médico: registra cada consulta/diagnóstico de un paciente, relacionando
// al Patient (mascota) y al Veterinarian que la atendió.

const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema(
  {
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient', // Permite .populate('patient') para traer los datos completos de la mascota
      required: [true, 'El historial debe estar asociado a un paciente'],
    },
    veterinarian: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Veterinarian', // Permite .populate('veterinarian')
      required: [true, 'El historial debe estar asociado a un veterinario'],
    },
    diagnosis: {
      type: String,
      required: [true, 'El diagnóstico es obligatorio'],
      trim: true,
    },
    treatment: {
      type: String,
      required: [true, 'El tratamiento aplicado es obligatorio'],
      trim: true,
    },
    weight: {
      type: Number, // Peso del animal registrado en el momento de ESTA consulta (puede variar entre citas)
      required: [true, 'El peso del animal es obligatorio'],
      min: [0, 'El peso no puede ser negativo'],
    },
    medications: {
      type: [String], // Lista de medicamentos recetados, ej: ["Amoxicilina 250mg", "Meloxicam 1.5mg"]
      default: [],
    },
  },
  {
    timestamps: true, // createdAt funciona como "fecha de la consulta" registrada en el historial
  }
);

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
