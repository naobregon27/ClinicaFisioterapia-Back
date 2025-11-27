# 📚 Documentación de Rutas - Módulo de Administrador

## 🔐 Autenticación Requerida

Todas las rutas del módulo de administrador requieren:
1. **Token JWT** en el header: `Authorization: Bearer {token}`
2. **Rol de administrador** (`administrador`)

---

## 👥 GESTIÓN DE USUARIOS

### 1. Obtener todos los usuarios

```http
GET /api/admin/usuarios
```

**Query Parameters:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Cantidad por página (default: 20)
- `sortBy` (opcional): Campo de ordenamiento (default: -createdAt)
- `rol` (opcional): Filtrar por rol (administrador, empleado, usuario)
- `estado` (opcional): Filtrar por estado (activo, inactivo, suspendido, pendiente_verificacion)
- `emailVerificado` (opcional): true/false
- `busqueda` (opcional): Buscar en nombre, apellido o email

**Ejemplo de Request:**
```http
GET /api/admin/usuarios?page=1&limit=20&rol=empleado&estado=activo
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Ejemplo de Response:**
```json
{
  "success": true,
  "message": "Usuarios obtenidos exitosamente",
  "data": [
    {
      "id": "64a1b2c3d4e5f6g7h8i9j0k1",
      "nombre": "Juan",
      "apellido": "Pérez",
      "nombreCompleto": "Juan Pérez",
      "email": "juan@ejemplo.com",
      "telefono": "+5491123456789",
      "rol": "empleado",
      "estado": "activo",
      "emailVerificado": true,
      "ultimoAcceso": "2024-01-15T10:30:00.000Z",
      "metadata": {
        "intentosFallidos": 0,
        "bloqueadoHasta": null
      },
      "createdAt": "2024-01-01T12:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPrevPage": false
  }
}
```

---

### 2. Obtener un usuario por ID

```http
GET /api/admin/usuarios/:id
```

**Ejemplo de Request:**
```http
GET /api/admin/usuarios/64a1b2c3d4e5f6g7h8i9j0k1
Authorization: Bearer {token}
```

**Ejemplo de Response:**
```json
{
  "success": true,
  "message": "Usuario obtenido exitosamente",
  "data": {
    "usuario": {
      "id": "64a1b2c3d4e5f6g7h8i9j0k1",
      "nombre": "Juan",
      "apellido": "Pérez",
      "email": "juan@ejemplo.com",
      "rol": "empleado",
      "estado": "activo",
      "estadisticas": {
        "totalPacientesCreados": 25,
        "totalSesionesAtendidas": 150
      },
      "ultimasAcciones": [
        {
          "accion": "crear",
          "recurso": {
            "tipo": "paciente",
            "id": "..."
          },
          "descripcion": "Paciente creado: María González",
          "createdAt": "2024-01-15T10:00:00.000Z"
        }
      ]
    }
  }
}
```

---

### 3. Crear un nuevo usuario

```http
POST /api/admin/usuarios
Content-Type: application/json
```

**Body:**
```json
{
  "nombre": "María",
  "apellido": "González",
  "email": "maria@ejemplo.com",
  "password": "Password123!",
  "telefono": "+5491123456789",
  "rol": "empleado",
  "direccion": {
    "calle": "Av. Principal",
    "ciudad": "San Miguel de Tucumán",
    "provincia": "Tucumán"
  }
}
```

**Ejemplo de Response:**
```json
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "data": {
    "usuario": {
      "id": "64a1b2c3d4e5f6g7h8i9j0k1",
      "nombre": "María",
      "apellido": "González",
      "email": "maria@ejemplo.com",
      "rol": "empleado",
      "estado": "activo",
      "emailVerificado": true
    }
  }
}
```

---

### 4. Actualizar usuario

```http
PUT /api/admin/usuarios/:id
Content-Type: application/json
```

**Body:**
```json
{
  "nombre": "María",
  "apellido": "González López",
  "telefono": "+5491198765432",
  "direccion": {
    "calle": "Nueva Calle 123"
  }
}
```

---

### 5. Cambiar contraseña de usuario

```http
PUT /api/admin/usuarios/:id/password
Content-Type: application/json
```

**Body:**
```json
{
  "nuevaPassword": "NuevaPassword123!"
}
```

---

### 6. Cambiar rol de usuario

```http
PUT /api/admin/usuarios/:id/rol
Content-Type: application/json
```

**Body:**
```json
{
  "nuevoRol": "administrador"
}
```

**Valores permitidos:** `administrador`, `empleado`, `usuario`

---

### 7. Cambiar estado de usuario

```http
PUT /api/admin/usuarios/:id/estado
Content-Type: application/json
```

**Body:**
```json
{
  "nuevoEstado": "suspendido"
}
```

**Valores permitidos:** `activo`, `inactivo`, `suspendido`, `pendiente_verificacion`

---

### 8. Desbloquear cuenta de usuario

```http
PUT /api/admin/usuarios/:id/desbloquear
```

**Ejemplo de Response:**
```json
{
  "success": true,
  "message": "Cuenta desbloqueada exitosamente",
  "data": {
    "usuario": {
      "id": "...",
      "metadata": {
        "intentosFallidos": 0,
        "bloqueadoHasta": null
      }
    }
  }
}
```

---

### 9. Eliminar/Desactivar usuario

```http
DELETE /api/admin/usuarios/:id
```

**Nota:** Esto realiza un "soft delete", marcando al usuario como inactivo.

---

## 📋 AUDITORÍA

### 1. Obtener todas las acciones de auditoría

```http
GET /api/admin/auditoria
```

**Query Parameters:**
- `page` (opcional): Número de página (default: 1)
- `limit` (opcional): Cantidad por página (default: 50)
- `usuarioId` (opcional): Filtrar por usuario
- `accion` (opcional): Filtrar por acción (crear, actualizar, eliminar, iniciar_sesion, etc.)
- `recursoTipo` (opcional): Filtrar por tipo de recurso (usuario, paciente, sesion, etc.)
- `fechaInicio` (opcional): Fecha inicial (formato ISO)
- `fechaFin` (opcional): Fecha final (formato ISO)
- `estado` (opcional): exitoso, fallido, pendiente

**Ejemplo de Request:**
```http
GET /api/admin/auditoria?usuarioId=64a1b2c3d4e5f6g7h8i9j0k1&accion=crear&page=1&limit=20
Authorization: Bearer {token}
```

**Ejemplo de Response:**
```json
{
  "success": true,
  "message": "Registros de auditoría obtenidos exitosamente",
  "data": [
    {
      "_id": "...",
      "usuario": {
        "id": "...",
        "nombre": "Juan",
        "apellido": "Pérez",
        "email": "juan@ejemplo.com",
        "rol": "empleado"
      },
      "accion": "crear",
      "recurso": {
        "tipo": "paciente",
        "id": "...",
        "nombre": "María González"
      },
      "descripcion": "crear paciente: María González",
      "ipAddress": "192.168.1.1",
      "metodo": "POST",
      "ruta": "/api/pacientes",
      "estado": "exitoso",
      "createdAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 500,
    "totalPages": 25
  }
}
```

---

### 2. Obtener acciones de un usuario específico

```http
GET /api/admin/auditoria/usuario/:usuarioId
```

**Query Parameters:**
- `page` (opcional)
- `limit` (opcional)

---

### 3. Obtener estadísticas de auditoría

```http
GET /api/admin/auditoria/estadisticas
```

**Query Parameters:**
- `fechaInicio` (opcional)
- `fechaFin` (opcional)

**Ejemplo de Response:**
```json
{
  "success": true,
  "message": "Estadísticas de auditoría obtenidas exitosamente",
  "data": {
    "generales": {
      "totalAcciones": 1500,
      "exitosas": 1480,
      "fallidas": 20
    },
    "porAccion": [
      {
        "_id": "crear",
        "cantidad": 450
      },
      {
        "_id": "actualizar",
        "cantidad": 350
      }
    ],
    "porRecurso": [
      {
        "_id": "paciente",
        "cantidad": 600
      }
    ],
    "porUsuario": [
      {
        "usuario": {
          "nombre": "Juan",
          "apellido": "Pérez",
          "email": "juan@ejemplo.com"
        },
        "cantidad": 250
      }
    ]
  }
}
```

---

## 💰 PLANILLA DE PAGOS DEL PERSONAL

### 1. Crear o actualizar un registro de pago diario

```http
POST /api/admin/pagos-personal
Content-Type: application/json
```

**Body:**
```json
{
  "año": 2025,
  "mes": 7,
  "semana": 1,
  "diaSemana": "lunes",
  "fecha": "2025-07-01",
  "monto": 110000.00,
  "distribucion": {
    "farfan": 33000.00,
    "mica": 22000.00,
    "ffma": 55000.00
  },
  "observaciones": "Pago completo del día",
  "estado": "pendiente"
}
```

**Nota:** Si no se proporciona `distribucion`, se calcula automáticamente:
- FARFAN: 30%
- MICA: 20%
- FFMA: 50%

---

### 2. Crear múltiples registros (importar planilla)

```http
POST /api/admin/pagos-personal/multiples
Content-Type: application/json
```

**Body:**
```json
{
  "registros": [
    {
      "año": 2025,
      "mes": 7,
      "semana": 1,
      "diaSemana": "lunes",
      "fecha": "2025-07-01",
      "monto": 110000.00
    },
    {
      "año": 2025,
      "mes": 7,
      "semana": 1,
      "diaSemana": "martes",
      "fecha": "2025-07-02",
      "monto": 70000.00
    }
  ]
}
```

**Ejemplo de Response:**
```json
{
  "success": true,
  "message": "Proceso completado: 10 creados, 5 actualizados",
  "data": {
    "creados": 10,
    "actualizados": 5,
    "errores": []
  }
}
```

---

### 3. Obtener planilla completa de un mes

```http
GET /api/admin/pagos-personal/planilla?año=2025&mes=7
```

**Ejemplo de Response:**
```json
{
  "success": true,
  "message": "Planilla obtenida exitosamente",
  "data": {
    "año": 2025,
    "mes": 7,
    "semanas": {
      "1": {
        "semana": 1,
        "dias": {
          "lunes": {
            "fecha": "2025-07-01T00:00:00.000Z",
            "monto": 110000.00,
            "distribucion": {
              "farfan": 33000.00,
              "mica": 22000.00,
              "ffma": 55000.00
            },
            "estado": "pendiente"
          },
          "martes": {
            "fecha": "2025-07-02T00:00:00.000Z",
            "monto": 70000.00,
            "distribucion": {
              "farfan": 21000.00,
              "mica": 14000.00,
              "ffma": 35000.00
            }
          }
        },
        "subtotal": 365000.00,
        "distribucion": {
          "farfan": 109500.00,
          "mica": 73000.00,
          "ffma": 182500.00
        }
      },
      "2": {
        "semana": 2,
        "dias": {...},
        "subtotal": 400000.00,
        "distribucion": {...}
      }
    },
    "totales": {
      "total": 2399000.00,
      "distribucion": {
        "farfan": 719700.00,
        "mica": 479800.00,
        "ffma": 1199500.00
      }
    }
  }
}
```

---

### 4. Obtener registros de pago con filtros

```http
GET /api/admin/pagos-personal
```

**Query Parameters:**
- `page` (opcional): default 1
- `limit` (opcional): default 50
- `año` (opcional): Filtrar por año
- `mes` (opcional): Filtrar por mes (1-12)
- `semana` (opcional): Filtrar por semana (1-5)
- `estado` (opcional): pendiente, procesado, pagado, cancelado
- `fechaInicio` (opcional)
- `fechaFin` (opcional)

---

### 5. Obtener un registro de pago por ID

```http
GET /api/admin/pagos-personal/:id
```

---

### 6. Actualizar un registro de pago

```http
PUT /api/admin/pagos-personal/:id
Content-Type: application/json
```

**Body:**
```json
{
  "monto": 120000.00,
  "estado": "pagado",
  "observaciones": "Pago realizado"
}
```

---

### 7. Eliminar un registro de pago

```http
DELETE /api/admin/pagos-personal/:id
```

---

### 8. Obtener estadísticas de pagos

```http
GET /api/admin/pagos-personal/estadisticas
```

**Query Parameters:**
- `año` (opcional)
- `mes` (opcional)
- `fechaInicio` (opcional)
- `fechaFin` (opcional)

**Ejemplo de Response:**
```json
{
  "success": true,
  "message": "Estadísticas obtenidas exitosamente",
  "data": {
    "resumen": {
      "totalRegistros": 50,
      "totalMonto": 2399000.00,
      "totalFarfan": 719700.00,
      "totalMica": 479800.00,
      "totalFfma": 1199500.00,
      "pendientes": 10,
      "procesados": 20,
      "pagados": 20
    },
    "porMes": [
      {
        "_id": {
          "año": 2025,
          "mes": 7
        },
        "totalMonto": 2399000.00,
        "cantidadRegistros": 50
      }
    ]
  }
}
```

---

## 📊 ESTADÍSTICAS DEL SISTEMA

### Obtener estadísticas generales

```http
GET /api/admin/estadisticas
```

**Ejemplo de Response:**
```json
{
  "success": true,
  "message": "Estadísticas del sistema obtenidas exitosamente",
  "data": {
    "usuarios": {
      "total": 50,
      "porRol": [
        {
          "_id": "empleado",
          "cantidad": 30
        },
        {
          "_id": "administrador",
          "cantidad": 2
        }
      ],
      "porEstado": [
        {
          "_id": "activo",
          "cantidad": 45
        }
      ],
      "activosUltimos30Dias": 40
    },
    "pacientes": {
      "total": 500,
      "porEstado": [
        {
          "_id": "activo",
          "cantidad": 350
        }
      ]
    },
    "sesiones": {
      "total": 2000,
      "porEstado": [
        {
          "_id": "realizada",
          "cantidad": 1800
        }
      ]
    },
    "ingresos": {
      "total": 5000000.00
    },
    "ultimasAcciones": [
      {
        "accion": "crear",
        "recurso": {
          "tipo": "paciente"
        },
        "usuario": {
          "nombre": "Juan",
          "apellido": "Pérez"
        },
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ]
  }
}
```

---

## 🔑 IMPORTANTE

1. **Todas las rutas requieren autenticación JWT**
2. **Solo usuarios con rol `administrador` pueden acceder**
3. **Formato de fecha:** ISO 8601 (YYYY-MM-DD o YYYY-MM-DDTHH:mm:ss.sssZ)
4. **Formato de moneda:** Números decimales (ej: 110000.00)

---

## 📝 Códigos de Estado HTTP

- `200 OK`: Operación exitosa
- `201 Created`: Recurso creado exitosamente
- `400 Bad Request`: Error en los datos enviados
- `401 Unauthorized`: No autenticado o token inválido
- `403 Forbidden`: No tiene permisos (no es administrador)
- `404 Not Found`: Recurso no encontrado
- `409 Conflict`: Conflicto (ej: email ya existe)
- `422 Unprocessable Entity`: Error de validación
- `500 Internal Server Error`: Error del servidor

---

## 🧪 Colección de Postman

Para facilitar las pruebas, puedes importar estas rutas en Postman creando una colección con todas las rutas documentadas arriba, agrupadas por categoría:

1. **Gestión de Usuarios**
2. **Auditoría**
3. **Planilla de Pagos del Personal**
4. **Estadísticas del Sistema**

**Variable de entorno en Postman:**
- `base_url`: `http://localhost:5000/api`
- `token`: Tu token JWT de administrador



