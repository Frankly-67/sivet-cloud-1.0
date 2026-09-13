# SIVET CLOUD - Documentación Técnica del Proyecto

**Desarrollador:** Frankly Giovanni Poveda Pinzón

**Programa:** Tecnología en Análisis y Desarrollo de Software (ADSO) - SENA — Ficha 3186693

**Tipo de Proyecto:** Plataforma de Gestión Veterinaria en la Nube (PMV de grado) — modelo híbrido B2B (panel administrativo interno) y B2C (portal de autoservicio para clientes)

# Introducción

SIVET CLOUD es una plataforma web para la gestión integral de una clínica veterinaria, con dos frentes de uso claramente diferenciados:

- **Panel administrativo interno**, para el personal de la clínica (administradores y veterinarios), que gestiona veterinarios, pacientes, citas médicas e historiales clínicos.
- **Portal de autoservicio para clientes**, donde el dueño de una mascota puede registrarse, iniciar sesión, consultar las citas y el historial médico de sus propias mascotas, y descargar la historia clínica en formato PDF.

El sistema fue construido bajo un patrón **MVC (Modelo–Vista–Ruta–Controlador)** estricto en el backend, con un modelo de seguridad de nivel profesional: autenticación mediante **JSON Web Tokens (JWT)**, contraseñas encriptadas con **bcrypt**, **control de acceso por roles (RBAC)** de tres niveles, y **aislamiento de datos por usuario (tenant isolation)**, de modo que cada cliente solo puede ver la información de sus propias mascotas.

El proyecto se desarrolla como trabajo de grado del programa Tecnología en Análisis y Desarrollo de Software (ADSO) del SENA.

# Objetivo General

Desarrollar un Producto Mínimo Viable (PMV) full-stack para la gestión veterinaria, con un backend seguro y documentado, y un frontend funcional conectado en tiempo real a la API.

# Objetivos Específicos

- Gestionar veterinarios (personal médico de la clínica).
- Gestionar pacientes (mascotas) y sus propietarios.
- Gestionar citas médicas, relacionadas con paciente y veterinario.
- Gestionar historiales médicos (diagnóstico, tratamiento, peso, medicamentos).
- Generar y exportar historias clínicas en PDF, transmitidas por *streaming* sin guardarse en el servidor.
- Implementar autenticación y control de acceso por roles (ADMIN, VET, CLIENT).
- Aislar los datos de cada cliente (tenant isolation), para que un dueño de mascota solo vea lo suyo.
- Ofrecer un portal de autoservicio para que los dueños de mascotas se registren y consulten su información.
- Documentar y exponer la API mediante Swagger/OpenAPI y una colección de Postman.

---

# Índice

- [Introducción](#introducción)
- [Objetivo General](#objetivo-general)
- [Objetivos Específicos](#objetivos-específicos)
- [Tecnologías Utilizadas](#tecnologías-utilizadas)
- [1. Fundamentación Arquitectónica](#1-fundamentación-arquitectónica)
- [2. Estructura del Proyecto](#2-estructura-del-proyecto)
- [3. Modelo de Datos](#3-modelo-de-datos)
- [4. Módulos y Endpoints de la API REST](#4-módulos-y-endpoints-de-la-api-rest)
- [5. Seguridad y Control de Acceso](#5-seguridad-y-control-de-acceso)
- [6. Registro de Operaciones y Resolución de Problemas](#6-registro-de-operaciones-y-resolución-de-problemas)
- [7. Protocolo de Ejecución del Proyecto](#7-protocolo-de-ejecución-del-proyecto)
- [8. Documentación y Pruebas de la API](#8-documentación-y-pruebas-de-la-api)
- [Historial de Avance del Proyecto](#historial-de-avance-del-proyecto)
- [Nota para el Desarrollador](#nota-para-el-desarrollador)
- [Licencia](#licencia)

---

# Tecnologías Utilizadas

| Área | Tecnología |
|------|------------|
| 🎨 Frontend | HTML5, CSS3, JavaScript (Vanilla), Tailwind CSS (vía CDN) |
| ⚙️ Backend | Node.js, Express.js |
| 🗄️ Base de Datos | MongoDB Atlas + Mongoose (ODM) |
| 🔐 Autenticación y Seguridad | JSON Web Tokens (JWT), bcryptjs, Helmet, express-rate-limit |
| ✅ Validación | express-validator |
| 📄 Generación de Documentos | PDFKit (streaming, sin persistencia en disco) |
| 🔄 Arquitectura de API | REST |
| 🧩 Patrón de Diseño | MVC (Modelo - Vista/Ruta - Controlador) |
| 📚 Documentación de API | Swagger / OpenAPI (swagger-jsdoc + swagger-ui-express) |
| 🧪 Pruebas de API | Postman (colección propia con 24 endpoints) |
| 🌐 Control de Versiones | Git, GitHub |
| 💻 Editor | Visual Studio Code |
| 📦 Gestor de Paquetes | npm |

---

# 1. Fundamentación Arquitectónica

Para la construcción de SIVET CLOUD se definió una **arquitectura cliente-servidor desacoplada**: el frontend es una aplicación estática (sin proceso de compilación ni framework) que consume una API REST independiente.

## Justificación Técnica

La separación entre frontend y backend permite que ambos evolucionen y se desplieguen de forma independiente. El frontend no depende de ningún paso de build (no hay `npm run dev` ni bundler): son archivos `.html`, `.css` y `.js` que se sirven directamente y consumen la API mediante `fetch()`.

## Base de Datos: MongoDB (NoSQL orientada a documentos)

Se eligió MongoDB (a través de Mongoose) por su flexibilidad para modelar entidades con estructura variable — por ejemplo, el campo `medications` de un historial médico es un arreglo de longitud libre, algo natural en un documento pero forzado en una tabla SQL tradicional. Las relaciones entre entidades (Paciente–Propietario, Cita–Paciente–Veterinario) se modelan mediante referencias (`ObjectId` + `ref`), pobladas con `.populate()` cuando se necesitan los datos completos.

## Seguridad como eje transversal del diseño

El proyecto no trata la seguridad como una capa añadida al final, sino como parte del diseño desde la base:

- **Autenticación stateless con JWT**: el servidor no guarda sesiones; cada petición prueba su identidad con un token firmado.
- **Contraseñas nunca almacenadas en texto plano**: se aplica un hash de un solo sentido (bcrypt) antes de guardar cualquier contraseña.
- **RBAC de 3 roles** (`ADMIN`, `VET`, `CLIENT`): cada endpoint declara explícitamente qué roles pueden acceder.
- **Tenant Isolation**: además de controlar *qué endpoints* puede llamar un rol, se controla *qué datos* ve dentro de ese endpoint — un `CLIENT` autenticado solo puede leer, editar o eliminar información asociada a sus propias mascotas.
- **Validación de entrada** (`express-validator`) en todos los endpoints de escritura, y validación de formato de `ObjectId` en todos los parámetros de ruta.
- **Helmet** y **rate limiting** como capas adicionales de endurecimiento (cabeceras HTTP seguras y límite de intentos de login, respectivamente).

## Generación de documentos por *streaming*

La exportación de historias clínicas en PDF (con **PDFKit**) se transmite directamente a la respuesta HTTP mediante `doc.pipe(res)`, sin que el archivo se guarde en ningún momento en el disco del servidor — ni siquiera de forma temporal.

---

# 2. Estructura del Proyecto

```text
sivet-cloud/
├── frontend/                    # Aplicación cliente (sin build, JS vanilla + Tailwind CDN)
│   ├── index.html               # Login
│   ├── register.html            # Registro público (crea usuarios CLIENT)
│   ├── dashboard.html           # Panel principal (ADMIN/VET) con estadísticas en vivo
│   ├── veterinarians.html       # CRUD de veterinarios
│   ├── patients.html            # CRUD de pacientes
│   ├── appointments.html        # CRUD de citas
│   ├── medical-records.html     # CRUD de historial médico + descarga de PDF
│   ├── portal.html              # Portal de solo lectura para CLIENT
│   ├── images/                  # logo.png, fondo.png
│   └── js/
│       ├── auth.js              # Login (redirección según rol)
│       ├── register.js          # Registro público
│       ├── dashboard.js         # Guardia de ruta + logout (reutilizado en todas las páginas admin)
│       ├── stats.js             # Tarjetas de estadísticas del dashboard
│       ├── veterinarians.js     # CRUD + modal + búsqueda
│       ├── patients.js          # CRUD + modal + búsqueda
│       ├── appointments.js      # CRUD + modal + filtro por estado
│       ├── medical-records.js   # CRUD + modal + descarga de PDF (Blob)
│       ├── portal.js            # Vista de solo lectura para CLIENT
│       ├── toast.js             # Sistema de notificaciones (reemplaza alert())
│       └── confirm.js           # Modal de confirmación (reemplaza confirm())
│
├── backend/                     # API REST y lógica de negocio
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js            # Conexión a MongoDB Atlas
│   │   │   └── swagger.js       # Configuración de Swagger/OpenAPI
│   │   ├── models/
│   │   │   ├── User.js          # Auth: name, email, password (hash), role
│   │   │   ├── Veterinarian.js
│   │   │   ├── Patient.js       # Incluye referencia obligatoria a "owner" (CLIENT)
│   │   │   ├── Appointment.js
│   │   │   └── MedicalRecord.js
│   │   ├── controllers/         # Lógica de negocio de cada entidad
│   │   ├── routes/               # Endpoints + middlewares aplicados
│   │   ├── middlewares/
│   │   │   ├── authMiddleware.js       # protect (JWT) + requireRole (RBAC)
│   │   │   ├── validationMiddleware.js # Resultado de express-validator
│   │   │   ├── errorMiddleware.js      # notFound + errorHandler centralizado
│   │   │   └── rateLimitMiddleware.js  # Límite general + límite estricto en Auth
│   │   ├── seed.js               # Script de datos de prueba (importar / -d para borrar)
│   │   └── server.js             # Punto de entrada: conecta DB y levanta el servidor
│   ├── .env                      # Variables de entorno (no versionado)
│   └── package.json
│
├── SIVET_CLOUD.postman_collection.json   # Colección de Postman (24 endpoints, 6 módulos)
│
└── README.md                     # Este documento
```

---

# 3. Modelo de Datos

Cinco entidades, todas con `timestamps` (`createdAt`/`updatedAt`) automáticos:

| Entidad | Campos clave | Relaciones |
|---|---|---|
| **User** | name, email, password (hash), role (`ADMIN` / `VET` / `CLIENT`) | — |
| **Veterinarian** | name, email, phone, specialty, licenseNumber, active | — |
| **Patient** | name, species, breed, weight, ownerName, ownerPhone, ownerEmail, **owner** | `owner` → User (rol CLIENT) |
| **Appointment** | date, reason, status (pendiente/confirmada/completada/cancelada), notes | `patient` → Patient, `veterinarian` → Veterinarian |
| **MedicalRecord** | diagnosis, treatment, weight, medications[] | `patient` → Patient, `veterinarian` → Veterinarian |

`Veterinarian` (la entidad de negocio, el médico) es independiente de `User` con rol `VET` (la cuenta de acceso al sistema): representan conceptos distintos y se modelan por separado a propósito.

---

# 4. Módulos y Endpoints de la API REST

Todos los endpoints están bajo el prefijo `/api`. La lista completa (24 endpoints) está documentada en Swagger (`/api-docs`) y en la colección de Postman incluida en el repositorio.

| Módulo | Endpoints | Acceso |
|---|---|---|
| **Auth** | `POST /auth/register`, `POST /auth/login` | Público |
| **Veterinarios** | `GET /veterinarians`, `GET /veterinarians/:id`, `POST`, `PUT /:id`, `DELETE /:id` | Lectura: ADMIN, VET · Escritura: solo ADMIN |
| **Pacientes** | `GET /patients`, `GET /patients/:id`, `POST`, `PUT /:id`, `DELETE /:id` | Lectura: ADMIN, VET, CLIENT (filtrada) · Escritura: ADMIN, VET |
| **Citas** | `GET /appointments`, `GET /appointments/:id`, `POST`, `PUT /:id`, `DELETE /:id` | Lectura: ADMIN, VET, CLIENT (filtrada) · Escritura: ADMIN, VET |
| **Historial Médico** | `GET /medical-records`, `GET /medical-records/:id`, `GET /medical-records/:id/pdf`, `POST`, `PUT /:id`, `DELETE /:id` | Lectura/PDF: ADMIN, VET, CLIENT (filtrada) · Escritura: ADMIN, VET |
| **Estadísticas** | `GET /stats` | Solo ADMIN, VET |

Todos los listados (`GET` de colección) implementan **paginación** obligatoria mediante los parámetros `page` y `limit`, respondiendo `data`, `page`, `limit`, `totalItems` y `totalPages`.

---

# 5. Seguridad y Control de Acceso

## Roles del sistema

| Rol | Descripción | Alcance |
|---|---|---|
| **ADMIN** | Dueño/administrador de la clínica | Acceso total a los 6 módulos |
| **VET** | Veterinario de la clínica | CRUD completo en Pacientes, Citas e Historial; solo lectura en Veterinarios; ve Estadísticas |
| **CLIENT** | Dueño de una mascota | Solo lectura (`GET`) en Pacientes, Citas e Historial, filtrada exclusivamente a sus propias mascotas |

## Flujo de autenticación

1. El registro público (`POST /auth/register`) crea siempre una cuenta con rol `CLIENT`, sin importar qué se envíe en el cuerpo de la petición — evita que alguien se autoasigne un rol privilegiado desde la API.
2. Las contraseñas se encriptan con **bcrypt** antes de guardarse (nunca en texto plano).
3. El login devuelve un **JWT** que incluye `{ id, role }` en su payload, firmado con una clave secreta (`JWT_SECRET`) definida en variables de entorno.
4. Cada endpoint protegido pasa por el middleware `protect` (verifica el token) y, cuando aplica, por `requireRole(...roles)` (verifica que el rol del usuario esté autorizado).

## Tenant Isolation (aislamiento de datos)

Independientemente del rol, los controladores de lectura filtran los resultados según el usuario autenticado: un `CLIENT` nunca recibe datos de pacientes, citas o historiales que no le pertenezcan, incluso si su rol tiene permiso para llamar el endpoint. Esta misma verificación se aplica también en las operaciones de actualización y eliminación de pacientes y citas.

---

# 6. Registro de Operaciones y Resolución de Problemas

Durante el desarrollo se presentaron los siguientes escenarios técnicos que requirieron diagnóstico y corrección:

### 6.1. Comandos de creación de carpetas en Windows

**Problema:** `mkdir -p` (sintaxis Unix) no es reconocido por defecto en el Símbolo del Sistema (CMD) de Windows.

**Solución:** se documentaron las variantes equivalentes para CMD (`mkdir carpeta\subcarpeta`) y PowerShell, y se recomendó Git Bash para mantener consistencia con los comandos Unix usados en el resto del proyecto.

### 6.2. Error `next is not a function` en el hook de encriptación de contraseña

**Problema:** el middleware `pre('save')` del modelo `User`, encargado de encriptar la contraseña con bcrypt, mezclaba una función `async` con la llamada manual a un callback `next()`, provocando el error `TypeError: next is not a function`.

**Solución:** se reescribió el hook como una función `async` pura, sin parámetro `next`, dejando que Mongoose detecte la finalización a través de la promesa devuelta — patrón recomendado en versiones recientes de Mongoose.

### 6.3. Colisión de variables entre scripts del frontend

**Problema:** al cargar dos archivos `<script>` planos en la misma página (`dashboard.js` y el script propio de cada módulo), ambos declaraban `const token`, generando `SyntaxError: Identifier 'token' has already been declared` y deteniendo por completo la ejecución del segundo script.

**Solución:** se renombró la variable a `authToken` en todos los scripts de módulo, evitando la colisión de nombres en el ámbito global compartido por los `<script>` no modulares.

### 6.4. Error de conversión de tipo (`Cast to ObjectId failed`)

**Problema:** al probar el endpoint de descarga de PDF en Postman con un marcador de posición sin reemplazar en la URL, Mongoose devolvió un error crudo de conversión de tipo (`500`), en lugar de una respuesta clara.

**Solución:** se incorporó `express-validator` con la regla `isMongoId()` sobre todos los parámetros `:id` de la API, devolviendo un `400` limpio y explicativo antes de que la petición llegue a la base de datos.

### 6.5. Incompatibilidad de datos tras ampliar el modelo de roles

**Problema:** al migrar el campo `role` de un único valor (`"admin"`, minúscula) a un enum de tres roles en mayúscula (`ADMIN`/`VET`/`CLIENT`), la cuenta administradora existente quedó con un valor fuera del nuevo enum. Mongoose no valida el enum en lecturas, solo en escrituras, por lo que el problema solo se manifestaba al intentar aplicar `requireRole('ADMIN')`.

**Solución:** corrección manual del valor en MongoDB Atlas, y emisión de un nuevo token (mediante un nuevo login) para que el JWT reflejara el rol corregido.

### 6.6. Referencia obligatoria rompiendo datos existentes

**Problema:** al añadir el campo `owner` (obligatorio) al modelo `Patient` para habilitar el aislamiento de datos, los pacientes creados antes de ese cambio quedaron sin dueño asignado, y las operaciones de creación/edición dejaron de funcionar hasta asignar dicho campo.

**Solución:** se desarrolló `src/seed.js`, un script de datos de prueba con modo de importación y modo de borrado (`-d`), que reconstruye un set de datos consistente (usuarios de los 3 roles, veterinarios, pacientes con `owner` asignado, citas e historiales) en un solo comando.

---

# 7. Protocolo de Ejecución del Proyecto

## Backend

```bash
cd backend
npm install
```

Crear el archivo `.env` con, al menos:

```text
PORT=5000
MONGODB_URI=<tu cadena de conexión de MongoDB Atlas>
JWT_SECRET=<una clave secreta larga y aleatoria>
```

Levantar el servidor (con recarga automática):

```bash
npx nodemon src/server.js
```

Si la conexión fue exitosa, la terminal debe mostrar:

```text
✅ MongoDB conectado: <host de tu cluster>
🚀 Servidor corriendo en el puerto 5000
```

### Datos de prueba (opcional)

```bash
node src/seed.js       # Inserta veterinarios, pacientes, citas e historiales de ejemplo
node src/seed.js -d    # Borra TODO el contenido de la base de datos (irreversible)
```

## Frontend

El frontend no requiere instalación ni proceso de compilación: son archivos estáticos. Basta con abrir `frontend/index.html` en el navegador (o servirlo con una extensión tipo *Live Server*), con el backend ya corriendo en `http://localhost:5000`.

---

# 8. Documentación y Pruebas de la API

- **Swagger / OpenAPI:** documentación interactiva disponible en `http://localhost:5000/api-docs` una vez el servidor está corriendo. Permite explorar y probar cada endpoint directamente desde el navegador.
- **Colección de Postman:** `SIVET_CLOUD.postman_collection.json`, con los 24 endpoints organizados en 6 carpetas (Auth, Veterinarios, Pacientes, Citas, Historial Médico, Estadísticas). Incluye variables (`base_url`, `token`) y scripts que capturan automáticamente el token tras iniciar sesión, para no tener que copiarlo manualmente en cada petición.

---

# Historial de Avance del Proyecto

| Etapa | Actividad | Estado |
|---|---|---|
| Fase 1 | Inicialización del backend (Node, Express, estructura MVC, Git) | ✅ |
| Fase 2 | Conexión a MongoDB Atlas | ✅ |
| Fase 3 | Modelos de datos (User, Veterinarian, Patient, Appointment) | ✅ |
| Fase 4 | Middleware de seguridad JWT (`protect`) | ✅ |
| Fase 5 | Módulo de Autenticación (registro/login) | ✅ |
| Fase 6 | CRUD de Veterinarios, Pacientes y Citas, con paginación | ✅ |
| Fase 7 | Frontend inicial (login, dashboard, CRUD) | ✅ |
| Fase 8 | Corrección de errores (bcrypt hook, colisión de variables) | ✅ |
| Fase 9 | Rediseño de interfaz con Tailwind CSS (sidebar, dashboard) | ✅ |
| Fase 10 | Arquitectura de modales, spinners y notificaciones *toast* | ✅ |
| Fase 11 | Módulo de Historial Médico | ✅ |
| Fase 12 | Endpoint de Estadísticas del dashboard | ✅ |
| Fase 13 | Exportación de historias clínicas en PDF (streaming) | ✅ |
| Fase 14 | RBAC de 3 roles (ADMIN, VET, CLIENT) | ✅ |
| Fase 15 | Tenant Isolation (aislamiento de datos por cliente) | ✅ |
| Fase 16 | Aplicación de roles en el enrutamiento completo | ✅ |
| Fase 17 | Portal de autoservicio para clientes (B2C) | ✅ |
| Fase 18 | Identidad visual (logo, favicon, fondo) | ✅ |
| Fase 19 | Validación de datos (`express-validator`) y manejo de errores centralizado | ✅ |
| Fase 20 | Endurecimiento de seguridad (Helmet, rate limiting) | ✅ |
| Fase 21 | Documentación con Swagger/OpenAPI | ✅ |
| Fase 22 | Colección de Postman completa | ✅ |
| Fase 23 | Script de datos de prueba (seed) | ✅ |
| Fase 24 | Búsqueda y filtros en los listados | ✅ |
| Fase 25 | Preparación de material de sustentación | ✅ |

---

# Nota para el Desarrollador

Este documento debe actualizarse a medida que el proyecto evolucione más allá de la sustentación. Se recomienda documentar cualquier cambio futuro siguiendo el mismo formato de esta sección:

- Nuevas decisiones arquitectónicas.
- Nuevas tecnologías incorporadas.
- Cambios estructurales del sistema.
- Problemas encontrados y su solución.
- Nuevos módulos o endpoints.

Posibles siguientes pasos, si el proyecto continúa después de la entrega académica:

- Pruebas automatizadas (Jest + Supertest).
- Notificaciones por correo electrónico (confirmación y recordatorio de citas).
- Refresh tokens para sesiones más duraderas.
- Despliegue en un entorno de producción (hosting del backend y del frontend).

---

# Licencia

Este proyecto fue desarrollado con fines académicos como requisito para optar al título de **Tecnólogo en Análisis y Desarrollo de Software (ADSO)** del **Servicio Nacional de Aprendizaje (SENA)**.

> **Última actualización:** documentación correspondiente a la entrega completa del PMV de SIVET CLOUD, incluyendo backend con RBAC y tenant isolation, frontend administrativo y portal de cliente, exportación de PDF, y documentación/pruebas de la API (Swagger + Postman).
