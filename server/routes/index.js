import express from 'express';
import authRoutes from './authRoutes.js';
import pacienteRoutes from './pacienteRoutes.js';
import sesionRoutes from './sesionRoutes.js';
import adminRoutes from './adminRoutes.js';
import notificacionRoutes from './notificacionRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import busquedaRoutes from './busquedaRoutes.js';
import calendarioRoutes from './calendarioRoutes.js';
import evolucionRoutes from './evolucionRoutes.js';
import exportRoutes from './exportRoutes.js';

const router = express.Router();

/**
 * Rutas centralizadas de la APIs
 */

// Ruta de health check
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Rutas de autenticación
router.use('/auth', authRoutes);

// Rutas de gestión de pacientes (protegidas)
router.use('/pacientes', pacienteRoutes);

// Rutas de gestión de sesiones (protegidas)
router.use('/sesiones', sesionRoutes);

// Rutas de administración (solo administradores)
router.use('/admin', adminRoutes);

// Rutas de notificaciones (protegidas)
router.use('/notificaciones', notificacionRoutes);

// Rutas de dashboard (protegidas)
router.use('/dashboard', dashboardRoutes);

// Rutas de búsqueda global (protegidas)
router.use('/buscar', busquedaRoutes);

// Rutas de calendario (protegidas)
router.use('/calendario', calendarioRoutes);

// Rutas de evolución (protegidas)
router.use('/evolucion', evolucionRoutes);

// Rutas de exportación (protegidas)
router.use('/exportar', exportRoutes);

// Aquí se pueden agregar más rutas en el futuro
// router.use('/reportes', reportesRoutes);
// router.use('/configuracion', configuracionRoutes);
// etc...

export default router;


