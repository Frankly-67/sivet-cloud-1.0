// src/models/User.js
// Modelo de Usuario administrador, utilizado por el módulo de Autenticación (registro y login).

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'El correo es obligatorio'],
      unique: true, // Evita que se registren dos usuarios con el mismo correo
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    },
    role: {
      type: String,
      enum: ['ADMIN', 'VET', 'CLIENT'], // ADMIN: dueño de clínica. VET: médico. CLIENT: dueño de mascota.
      default: 'CLIENT', // El registro público (POST /api/auth/register) crea clientes; ADMIN y VET se provisionan aparte
    },
  },
  {
    timestamps: true, // Agrega automáticamente createdAt y updatedAt a cada documento
  }
);

// Middleware "pre-save": encripta la contraseña automáticamente antes de guardar el documento,
// pero solo si el campo password fue modificado (evita re-encriptar en cada actualización del usuario).
//
// IMPORTANTE: esta función es "async" (devuelve una promesa), así que NO recibe ni debe llamar
// a un callback "next". Mongoose espera a que la promesa se resuelva para continuar con el guardado.
// Mezclar async/await con next() es la causa típica del error "next is not a function".
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Método de instancia: compara la contraseña en texto plano (la que llega en el login)
// contra el hash guardado en la base de datos. Se usará en el controlador de Auth.
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
