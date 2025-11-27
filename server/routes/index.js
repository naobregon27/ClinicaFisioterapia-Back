import express from 'express';
import authRoutes from './authRoutes.js';
import pacienteRoutes from './pacienteRoutes.js';
import sesionRoutes from './sesionRoutes.js';
import adminRoutes from './adminRoutes.js';

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

// Aquí se pueden agregar más rutas en el futuro
// router.use('/reportes', reportesRoutes);
// router.use('/configuracion', configuracionRoutes);
// etc...

export default router;


