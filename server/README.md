# Clínica Fisioterapia - Backend API

Backend robusto y escalable para el sistema de gestión de Clínica Fisioterapia, desarrollado con Node.js, Express y MongoDB.

## 🚀 Características

- ✅ Autenticación JWT con Access y Refresh Tokens
- ✅ Verificación de email con SendGrid
- ✅ Sistema de roles (Administrador, Empleado, Usuario)
- ✅ Rate limiting para prevenir abusos
- ✅ Seguridad avanzada (Helmet, XSS, HPP)
- ✅ Manejo robusto de errores
- ✅ Validaciones exhaustivas
- ✅ Arquitectura escalable y ordenada
- ✅ MongoDB con Mongoose
- ✅ Bloqueo temporal de cuenta tras intentos fallidos

## 📁 Estructura del Proyecto

```
server/
├── conf/                    # Configuraciones
│   ├── database.js         # Conexión a MongoDB
│   └── constants.js        # Constantes de la aplicación
├── controllers/            # Controladores de rutas
│   └── authController.js   # Controlador de autenticación
├── middlewares/            # Middlewares personalizados
│   ├── authMiddleware.js   # Protección y autorización
│   ├── errorHandler.js     # Manejo de errores
│   └── validationMiddleware.js # Validaciones
├── models/                 # Modelos de Mongoose
│   └── User.js            # Modelo de usuario
├── routes/                 # Rutas de la API
│   ├── authRoutes.js      # Rutas de autenticación
│   └── index.js           # Centralización de rutas
├── services/              # Servicios de negocio
│   ├── authService.js     # Lógica de autenticación
│   └── emailService.js    # Servicio de emails (SendGrid)
├── utils/                 # Utilidades
│   ├── ApiResponse.js     # Respuestas estandarizadas
│   ├── ErrorResponse.js   # Errores personalizados
│   ├── asyncHandler.js    # Wrapper para async/await
│   └── validators.js      # Validadores
├── .env.example           # Variables de entorno ejemplo
├── .gitignore            # Archivos ignorados por git
├── package.json          # Dependencias del proyecto
├── README.md             # Documentación
└── server.js             # Punto de entrada de la aplicación
```

## 🛠️ Instalación

1. **Clonar el repositorio e instalar dependencias:**

```bash
cd server
npm install
```

2. **Configurar variables de entorno:**

Crea un archivo `.env` en la raíz de la carpeta `server` basándote en `.env.example`:

```env
# Server Configuration
NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:3000

# Database
MONGODB_URI=mongodb://localhost:27017/clinica-fisioterapia

# JWT Configuration
JWT_SECRET=tu_super_secreto_jwt_aqui_cambiar_en_produccion
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=tu_super_secreto_refresh_jwt_aqui_cambiar_en_produccion
JWT_REFRESH_EXPIRE=30d
JWT_COOKIE_EXPIRE=7

# SendGrid Configuration
SENDGRID_API_KEY=tu_api_key_de_sendgrid_aqui
SENDGRID_FROM_EMAIL=noreply@tudominio.com
SENDGRID_FROM_NAME=Clinica Fisioterapia

# Email Verification
EMAIL_VERIFICATION_EXPIRE=24h

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

3. **Iniciar el servidor:**

```bash
# Desarrollo (con nodemon)
npm run dev

# Producción
npm start
```

## 📡 Endpoints de la API

### Autenticación

#### Registro de Usuario
```http
POST /api/auth/register
Content-Type: application/json

{
  "nombre": "Juan",
  "apellido": "Pérez",
  "email": "juan@ejemplo.com",
  "password": "Password123!",
  "telefono": "+5491123456789",
  "rol": "usuario"
}
```

#### Verificar Email
```http
GET /api/auth/verify-email/:token
```

#### Reenviar Email de Verificación
```http
POST /api/auth/resend-verification
Content-Type: application/json

{
  "email": "juan@ejemplo.com"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "juan@ejemplo.com",
  "password": "Password123!"
}
```

#### Logout (Requiere autenticación)
```http
POST /api/auth/logout
Authorization: Bearer {token}
```

#### Obtener Usuario Actual (Requiere autenticación)
```http
GET /api/auth/me
Authorization: Bearer {token}
```

#### Actualizar Perfil (Requiere autenticación)
```http
PUT /api/auth/update-profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "nombre": "Juan Carlos",
  "telefono": "+5491123456789"
}
```

#### Cambiar Contraseña (Requiere autenticación)
```http
PUT /api/auth/change-password
Authorization: Bearer {token}
Content-Type: application/json

{
  "currentPassword": "Password123!",
  "newPassword": "NewPassword456!"
}
```

#### Refrescar Token
```http
POST /api/auth/refresh-token
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Health Check
```http
GET /api/health
```

## 🔐 Sistema de Roles

- **Administrador**: Acceso completo al sistema
- **Empleado**: Acceso a funcionalidades de gestión
- **Usuario**: Acceso básico

## 🛡️ Seguridad

- **Helmet**: Configuración de headers HTTP seguros
- **CORS**: Control de origen cruzado
- **Rate Limiting**: Límite de peticiones por IP
- **XSS Clean**: Protección contra XSS
- **HPP**: Protección contra HTTP Parameter Pollution
- **JWT**: Tokens de acceso y refresco
- **Bcrypt**: Encriptación de contraseñas
- **Bloqueo temporal**: Tras 5 intentos fallidos de login

## 📧 Sistema de Emails

El sistema utiliza **SendGrid** para el envío de emails:

- Email de verificación de cuenta (24h de validez)
- Email de bienvenida
- Email de recuperación de contraseña

## ✅ Validaciones

### Contraseña
- Mínimo 8 caracteres
- Al menos una mayúscula
- Al menos una minúscula
- Al menos un número
- Al menos un carácter especial (@$!%*?&)

### Email
- Formato válido de email
- Único en la base de datos

### Nombre y Apellido
- Mínimo 2 caracteres
- Máximo 50 caracteres
- Solo letras

## 🔧 Manejo de Errores

El sistema cuenta con un manejo centralizado de errores que captura:

- Errores de validación de Mongoose
- Errores de JWT
- Errores de duplicación de datos
- Errores personalizados
- Errores no capturados

## 🌍 Variables de Entorno Importantes

| Variable | Descripción | Requerido |
|----------|-------------|-----------|
| `NODE_ENV` | Entorno de ejecución | Sí |
| `PORT` | Puerto del servidor | Sí |
| `MONGODB_URI` | URI de conexión a MongoDB | Sí |
| `JWT_SECRET` | Secreto para JWT | Sí |
| `SENDGRID_API_KEY` | API Key de SendGrid | Sí |
| `CLIENT_URL` | URL del frontend | Sí |

## 📝 Scripts Disponibles

```bash
npm start        # Inicia el servidor en producción
npm run dev      # Inicia el servidor en desarrollo con nodemon
```

## 🤝 Contribución

Para agregar nuevas funcionalidades:

1. Crea el modelo en `models/`
2. Crea el servicio en `services/`
3. Crea el controlador en `controllers/`
4. Crea las rutas en `routes/`
5. Registra las rutas en `routes/index.js`

## 📄 Licencia

ISC

## 👨‍💻 Autor

Desarrollado para Clínica Fisioterapia

---

**¡Backend listo para producción!** 🚀



