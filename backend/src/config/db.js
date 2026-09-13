// src/config/db.js
// Módulo encargado de gestionar la conexión con la base de datos MongoDB Atlas usando Mongoose.

const mongoose = require('mongoose');

// Función asíncrona que establece la conexión con la base de datos.
// Se exporta para ser invocada una sola vez desde el punto de entrada del servidor (server.js).
const connectDB = async () => {
  try {
    // mongoose.connect recibe la URI definida en las variables de entorno (.env)
    // Desde Mongoose 6+ ya no son necesarias las opciones useNewUrlParser / useUnifiedTopology,
    // vienen habilitadas por defecto.
    const conn = await mongoose.connect(process.env.MONGODB_URI);

    // Si la conexión es exitosa, mostramos el host al que nos conectamos como confirmación visual en consola.
    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
  } catch (error) {
    // Si algo falla (URI incorrecta, credenciales inválidas, IP no autorizada en el Network Access de Atlas, etc.)
    // mostramos el error exacto y detenemos el proceso: sin base de datos, la API no debe seguir corriendo.
    console.error(`❌ Error al conectar con MongoDB: ${error.message}`);
    process.exit(1);
  }
};

// Exportamos la función para poder importarla y ejecutarla desde server.js
module.exports = connectDB;
