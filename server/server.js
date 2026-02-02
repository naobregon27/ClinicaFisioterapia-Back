import express from 'express';
import dotenv from 'dotenv';
import colors from 'colors';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import xss from 'xss-clean';
import hpp from 'hpp';

// Importar configuraciones
import connectDB from './conf/database.js';

// Importar rutas
import routes from './routes/index.js';

// Importar middlewares
import errorHandler, { notFoundHandler } from './middlewares/errorHandler.js';

// Importar tareas programadas (cron jobs)
import './utils/cronJobs.js';

// Cargar variables de entorno
dotenv.config();

// Conectar a la base de datos
connectDB();

// Inicializar Express
const app = express();

// Trust Proxy - Necesario cuando la app está detrás de un proxy (Render, Heroku, etc.)
// Permite que Express confíe en los headers X-Forwarded-* para identificar IPs correctamente
app.set('trust proxy', true);

// ============================================
// MIDDLEWARES DE SEGURIDAD
// ============================================

// Helmet - Configuración de headers de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS - Configuración de origen cruzado
// Permitir múltiples orígenes para desarrollo y producción
const allowedOrigins = [];

// Agregar URL del cliente desde variable de entorno (producción)
if (process.env.CLIENT_URL) {
  allowedOrigins.push(process.env.CLIENT_URL);
  console.log(colors.cyan(`✓ CORS: URL de producción agregada: ${process.env.CLIENT_URL}`));
}

// Agregar URL de Netlify por defecto
if (!allowedOrigins.includes('https://fisioterapiamiguel.netlify.app')) {
  allowedOrigins.push('https://fisioterapiamiguel.netlify.app');
  console.log(colors.cyan(`✓ CORS: URL de Netlify agregada: https://fisioterapiamiguel.netlify.app`));
}

// Agregar URLs de desarrollo comunes (siempre permitidas, incluso en producción)
// Esto permite que el frontend local se conecte al backend desplegado
allowedOrigins.push(
  'http://localhost:3000',
  'http://localhost:5173', // Vite default port
  'http://localhost:5174',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174'
);

// Si hay URLs adicionales en producción, agregarlas desde variable de entorno
if (process.env.CLIENT_URLS) {
  const additionalUrls = process.env.CLIENT_URLS.split(',').map(url => url.trim());
  allowedOrigins.push(...additionalUrls);
  console.log(colors.cyan(`✓ CORS: URLs adicionales agregadas: ${additionalUrls.join(', ')}`));
}

// Log de orígenes permitidos al iniciar
console.log(colors.cyan(`✓ CORS: Orígenes permitidos: ${allowedOrigins.join(', ')}`));

const corsOptions = {
  origin: function (origin, callback) {
    // Permitir requests sin origin (como Postman, mobile apps, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Verificar si el origin está en la lista de permitidos
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // En desarrollo, permitir cualquier origin (solo para debugging)
      if (process.env.NODE_ENV === 'development') {
        console.warn(colors.yellow(`⚠ CORS: Origin no permitido pero aceptado en desarrollo: ${origin}`));
        callback(null, true);
      } else {
        // En producción, log del error pero rechazar
        console.error(colors.red(`✗ CORS: Origin rechazado: ${origin}`));
        console.error(colors.red(`✗ CORS: Orígenes permitidos: ${allowedOrigins.join(', ')}`));
        callback(new Error(`No permitido por CORS. Origin: ${origin}`));
      }
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};
app.use(cors(corsOptions));

// Rate Limiting - Limitar peticiones por IP
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // límite de peticiones
  message: 'Demasiadas peticiones desde esta IP, por favor intenta nuevamente más tarde.',
  standardHeaders: true, // Retorna rate limit info en los headers `RateLimit-*`
  legacyHeaders: false, // Deshabilita los headers `X-RateLimit-*`
  validate: false, // Deshabilita validaciones estrictas (necesario cuando trust proxy está activo en Render)
});
app.use('/api/', limiter);

// XSS Clean - Prevenir ataques XSS
app.use(xss());

// ============================================
// MIDDLEWARES DE PARSEO
// ============================================

// Body parser - DEBE ir antes de HPP
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HPP - Prevenir HTTP Parameter Pollution (debe ir DESPUÉS del body parser)
app.use(hpp());

// Cookie parser
app.use(cookieParser());

// ============================================
// LOGGING
// ============================================

// Morgan - HTTP request logger (solo en desarrollo)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ============================================
// INFORMACIÓN DE LA API
// ============================================

// Ruta raíz
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API de Clínica Fisioterapia',
    version: '1.0.0',
    documentation: '/api/health',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
    },
  });
});

// ============================================
// RUTAS DE LA API
// ============================================

// Montar rutas
app.use('/api', routes);

// ============================================
// MANEJO DE ERRORES
// ============================================

// Ruta no encontrada
app.use(notFoundHandler);

// Manejador de errores global
app.use(errorHandler);

// ============================================
// SERVIDOR
// ============================================

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(
    colors.yellow.bold(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║       🏥  CLÍNICA FISIOTERAPIA - API SERVER         ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
    `)
  );
  console.log(
    colors.cyan.bold(`✓ Servidor corriendo en modo: ${colors.yellow(process.env.NODE_ENV)}`)
  );
  console.log(
    colors.cyan.bold(`✓ Puerto: ${colors.yellow(PORT)}`)
  );
  console.log(
    colors.cyan.bold(`✓ URL: ${colors.yellow(`http://localhost:${PORT}`)}`)
  );
  console.log(
    colors.green.bold(`\n✓ Servidor listo para recibir peticiones...\n`)
  );
});

// Manejo de rechazos de promesas no capturados
process.on('unhandledRejection', (err, promise) => {
  console.error(colors.red.bold(`✗ Error no capturado: ${err.message}`));
  console.error(colors.red(`Stack: ${err.stack}`));
  
  // Cerrar servidor y salir del proceso
  server.close(() => {
    console.error(colors.red.bold('✗ Servidor cerrado debido a un error no capturado'));
    process.exit(1);
  });
});

// Manejo de señal SIGTERM
process.on('SIGTERM', () => {
  console.log(colors.yellow('\n⚠ SIGTERM recibido. Cerrando servidor gracefully...'));
  server.close(() => {
    console.log(colors.green('✓ Servidor cerrado'));
    process.exit(0);
  });
});

export default app;



