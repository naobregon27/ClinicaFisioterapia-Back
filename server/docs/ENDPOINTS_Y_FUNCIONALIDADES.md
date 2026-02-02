# 📋 Documentación Completa de Endpoints y Funcionalidades

## 🏥 Sistema de Clínica Fisioterapia - Backend API

---

## 📊 Resumen General

Este sistema es una **API REST completa** para la gestión de una clínica de fisioterapia que incluye:

- ✅ **Autenticación y autorización** con JWT
- ✅ **Gestión de pacientes** completa
- ✅ **Registro de sesiones** de tratamiento
- ✅ **Sistema de pagos** (pacientes y personal)
- ✅ **Administración** de usuarios y sistema
- ✅ **Auditoría** de acciones
- ✅ **Estadísticas y reportes**

---

## 🔐 1. AUTENTICACIÓN Y USUARIOS

### Base URL: `/api/auth`

#### Endpoints Públicos

| Método | Endpoint | Descripción | Rate Limit |
|--------|----------|-------------|------------|
| `POST` | `/api/auth/register` | Registrar nuevo usuario | 5/hora |
| `POST` | `/api/auth/login` | Iniciar sesión | 10/15min |
| `POST` | `/api/auth/verify-email` | Verificar email con código | 3/hora |
| `POST` | `/api/auth/resend-verification` | Reenviar código de verificación | 3/hora |
| `POST` | `/api/auth/refresh-token` | Refrescar token de acceso | - |

#### Endpoints Protegidos (Requieren autenticación)

| Método | Endpoint | Descripción | Roles Permitidos |
|--------|----------|-------------|------------------|
| `POST` | `/api/auth/logout` | Cerrar sesión | Todos |
| `GET` | `/api/auth/me` | Obtener perfil del usuario actual | Todos |
| `PUT` | `/api/auth/update-profile` | Actualizar perfil | Todos |
| `PUT` | `/api/auth/change-password` | Cambiar contraseña | Todos |

### Funcionalidades de Autenticación

- ✅ Registro con verificación de email (código de 6 dígitos)
- ✅ Login con JWT (Access Token + Refresh Token)
- ✅ Bloqueo temporal tras 5 intentos fallidos
- ✅ Refresh token para renovar sesión sin re-login
- ✅ Gestión de perfil de usuario
- ✅ Cambio de contraseña seguro
- ✅ Sistema de roles: `administrador`, `empleado`, `usuario`

---

## 👥 2. GESTIÓN DE PACIENTES

### Base URL: `/api/pacientes`

**Todas las rutas requieren autenticación y roles: ADMIN, EMPLEADO, USUARIO**

| Método | Endpoint | Descripción | Query Params |
|--------|----------|-------------|--------------|
| `GET` | `/api/pacientes` | Listar todos los pacientes | `page`, `limit`, `estado`, `obraSocial` |
| `GET` | `/api/pacientes/buscar` | Búsqueda rápida de pacientes | `q` (nombre, apellido, DNI) |
| `GET` | `/api/pacientes/estadisticas/resumen` | Estadísticas de pacientes | - |
| `POST` | `/api/pacientes` | Crear nuevo paciente | - |
| `GET` | `/api/pacientes/:id` | Obtener paciente por ID | - |
| `PUT` | `/api/pacientes/:id` | Actualizar paciente completo | - |
| `PUT` | `/api/pacientes/:id/estado` | Actualizar solo el estado | - |
| `PUT` | `/api/pacientes/:id/alta` | Dar alta médica al paciente | - |

### Modelo de Datos - Paciente

```javascript
{
  // Datos Personales
  nombre, apellido, dni (único), fechaNacimiento, edad, genero
  
  // Contacto
  telefono, telefonoAlternativo, email
  
  // Dirección
  direccion: { calle, numero, barrio, ciudad, provincia, codigoPostal, referencia }
  
  // Obra Social
  obraSocial: { nombre, numeroAfiliado, plan, vigenciaDesde, vigenciaHasta }
  
  // Información Médica
  diagnostico: { principal, secundarios[], observaciones }
  medicoDerivante: { nombre, matricula, telefono, especialidad }
  antecedentes: { patologicos, quirurgicos, alergias, medicacion }
  contactoEmergencia: { nombre, relacion, telefono }
  
  // Estado y Tratamiento
  estado: ['activo', 'inactivo', 'alta', 'derivado', 'abandono']
  tratamiento: { cantidadTotalSesiones, fechaInicio, fechaFinEstimada, observaciones }
  
  // Pagos
  modalidadPago: ['efectivo', 'transferencia', 'tarjeta', 'obra_social', 'mixto']
  valorSesion: Number
  
  // Horarios y Documentos
  horariosHabituales: [{ dia, horaEntrada, horaSalida }]
  documentos: [{ tipo, nombre, url, fecha }]
  fotos: [{ descripcion, url, fecha }]
  
  // Estadísticas (calculadas automáticamente)
  estadisticas: { totalSesiones, totalAbonado, saldoPendiente, ultimaSesion }
  
  // Metadata
  creadoPor, modificadoPor, fechaAlta, fechaAltaMedica
}
```

### Funcionalidades de Pacientes

- ✅ CRUD completo de pacientes
- ✅ Búsqueda rápida por nombre, apellido o DNI
- ✅ Gestión de obra social y cobertura
- ✅ Historial médico completo (diagnóstico, antecedentes)
- ✅ Control de estado del paciente
- ✅ Alta médica con fecha
- ✅ Estadísticas automáticas (sesiones, pagos)
- ✅ Documentos y fotos de evolución
- ✅ Horarios habituales del paciente

---

## 📅 3. GESTIÓN DE SESIONES

### Base URL: `/api/sesiones`

**Todas las rutas requieren autenticación y roles: ADMIN, EMPLEADO, USUARIO**

| Método | Endpoint | Descripción | Query Params |
|--------|----------|-------------|--------------|
| `GET` | `/api/sesiones` | Listar todas las sesiones | `page`, `limit`, `fecha`, `estado`, `paciente` |
| `GET` | `/api/sesiones/planilla-diaria` | Planilla diaria de sesiones | `fecha` (YYYY-MM-DD) |
| `GET` | `/api/sesiones/estadisticas/resumen` | Estadísticas de sesiones | `fechaInicio`, `fechaFin` |
| `GET` | `/api/sesiones/pagos-pendientes` | Sesiones con pagos pendientes | - |
| `GET` | `/api/sesiones/paciente/:pacienteId` | Historial de sesiones de un paciente | - |
| `POST` | `/api/sesiones` | Registrar nueva sesión | - |
| `GET` | `/api/sesiones/:id` | Obtener sesión por ID | - |
| `PUT` | `/api/sesiones/:id` | Actualizar sesión completa | - |
| `PUT` | `/api/sesiones/:id/pago` | Registrar pago de sesión | - |
| `PUT` | `/api/sesiones/:id/planilla` | Actualizar desde planilla diaria | - |
| `PUT` | `/api/sesiones/:id/cancelar` | Cancelar sesión | - |

### Modelo de Datos - Sesión

```javascript
{
  // Relaciones
  paciente: ObjectId (ref: Paciente)
  profesional: ObjectId (ref: User)
  
  // Fecha y Horarios
  fecha: Date
  horaEntrada: String (HH:MM)
  horaSalida: String (HH:MM)
  duracion: Number (minutos, calculado automáticamente)
  numeroOrden: Number (orden del día)
  numeroSesion: Number (ej: 3 de 10)
  
  // Tipo y Detalles
  tipoSesion: ['presencial', 'domicilio', 'virtual', 'evaluacion', 'control']
  detallesTratamiento: {
    descripcion, tecnicas[], areas[], intensidad: ['leve', 'moderada', 'intensa']
  }
  
  // Evolución
  evolucion: {
    estadoGeneral: ['mejorado', 'estable', 'empeorado'],
    dolor: Number (0-10),
    movilidad: ['limitada', 'parcial', 'completa'],
    observaciones
  }
  
  // Pago
  pago: {
    monto: Number,
    metodoPago: ['efectivo', 'transferencia', 'tarjeta', 'obra_social', 'pendiente'],
    pagado: Boolean,
    comprobante: { numero, tipo, url },
    fechaPago: Date
  }
  
  // Estado
  estado: ['programada', 'realizada', 'cancelada', 'ausente', 'reprogramada']
  motivoCancelacion: String
  
  // Reprogramación
  sesionReprogramada: { fecha, sesionId }
  
  // Observaciones e Indicaciones
  observaciones: String
  indicaciones: String (para próxima sesión)
  
  // Archivos
  firma: { paciente, profesional }
  adjuntos: [{ tipo, descripcion, url, fecha }]
  
  // Próxima sesión
  proximaSesion: { fecha, observaciones }
  recordatorioEnviado: Boolean
  
  // Metadata
  modificadoPor: ObjectId
}
```

### Funcionalidades de Sesiones

- ✅ Registro completo de sesiones de tratamiento
- ✅ Planilla diaria con orden de atención
- ✅ Cálculo automático de duración
- ✅ Numeración automática de sesiones del paciente
- ✅ Registro de evolución (dolor, movilidad, estado)
- ✅ Detalles del tratamiento realizado
- ✅ Gestión de pagos por sesión
- ✅ Cancelación y reprogramación
- ✅ Historial completo por paciente
- ✅ Estadísticas de sesiones
- ✅ Listado de pagos pendientes
- ✅ Actualización desde planilla diaria
- ✅ Actualización automática de estadísticas del paciente

---

## 👨‍💼 4. ADMINISTRACIÓN

### Base URL: `/api/admin`

**Todas las rutas requieren autenticación y rol: ADMINISTRADOR**

### 4.1. Gestión de Usuarios

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/admin/usuarios` | Listar todos los usuarios | `page`, `limit`, `rol`, `estado`, `search` |
| `GET` | `/api/admin/usuarios/colaboradores` | Listar solo colaboradores | - |
| `POST` | `/api/admin/usuarios` | Crear nuevo usuario | - |
| `GET` | `/api/admin/usuarios/:id` | Obtener usuario por ID | - |
| `PUT` | `/api/admin/usuarios/:id` | Actualizar usuario | - |
| `DELETE` | `/api/admin/usuarios/:id` | Eliminar usuario | - |
| `PUT` | `/api/admin/usuarios/:id/password` | Cambiar contraseña de usuario | - |
| `PUT` | `/api/admin/usuarios/:id/rol` | Cambiar rol de usuario | - |
| `PUT` | `/api/admin/usuarios/:id/estado` | Cambiar estado de usuario | - |
| `PUT` | `/api/admin/usuarios/:id/desbloquear` | Desbloquear usuario bloqueado | - |

### 4.2. Auditoría

| Método | Endpoint | Descripción | Query Params |
|--------|----------|-------------|--------------|
| `GET` | `/api/admin/auditoria` | Listar acciones de auditoría | `page`, `limit`, `usuario`, `accion`, `recurso`, `fechaInicio`, `fechaFin` |
| `GET` | `/api/admin/auditoria/usuario/:usuarioId` | Acciones de un usuario específico | - |
| `GET` | `/api/admin/auditoria/estadisticas` | Estadísticas de auditoría | - |

### Tipos de Acciones Registradas

- `crear`, `actualizar`, `eliminar`
- `iniciar_sesion`, `cerrar_sesion`
- `verificar_email`, `cambiar_password`
- `cambiar_rol`, `cambiar_estado`
- `registrar_pago`, `dar_alta_medica`
- `cancelar_sesion`, `reprogramar_sesion`

### 4.3. Planilla de Pagos del Personal

| Método | Endpoint | Descripción | Query Params |
|--------|----------|-------------|--------------|
| `GET` | `/api/admin/pagos-personal` | Listar registros de pago | `page`, `limit`, `año`, `mes`, `semana` |
| `POST` | `/api/admin/pagos-personal` | Crear o actualizar pago | - |
| `POST` | `/api/admin/pagos-personal/multiples` | Crear múltiples pagos | - |
| `GET` | `/api/admin/pagos-personal/planilla` | Obtener planilla completa del mes | `año`, `mes` |
| `GET` | `/api/admin/pagos-personal/estadisticas` | Estadísticas de pagos | `año`, `mes` |
| `GET` | `/api/admin/pagos-personal/:id` | Obtener registro por ID | - |
| `PUT` | `/api/admin/pagos-personal/:id` | Actualizar registro | - |
| `DELETE` | `/api/admin/pagos-personal/:id` | Eliminar registro | - |

### Modelo de Datos - PagoPersonal

```javascript
{
  mes: Number (1-12)
  año: Number
  semana: Number (1-5)
  diaSemana: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
  fecha: Date
  
  monto: Number
  
  // Distribución automática (30%, 20%, 50%)
  distribucion: {
    farfan: Number (30%),
    mica: Number (20%),
    ffma: Number (50%)
  }
  
  observaciones: String
  estado: ['pendiente', 'procesado', 'pagado', 'cancelado']
  
  creadoPor, modificadoPor
}
```

### 4.4. Estadísticas del Sistema

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/admin/estadisticas` | Estadísticas generales del sistema | - |

### Funcionalidades de Administración

- ✅ Gestión completa de usuarios (CRUD)
- ✅ Cambio de roles y estados
- ✅ Desbloqueo de cuentas
- ✅ Sistema de auditoría completo
- ✅ Rastreo de todas las acciones del sistema
- ✅ Planilla de pagos del personal automatizada
- ✅ Distribución automática de pagos (30%, 20%, 50%)
- ✅ Estadísticas y reportes del sistema
- ✅ Filtros avanzados en todas las consultas

---

## 📊 5. ESTADÍSTICAS Y REPORTES

### Endpoints de Estadísticas

| Módulo | Endpoint | Descripción |
|--------|----------|-------------|
| Pacientes | `GET /api/pacientes/estadisticas/resumen` | Estadísticas de pacientes |
| Sesiones | `GET /api/sesiones/estadisticas/resumen` | Estadísticas de sesiones |
| Admin | `GET /api/admin/estadisticas` | Estadísticas generales del sistema |
| Auditoría | `GET /api/admin/auditoria/estadisticas` | Estadísticas de auditoría |
| Pagos Personal | `GET /api/admin/pagos-personal/estadisticas` | Estadísticas de pagos |

---

## 🔧 6. UTILIDADES Y CONFIGURACIÓN

### Health Check

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/health` | Verificar estado de la API |

### Ruta Raíz

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/` | Información de la API |

---

## 🗄️ 7. MODELOS DE DATOS

### Modelos Principales

1. **User** - Usuarios del sistema
2. **Paciente** - Pacientes de la clínica
3. **Sesion** - Sesiones de tratamiento
4. **Auditoria** - Registro de acciones
5. **PagoPersonal** - Planilla de pagos del personal

---

## 🔒 8. SEGURIDAD Y MIDDLEWARES

### Middlewares Implementados

- ✅ **Helmet** - Headers de seguridad HTTP
- ✅ **CORS** - Control de origen cruzado
- ✅ **Rate Limiting** - Límite de peticiones por IP
- ✅ **XSS Clean** - Protección contra XSS
- ✅ **HPP** - Protección contra HTTP Parameter Pollution
- ✅ **JWT Authentication** - Tokens de acceso y refresco
- ✅ **Bcrypt** - Encriptación de contraseñas
- ✅ **Validaciones** - Validación de datos de entrada
- ✅ **Auditoría** - Registro automático de acciones

### Rate Limits Específicos

- Registro: 5 intentos/hora
- Login: 10 intentos/15 minutos
- Email: 3 envíos/hora
- API general: 100 peticiones/15 minutos

---

## 📈 9. FUNCIONALIDADES AUTOMÁTICAS

### Cálculos Automáticos

- ✅ **Duración de sesión** - Calculada desde horaEntrada y horaSalida
- ✅ **Edad del paciente** - Calculada desde fechaNacimiento
- ✅ **Número de sesión** - Calculado automáticamente para cada paciente
- ✅ **Estadísticas del paciente** - Actualizadas automáticamente (totalSesiones, totalAbonado, saldoPendiente)
- ✅ **Distribución de pagos** - Calculada automáticamente (30%, 20%, 50%)
- ✅ **Fecha de pago** - Establecida automáticamente al marcar como pagado

---

## 🎯 10. SUGERENCIAS DE MEJORAS Y FUNCIONALIDADES FALTANTES

### 🔴 Funcionalidades Críticas Faltantes

1. **Recuperación de Contraseña**
   - Endpoint: `POST /api/auth/forgot-password`
   - Endpoint: `POST /api/auth/reset-password`
   - Envío de email con token de recuperación

2. **Notificaciones y Recordatorios**
   - Recordatorios automáticos de sesiones
   - Notificaciones de pagos pendientes
   - Alertas de citas próximas

3. **Reportes y Exportación**
   - Exportar pacientes a Excel/PDF
   - Exportar planilla diaria
   - Reportes mensuales de ingresos
   - Reportes de evolución de pacientes

4. **Calendario y Agendamiento**
   - Vista de calendario de sesiones
   - Agendamiento de sesiones futuras
   - Disponibilidad de profesionales
   - Conflictos de horarios

### 🟡 Funcionalidades Recomendadas

5. **Gestión de Obras Sociales**
   - CRUD de obras sociales
   - Validación de cobertura
   - Autorizaciones de sesiones

6. **Historial Clínico Completo**
   - Evolución gráfica (gráficos de dolor, movilidad)
   - Comparación de sesiones
   - Notas médicas adicionales

7. **Sistema de Turnos**
   - Reserva de turnos online
   - Confirmación de turnos
   - Lista de espera

8. **Facturación**
   - Generación de facturas
   - Comprobantes de pago
   - Integración con sistemas contables

9. **Dashboard y Analytics**
   - Dashboard principal con métricas clave
   - Gráficos de ingresos
   - Análisis de pacientes activos
   - Tendencias de tratamiento

10. **Comunicación**
    - Mensajería interna
    - Notificaciones push
    - Email marketing

11. **Gestión de Inventario**
    - Materiales y equipos
    - Control de stock
    - Mantenimiento de equipos

12. **Multi-sucursal**
    - Gestión de múltiples clínicas
    - Transferencia de pacientes
    - Reportes por sucursal

### 🟢 Mejoras Técnicas

13. **Búsqueda Avanzada**
    - Filtros combinados
    - Búsqueda por múltiples criterios
    - Búsqueda por fecha de rango

14. **Paginación Mejorada**
    - Cursor-based pagination
    - Filtros persistentes
    - Ordenamiento personalizado

15. **Caché**
    - Redis para sesiones
    - Caché de estadísticas
    - Caché de consultas frecuentes

16. **Subida de Archivos**
    - Upload de documentos de pacientes
    - Upload de fotos de evolución
    - Almacenamiento en cloud (S3, Cloudinary)

17. **API de Terceros**
    - Integración con sistemas de pago
    - Integración con obras sociales
    - Integración con sistemas de turnos

18. **Testing**
    - Tests unitarios
    - Tests de integración
    - Tests end-to-end

19. **Documentación API**
    - Swagger/OpenAPI
    - Postman Collection
    - Ejemplos de uso

20. **WebSockets**
    - Notificaciones en tiempo real
    - Actualización de planilla en vivo
    - Chat en tiempo real

---

## 📝 NOTAS FINALES

### Total de Endpoints Implementados: **~40 endpoints**

### Cobertura Actual:
- ✅ Autenticación completa
- ✅ Gestión de pacientes completa
- ✅ Gestión de sesiones completa
- ✅ Administración básica
- ✅ Auditoría básica
- ✅ Pagos del personal

### Áreas de Oportunidad:
- 🔴 Recuperación de contraseña
- 🔴 Notificaciones automáticas
- 🔴 Reportes y exportación
- 🟡 Calendario y agendamiento
- 🟡 Dashboard y analytics
- 🟡 Facturación

---

**Última actualización:** $(date)
**Versión del sistema:** 1.0.0
