// src/controllers/authController.js
// Controlador para el módulo de Autenticación: registro y login de usuarios administradores.

const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Función auxiliar: genera un JSON Web Token firmado con el id y el ROL del usuario, válido por 1 día.
// Incluir el rol dentro del propio token es lo que permite a "requireRole" leerlo desde req.user
// en cada petición, sin tener que consultar la base de datos solo para saber quién es quién.
const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: '1d' });
};

// @desc    Registrar un nuevo usuario administrador
// @route   POST /api/auth/register
// @access  Público
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validación básica de campos obligatorios
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Nombre, correo y contraseña son obligatorios' });
    }

    // Verificamos que no exista ya un usuario registrado con ese correo
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'Ya existe un usuario registrado con ese correo' });
    }

    // Creamos el usuario; la contraseña se encripta automáticamente gracias al middleware pre('save') del modelo.
    // IMPORTANTE: fijamos role: 'CLIENT' explícitamente y a propósito ignoramos cualquier "role" que
    // llegue en req.body. Este endpoint es público (sin token, sin protect); si aceptáramos el rol
    // desde el body, cualquiera podría auto-registrarse como 'ADMIN' llamando directo a la API.
    // Las cuentas ADMIN y VET deberán crearse por otro medio (fuera del alcance de esta fase).
    const user = await User.create({ name, email, password, role: 'CLIENT' });

    // Respondemos con los datos del usuario (sin la contraseña) y un token para iniciar sesión de inmediato
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id, user.role),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al registrar el usuario', error: error.message });
  }
};

// @desc    Iniciar sesión de un usuario administrador
// @route   POST /api/auth/login
// @access  Público
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Correo y contraseña son obligatorios' });
    }

    // Buscamos al usuario por correo
    const user = await User.findOne({ email });

    // Verificamos que exista Y que la contraseña coincida (usando el método matchPassword del modelo)
    if (user && (await user.matchPassword(password))) {
      res.status(200).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id, user.role),
      });
    } else {
      // Mensaje genérico a propósito: no revelamos si falló el correo o la contraseña, por seguridad
      res.status(401).json({ message: 'Correo o contraseña incorrectos' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error al iniciar sesión', error: error.message });
  }
};

module.exports = { registerUser, loginUser };
