import express from 'express';
import {
  register,
  login,
  logout,
  verifyEmail,
  resendVerification,
  refreshToken,
  getMe,
  updateProfile,
  changePassword,
} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
import {
  validateRegister,
  validateLogin,
  validateEmail,
  validateVerifyEmail,
  validateProfileUpdate,
  validatePasswordChange,
} from '../middlewares/validationMiddleware.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiters específicos para autenticación
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // 5 registros por hora por IP
  message: 'Demasiados intentos de registro. Por favor intenta nuevamente en una hora.',
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // 10 intentos de login por 15 minutos
  message: 'Demasiados intentos de inicio de sesión. Por favor intenta nuevamente más tarde.',
  standardHeaders: true,
  legacyHeaders: false,
});

const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // 3 emails por hora
  message: 'Demasiados intentos de envío de email. Por favor intenta nuevamente en una hora.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rutas públicas
router.post('/register', registerLimiter, validateRegister, register);
router.post('/login', loginLimiter, validateLogin, login);
router.post('/verify-email', emailLimiter, validateVerifyEmail, verifyEmail);
router.post('/resend-verification', emailLimiter, validateEmail, resendVerification);
router.post('/refresh-token', refreshToken);

// Rutas protegidas (requieren autenticación)
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/update-profile', protect, validateProfileUpdate, updateProfile);
router.put('/change-password', protect, validatePasswordChange, changePassword);

export default router;


