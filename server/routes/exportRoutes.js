import express from 'express';
import {
  generarPDFPlanillaDiaria,
  generarPDFFichaPaciente,
} from '../controllers/exportController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(protect);

// Rutas principales
router.get('/planilla-diaria', generarPDFPlanillaDiaria);
router.get('/ficha-paciente/:pacienteId', generarPDFFichaPaciente);

export default router;
