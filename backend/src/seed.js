// src/seed.js
// Script de datos de prueba: llena la base de datos con usuarios (de los 3 roles), veterinarios,
// pacientes, citas e historiales de ejemplo — para no depender de crear todo a mano antes de una demo.
//
// Uso (ejecutar dentro de "backend"):
//   node src/seed.js       -> Inserta los datos de ejemplo
//   node src/seed.js -d    -> BORRA TODO el contenido de las 5 colecciones (Users, Veterinarians,
//                             Patients, Appointments, MedicalRecords). ¡Usar con cuidado! No hay
//                             confirmación ni forma de deshacerlo.

const dotenv = require('dotenv');
const connectDB = require('./config/db');

const User = require('./models/User');
const Veterinarian = require('./models/Veterinarian');
const Patient = require('./models/Patient');
const Appointment = require('./models/Appointment');
const MedicalRecord = require('./models/MedicalRecord');

dotenv.config();
connectDB();

const seedData = async () => {
  try {
    // ---------- Usuarios (uno de cada rol, más un segundo CLIENT para probar tenant isolation) ----------
    const admin = await User.create({
      name: 'Admin SIVET',
      email: 'admin@sivetcloud.com',
      password: '123456',
      role: 'ADMIN',
    });

    const vetUser = await User.create({
      name: 'Dra. Laura Gómez',
      email: 'laura.gomez@sivetcloud.com',
      password: '123456',
      role: 'VET',
    });

    const client1 = await User.create({
      name: 'Carlos Pérez',
      email: 'carlos.perez@example.com',
      password: '123456',
      role: 'CLIENT',
    });

    const client2 = await User.create({
      name: 'María Torres',
      email: 'maria.torres@example.com',
      password: '123456',
      role: 'CLIENT',
    });

    // ---------- Veterinarios (entidad de negocio; independiente del usuario VET de arriba) ----------
    const vet1 = await Veterinarian.create({
      name: 'Dra. Laura Gómez',
      email: 'laura.gomez@sivetcloud.com',
      phone: '3109876543',
      specialty: 'Medicina general',
      licenseNumber: 'TP-12345',
    });

    const vet2 = await Veterinarian.create({
      name: 'Dr. Andrés Ruiz',
      email: 'andres.ruiz@sivetcloud.com',
      phone: '3201234567',
      specialty: 'Cirugía',
      licenseNumber: 'TP-67890',
    });

    // ---------- Pacientes (repartidos entre los dos CLIENT, para poder probar tenant isolation) ----------
    const firulais = await Patient.create({
      name: 'Firulais',
      species: 'Perro',
      breed: 'Labrador',
      weight: 22,
      ownerName: 'Carlos Pérez',
      ownerPhone: '3001234567',
      owner: client1._id,
    });

    const rocky = await Patient.create({
      name: 'Rocky',
      species: 'Perro',
      breed: 'Bulldog Francés',
      weight: 12,
      ownerName: 'Carlos Pérez',
      ownerPhone: '3001234567',
      owner: client1._id,
    });

    const michi = await Patient.create({
      name: 'Michi',
      species: 'Gato',
      breed: 'Mestizo',
      weight: 4.2,
      ownerName: 'María Torres',
      ownerPhone: '3009876543',
      owner: client2._id,
    });

    // ---------- Citas ----------
    await Appointment.create([
      {
        patient: firulais._id,
        veterinarian: vet1._id,
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // en 2 días
        reason: 'Vacunación anual',
        status: 'pendiente',
      },
      {
        patient: michi._id,
        veterinarian: vet2._id,
        date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        reason: 'Control general',
        status: 'confirmada',
      },
      {
        patient: rocky._id,
        veterinarian: vet1._id,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // hace 3 días
        reason: 'Revisión de piel',
        status: 'completada',
      },
    ]);

    // ---------- Historiales médicos ----------
    await MedicalRecord.create([
      {
        patient: rocky._id,
        veterinarian: vet1._id,
        diagnosis: 'Dermatitis leve',
        treatment: 'Baño medicado y crema tópica',
        weight: 12,
        medications: ['Crema Dermovet', 'Shampoo antialérgico'],
      },
      {
        patient: firulais._id,
        veterinarian: vet1._id,
        diagnosis: 'Chequeo general sin hallazgos',
        treatment: 'Ninguno, paciente sano',
        weight: 22,
        medications: [],
      },
    ]);

    console.log('✅ Datos de prueba insertados correctamente.\n');
    console.log('Credenciales de prueba (contraseña para todas: "123456"):');
    console.log(`  ADMIN:  ${admin.email}`);
    console.log(`  VET:    ${vetUser.email}`);
    console.log(`  CLIENT: ${client1.email}  (dueño de Firulais y Rocky)`);
    console.log(`  CLIENT: ${client2.email}  (dueña de Michi)`);
    process.exit();
  } catch (error) {
    console.error('❌ Error al insertar los datos de prueba:', error.message);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await User.deleteMany();
    await Veterinarian.deleteMany();
    await Patient.deleteMany();
    await Appointment.deleteMany();
    await MedicalRecord.deleteMany();

    console.log('🗑️  Todas las colecciones fueron vaciadas.');
    process.exit();
  } catch (error) {
    console.error('❌ Error al borrar los datos:', error.message);
    process.exit(1);
  }
};

// process.argv es ['node', 'ruta/al/script', ...argumentos]. Revisamos si se pasó "-d".
if (process.argv[2] === '-d') {
  destroyData();
} else {
  seedData();
}
