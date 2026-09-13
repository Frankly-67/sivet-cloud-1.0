// src/models/Patient.js
// Modelo de Paciente: representa a la mascota atendida en la clínica, junto con los datos de su propietario.

const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre de la mascota es obligatorio'],
      trim: true,
    },
    species: {
      type: String,
      required: [true, 'La especie es obligatoria'], // Ej: "Perro", "Gato", "Ave", "Roedor"
      trim: true,
    },
    breed: {
      type: String,
      trim: true,
      default: 'No especificada', // La raza no siempre se conoce (ej. mascotas mestizas)
    },
    birthDate: {
      type: Date,
      // Opcional: permite calcular la edad exacta en el frontend en vez de guardarla fija
    },
    weight: {
      type: Number, // Peso en kilogramos, útil para dosis de medicamentos
      min: [0, 'El peso no puede ser negativo'],
    },
    ownerName: {
      type: String,
      required: [true, 'El nombre del propietario es obligatorio'],
      trim: true,
    },
    ownerPhone: {
      type: String,
      required: [true, 'El teléfono del propietario es obligatorio'],
      trim: true,
    },
    ownerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    // Referencia real al usuario (rol CLIENT) dueño de esta mascota. Es distinta de los campos
    // ownerName/ownerPhone/ownerEmail de arriba (esos son texto libre, útiles para pacientes
    // registrados por la clínica sin cuenta propia); "owner" es la relación formal que permite
    // filtrar por pertenencia (tenant isolation) cuando un CLIENT consulta sus propias mascotas.
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El paciente debe estar asociado a un usuario dueño (CLIENT)'],
    },
    active: {
      type: Boolean,
      default: true, // Baja lógica: permite desactivar un paciente sin perder su historial de citas
    },
  },
  {
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
  }
);

module.exports = mongoose.model('Patient', patientSchema);
