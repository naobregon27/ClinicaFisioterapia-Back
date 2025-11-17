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

// Cargar variables de entorno
dotenv.config();

// Conectar a la base de datos
connectDB();

// Inicializar Express
const app = express();

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
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Rate Limiting - Limitar peticiones por IP
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // límite de peticiones
  message: 'Demasiadas peticiones desde esta IP, por favor intenta nuevamente más tarde.',
  standardHeaders: true, // Retorna rate limit info en los headers `RateLimit-*`
  legacyHeaders: false, // Deshabilita los headers `X-RateLimit-*`
});
app.use('/api/', limiter);

// XSS Clean - Prevenir ataques XSS
app.use(xss());

// HPP - Prevenir HTTP Parameter Pollution
app.use(hpp());

// ============================================
// MIDDLEWARES DE PARSEO
// ============================================

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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



