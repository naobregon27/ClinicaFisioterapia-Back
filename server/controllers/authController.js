import AuthService from '../services/authService.js';
import User from '../models/User.js';
import asyncHandler from '../utils/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../conf/constants.js';

/**
 * @desc    Registrar nuevo usuario
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = asyncHandler(async (req, res) => {
  const ipAddress = req.ip || req.connection.remoteAddress;
  
  const resultado = await AuthService.registrarUsuario(req.body, ipAddress);

  return ApiResponse.success(
    res,
    HTTP_STATUS.CREATED,
    resultado.message,
    resultado.data
  );
});

/**
 * @desc    Verificar email con código de 6 dígitos
 * @route   POST /api/auth/verify-email
 * @access  Public
 */
export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  const resultado = await AuthService.verificarEmail(email, code);

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    resultado.message,
    resultado.data
  );
});

/**
 * @desc    Reenviar email de verificación
 * @route   POST /api/auth/resend-verification
 * @access  Public
 */
export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const resultado = await AuthService.reenviarEmailVerificacion(email);

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    resultado.message
  );
});

/**
 * @desc    Iniciar sesión
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const ipAddress = req.ip || req.connection.remoteAddress;

  const resultado = await AuthService.iniciarSesion(email, password, ipAddress);

  // Configurar cookie con el access token
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  };

  res.cookie('token', resultado.data.accessToken, cookieOptions);

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    resultado.message,
    resultado.data
  );
});

/**
 * @desc    Cerrar sesión
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = asyncHandler(async (req, res) => {
  const resultado = await AuthService.cerrarSesion(req.user._id);

  // Limpiar cookie
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    resultado.message
  );
});

/**
 * @desc    Refrescar token de acceso
 * @route   POST /api/auth/refresh-token
 * @access  Public
 */
export const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;

  const resultado = await AuthService.refrescarToken(refreshToken);

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    resultado.message,
    resultado.data
  );
});

/**
 * @desc    Obtener usuario actual
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = asyncHandler(async (req, res) => {
  const usuario = req.user.obtenerDatosPublicos();

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    'Usuario obtenido exitosamente',
    { usuario }
  );
});

/**
 * @desc    Actualizar perfil de usuario
 * @route   PUT /api/auth/update-profile
 * @access  Private
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { nombre, apellido, telefono, direccion } = req.body;

  const fieldsToUpdate = {};
  if (nombre) fieldsToUpdate.nombre = nombre;
  if (apellido) fieldsToUpdate.apellido = apellido;
  if (telefono) fieldsToUpdate.telefono = telefono;
  if (direccion) fieldsToUpdate.direccion = direccion;

  const usuario = await User.findByIdAndUpdate(
    req.user._id,
    fieldsToUpdate,
    {
      new: true,
      runValidators: true,
    }
  );

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    'Perfil actualizado exitosamente',
    { usuario: usuario.obtenerDatosPublicos() }
  );
});

/**
 * @desc    Cambiar contraseña
 * @route   PUT /api/auth/change-password
 * @access  Private
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  // Obtener usuario con password
  const usuario = await User.findById(req.user._id).select('+password');

  // Verificar contraseña actual
  const esPasswordValido = await usuario.compararPassword(currentPassword);

  if (!esPasswordValido) {
    return ApiResponse.error(
      res,
      HTTP_STATUS.UNAUTHORIZED,
      'La contraseña actual es incorrecta'
    );
  }

  // Actualizar password
  usuario.password = newPassword;
  await usuario.save();

  return ApiResponse.success(
    res,
    HTTP_STATUS.OK,
    'Contraseña actualizada exitosamente'
  );
});

