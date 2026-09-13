// src/controllers/medicalRecordController.js
// Controlador para el CRUD de Historial Médico. Relaciona Patient y Veterinarian mediante sus ObjectId.

const PDFDocument = require('pdfkit');
const MedicalRecord = require('../models/MedicalRecord');
const Patient = require('../models/Patient');
const Veterinarian = require('../models/Veterinarian');

// @desc    Obtener lista paginada de historiales médicos (con patient/veterinarian poblados)
// @route   GET /api/medical-records?page=1&limit=10
// @access  Privado (requiere Bearer Token)
const getMedicalRecords = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Filtro de pertenencia (tenant isolation): igual que en Appointments, MedicalRecord no tiene
    // un campo "owner" propio, solo referencia a Patient. Si es CLIENT, primero buscamos los IDs
    // de SUS pacientes, y filtramos los historiales por esos IDs. ADMIN y VET ven todo.
    let filter = {};
    if (req.user.role === 'CLIENT') {
      const ownedPatients = await Patient.find({ owner: req.user.id }).select('_id');
      const ownedPatientIds = ownedPatients.map((p) => p._id);
      filter = { patient: { $in: ownedPatientIds } };
    }

    const total = await MedicalRecord.countDocuments(filter);

    const records = await MedicalRecord.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }) // Los más recientes primero
      .populate('patient', 'name species ownerName')
      .populate('veterinarian', 'name specialty');

    res.status(200).json({
      data: records,
      page,
      limit,
      totalItems: total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los historiales médicos', error: error.message });
  }
};

// @desc    Obtener un historial médico por ID
// @route   GET /api/medical-records/:id
// @access  Privado
const getMedicalRecordById = async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id)
      // Incluimos "owner" en el select de patient para poder verificar pertenencia abajo
      .populate('patient', 'name species ownerName owner')
      .populate('veterinarian', 'name specialty');

    if (!record) {
      return res.status(404).json({ message: 'Historial médico no encontrado' });
    }

    // Si es CLIENT, el historial solo es visible si el paciente asociado le pertenece.
    // 404 (no 403) a propósito, para no revelar que el ID existe pero es de otra persona.
    if (req.user.role === 'CLIENT') {
      const belongsToClient =
        record.patient && record.patient.owner && record.patient.owner.toString() === req.user.id;

      if (!belongsToClient) {
        return res.status(404).json({ message: 'Historial médico no encontrado' });
      }
    }

    res.status(200).json(record);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener el historial médico', error: error.message });
  }
};

// @desc    Crear un nuevo historial médico
// @route   POST /api/medical-records
// @access  Privado
const createMedicalRecord = async (req, res) => {
  try {
    const { patient, veterinarian } = req.body;

    // Igual que en Appointments: validamos que las referencias existan antes de crear el registro,
    // para evitar historiales "huérfanos" apuntando a IDs inexistentes.
    const patientExists = await Patient.findById(patient);
    if (!patientExists) {
      return res.status(404).json({ message: 'El paciente indicado no existe' });
    }

    const veterinarianExists = await Veterinarian.findById(veterinarian);
    if (!veterinarianExists) {
      return res.status(404).json({ message: 'El veterinario indicado no existe' });
    }

    const record = await MedicalRecord.create(req.body);
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ message: 'Error al crear el historial médico', error: error.message });
  }
};

// @desc    Actualizar un historial médico existente
// @route   PUT /api/medical-records/:id
// @access  Privado
const updateMedicalRecord = async (req, res) => {
  try {
    const record = await MedicalRecord.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!record) {
      return res.status(404).json({ message: 'Historial médico no encontrado' });
    }

    res.status(200).json(record);
  } catch (error) {
    res.status(400).json({ message: 'Error al actualizar el historial médico', error: error.message });
  }
};

// @desc    Eliminar un historial médico
// @route   DELETE /api/medical-records/:id
// @access  Privado
const deleteMedicalRecord = async (req, res) => {
  try {
    const record = await MedicalRecord.findByIdAndDelete(req.params.id);

    if (!record) {
      return res.status(404).json({ message: 'Historial médico no encontrado' });
    }

    res.status(200).json({ message: 'Historial médico eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el historial médico', error: error.message });
  }
};

// @desc    Generar la historia clínica de un registro en PDF y transmitirla directo por la respuesta HTTP
// @route   GET /api/medical-records/:id/pdf
// @access  Privado
const generateMedicalRecordPDF = async (req, res) => {
  try {
    // Aquí sí necesitamos los datos completos de patient/veterinarian (no solo name/species como en
    // el listado), porque el PDF muestra teléfono del propietario, especialidad, licencia, etc.
    const record = await MedicalRecord.findById(req.params.id)
      .populate('patient')
      .populate('veterinarian');

    if (!record) {
      return res.status(404).json({ message: 'Historial médico no encontrado' });
    }

    // Filtro de pertenencia: un CLIENT solo puede descargar el PDF de un historial de SU propia
    // mascota. Sin esto, cualquier CLIENT podría descargar la historia clínica de cualquier otra
    // persona con solo conocer o adivinar el ID — exactamente el tipo de fuga que evita "protect".
    if (req.user.role === 'CLIENT') {
      const belongsToClient =
        record.patient && record.patient.owner && record.patient.owner.toString() === req.user.id;

      if (!belongsToClient) {
        return res.status(404).json({ message: 'Historial médico no encontrado' });
      }
    }

    // Cabeceras HTTP: le decimos al cliente (Postman, navegador) que esto es un PDF.
    // "inline" permite visualizarlo directamente en vez de forzar la descarga.
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=historia-clinica-${record._id}.pdf`);

    const doc = new PDFDocument({ margin: 50 });

    // CLAVE: conectamos el documento directamente al stream de la respuesta (res) con .pipe().
    // PDFKit va generando y enviando bytes al cliente a medida que los produce — el archivo nunca
    // se guarda en el disco del servidor, ni siquiera temporalmente.
    doc.pipe(res);

    // ---- Encabezado con la identidad de SIVET CLOUD ----
    doc.fontSize(20).fillColor('#0d7c66').text('SIVET CLOUD', { align: 'left' });
    doc.fontSize(10).fillColor('#6b7280').text('Sistema de Gestión Veterinaria', { align: 'left' });
    doc.moveDown(1);
    doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    doc.fontSize(16).fillColor('#111827').text('Historia Clínica Veterinaria', { align: 'center' });
    doc.moveDown(1.5);

    // ---- Datos del paciente ----
    // Usamos optional chaining por si el Patient referenciado fue borrado después de crear el historial
    doc.fontSize(12).fillColor('#111827').text('Datos del paciente', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#374151');
    doc.text(`Nombre: ${record.patient?.name || 'No disponible'}`);
    doc.text(`Especie: ${record.patient?.species || 'No disponible'}`);
    doc.text(`Raza: ${record.patient?.breed || 'No especificada'}`);
    doc.text(`Propietario: ${record.patient?.ownerName || 'No disponible'}`);
    doc.text(`Teléfono del propietario: ${record.patient?.ownerPhone || 'No disponible'}`);
    doc.moveDown(1);

    // ---- Datos del veterinario que atendió ----
    doc.fontSize(12).fillColor('#111827').text('Atendido por', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#374151');
    doc.text(`Veterinario: ${record.veterinarian?.name || 'No disponible'}`);
    doc.text(`Especialidad: ${record.veterinarian?.specialty || 'No disponible'}`);
    doc.text(`Nº Tarjeta profesional: ${record.veterinarian?.licenseNumber || 'No disponible'}`);
    doc.moveDown(1);

    // ---- Detalle clínico de la consulta ----
    doc.fontSize(12).fillColor('#111827').text('Detalle de la consulta', { underline: true });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#374151');
    doc.text(`Fecha: ${new Date(record.createdAt).toLocaleDateString('es-CO', { dateStyle: 'long' })}`);
    doc.text(`Peso registrado: ${record.weight} kg`);
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').text('Diagnóstico:');
    doc.font('Helvetica').text(record.diagnosis);
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').text('Tratamiento aplicado:');
    doc.font('Helvetica').text(record.treatment);
    doc.moveDown(0.5);

    doc.font('Helvetica-Bold').text('Medicamentos recetados:');
    doc.font('Helvetica').text(
      record.medications && record.medications.length > 0 ? record.medications.join(', ') : 'Ninguno'
    );
    doc.moveDown(2);

    // ---- Pie de página ----
    doc.fontSize(8).fillColor('#9ca3af').text(
      `Documento generado automáticamente por SIVET CLOUD el ${new Date().toLocaleString('es-CO')}`,
      { align: 'center' }
    );

    // .end() cierra el documento: dispara la escritura de los últimos bytes al stream y finaliza la respuesta.
    // No hay res.send() ni res.json() en este controlador — la respuesta se completa a través del stream.
    doc.end();
  } catch (error) {
    // Nota: esto solo funciona si el error ocurre ANTES de haber empezado a escribir el stream
    // (ej. el registro no existe). Si el error ocurriera a mitad de la generación, los headers ya
    // estarían enviados y no se podría cambiar a una respuesta JSON — es una limitación conocida
    // del enfoque por streaming, aceptable para el alcance de este PMV.
    res.status(500).json({ message: 'Error al generar el PDF', error: error.message });
  }
};

module.exports = {
  getMedicalRecords,
  getMedicalRecordById,
  createMedicalRecord,
  updateMedicalRecord,
  deleteMedicalRecord,
  generateMedicalRecordPDF,
};
