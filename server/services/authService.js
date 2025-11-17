import User from '../models/User.js';
import EmailService from './emailService.js';
import ErrorResponse from '../utils/ErrorResponse.js';
import { ERROR_MESSAGES, SUCCESS_MESSAGES, USER_STATUS, HTTP_STATUS } from '../conf/constants.js';
import jwt from 'jsonwebtoken';

/**
 * Servicio de autenticación
 */
class AuthService {
  /**
   * Registra un nuevo usuario
   * @param {Object} userData - Datos del usuario
   * @param {String} ipAddress - IP del usuario
   * @returns {Promise<Object>}
   */
  static async registrarUsuario(userData, ipAddress = null) {
    try {
      const { email, password, nombre, apellido, telefono, direccion, rol } = userData;

      // Verificar si el email ya existe
      const usuarioExistente = await User.findOne({ email });
      if (usuarioExistente) {
        throw new ErrorResponse(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS, HTTP_STATUS.CONFLICT);
      }

      // Crear usuario
      const usuario = await User.create({
        nombre,
        apellido,
        email,
        password,
        telefono,
        direccion,
        rol,
        metadata: {
          ipRegistro: ipAddress,
        },
      });

      // Generar código de verificación de 6 dígitos
      const verificationCode = usuario.generarEmailVerificationCode();
      await usuario.save({ validateBeforeSave: false });

      // Enviar email de verificación
      try {
        const emailResult = await EmailService.enviarEmailVerificacion(
          usuario.email,
          usuario.nombre,
          verificationCode
        );
        
        if (emailResult.success) {
          console.log(`✓ Email de verificación enviado a: ${usuario.email}`);
        } else if (emailResult.development) {
          console.log(`⚠️  Email no enviado (modo desarrollo). Código de verificación generado: ${verificationCode}`);
        }
      } catch (emailError) {
        console.error('Error al enviar email de verificación:', emailError.message);
        // No fallar el registro si el email no se pudo enviar
        // El usuario puede usar el endpoint de reenvío más tarde
        console.log(`⚠️  El usuario se registró correctamente, pero el email no pudo enviarse.`);
        console.log(`💡 El usuario puede solicitar un nuevo código de verificación usando el endpoint de reenvío.`);
      }

      return {
        success: true,
        message: SUCCESS_MESSAGES.USER_REGISTERED,
        data: {
          usuario: usuario.obtenerDatosPublicos(),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verifica el email del usuario usando código de 6 dígitos
   * @param {String} email - Email del usuario
   * @param {String} code - Código de verificación de 6 dígitos
   * @returns {Promise<Object>}
   */
  static async verificarEmail(email, code) {
    try {
      // Validar formato del código (debe ser 6 dígitos)
      if (!code || !/^\d{6}$/.test(code)) {
        throw new ErrorResponse('El código de verificación debe ser de 6 dígitos', HTTP_STATUS.BAD_REQUEST);
      }

      // Buscar usuario por email
      const usuario = await User.findOne({ email }).select('+emailVerificationCode +emailVerificationExpire');

      if (!usuario) {
        throw new ErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      }

      // Verificar si ya está verificado
      if (usuario.emailVerificado) {
        throw new ErrorResponse(ERROR_MESSAGES.EMAIL_ALREADY_VERIFIED, HTTP_STATUS.BAD_REQUEST);
      }

      // Verificar si el código existe
      if (!usuario.emailVerificationCode) {
        throw new ErrorResponse('No hay código de verificación pendiente. Solicita un nuevo código.', HTTP_STATUS.BAD_REQUEST);
      }

      // Verificar si el código ha expirado
      if (usuario.emailVerificationExpire < Date.now()) {
        throw new ErrorResponse('El código de verificación ha expirado. Solicita un nuevo código.', HTTP_STATUS.BAD_REQUEST);
      }

      // Verificar que el código coincida
      if (usuario.emailVerificationCode !== code) {
        throw new ErrorResponse('El código de verificación es incorrecto', HTTP_STATUS.BAD_REQUEST);
      }

      // Actualizar usuario
      usuario.emailVerificado = true;
      usuario.estado = USER_STATUS.ACTIVE;
      usuario.emailVerificationCode = undefined;
      usuario.emailVerificationExpire = undefined;
      await usuario.save();

      // Enviar email de bienvenida
      try {
        const emailResult = await EmailService.enviarEmailBienvenida(usuario.email, usuario.nombre);
        if (emailResult.success) {
          console.log(`✓ Email de bienvenida enviado exitosamente a: ${usuario.email}`);
          console.log(`  → El usuario ${usuario.nombre} ya está dentro de la plataforma`);
        } else if (emailResult.development) {
          console.log(`⚠️  Email de bienvenida no enviado (modo desarrollo). Usuario verificado: ${usuario.email}`);
        }
      } catch (emailError) {
        console.error('Error al enviar email de bienvenida:', emailError.message);
        // No fallar la verificación si el email de bienvenida no se pudo enviar
        // El usuario ya está verificado y puede usar la plataforma
        console.log(`⚠️  El usuario ${usuario.nombre} fue verificado correctamente, pero el email de bienvenida no pudo enviarse.`);
      }

      return {
        success: true,
        message: SUCCESS_MESSAGES.EMAIL_VERIFIED,
        data: {
          usuario: usuario.obtenerDatosPublicos(),
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Reenvía el email de verificación con nuevo código
   * @param {String} email - Email del usuario
   * @returns {Promise<Object>}
   */
  static async reenviarEmailVerificacion(email) {
    try {
      const usuario = await User.findOne({ email }).select('+emailVerificationCode +emailVerificationExpire');

      if (!usuario) {
        throw new ErrorResponse(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      }

      if (usuario.emailVerificado) {
        throw new ErrorResponse(ERROR_MESSAGES.EMAIL_ALREADY_VERIFIED, HTTP_STATUS.BAD_REQUEST);
      }

      // Generar nuevo código
      const verificationCode = usuario.generarEmailVerificationCode();
      await usuario.save({ validateBeforeSave: false });

      // Enviar email
      try {
        const emailResult = await EmailService.enviarEmailVerificacion(
          usuario.email,
          usuario.nombre,
          verificationCode
        );
        
        if (!emailResult.success && emailResult.development) {
          throw new ErrorResponse(
            'SendGrid no está configurado. Por favor, configura SENDGRID_API_KEY y SENDGRID_FROM_EMAIL en tu archivo .env',
            HTTP_STATUS.SERVICE_UNAVAILABLE
          );
        }
      } catch (emailError) {
        // Si es un error de configuración, lanzarlo
        if (emailError instanceof ErrorResponse) {
          throw emailError;
        }
        // Si es otro error, lanzarlo también
        throw new ErrorResponse(
          `Error al enviar el email: ${emailError.message}`,
          HTTP_STATUS.INTERNAL_SERVER_ERROR
        );
      }

      return {
        success: true,
        message: SUCCESS_MESSAGES.EMAIL_SENT,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Inicia sesión de usuario
   * @param {String} email - Email del usuario
   * @param {String} password - Contraseña del usuario
   * @param {String} ipAddress - IP del usuario
   * @returns {Promise<Object>}
   */
  static async iniciarSesion(email, password, ipAddress = null) {
    try {
      // Buscar usuario con password
      const usuario = await User.buscarPorEmailConPassword(email);

      if (!usuario) {
        throw new ErrorResponse(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
      }

      // Verificar si la cuenta está bloqueada
      if (usuario.metadata.bloqueadoHasta && usuario.metadata.bloqueadoHasta > Date.now()) {
        const minutosRestantes = Math.ceil((usuario.metadata.bloqueadoHasta - Date.now()) / 60000);
        throw new ErrorResponse(
          `Cuenta bloqueada temporalmente. Intenta nuevamente en ${minutosRestantes} minutos`,
          HTTP_STATUS.FORBIDDEN
        );
      }

      // Verificar contraseña
      const esPasswordValido = await usuario.compararPassword(password);

      if (!esPasswordValido) {
        // Incrementar intentos fallidos
        usuario.metadata.intentosFallidos += 1;

        // Bloquear cuenta si supera 5 intentos
        if (usuario.metadata.intentosFallidos >= 5) {
          usuario.metadata.bloqueadoHasta = Date.now() + 15 * 60 * 1000; // 15 minutos
          usuario.metadata.intentosFallidos = 0;
          await usuario.save({ validateBeforeSave: false });
          throw new ErrorResponse(
            'Demasiados intentos fallidos. Tu cuenta ha sido bloqueada temporalmente por 15 minutos',
            HTTP_STATUS.FORBIDDEN
          );
        }

        await usuario.save({ validateBeforeSave: false });
        throw new ErrorResponse(ERROR_MESSAGES.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
      }

      // Verificar si el email está verificado
      if (!usuario.emailVerificado) {
        throw new ErrorResponse(ERROR_MESSAGES.EMAIL_NOT_VERIFIED, HTTP_STATUS.FORBIDDEN);
      }

      // Verificar estado de la cuenta
      if (usuario.estado === USER_STATUS.SUSPENDED) {
        throw new ErrorResponse('Tu cuenta ha sido suspendida', HTTP_STATUS.FORBIDDEN);
      }

      if (usuario.estado === USER_STATUS.INACTIVE) {
        throw new ErrorResponse('Tu cuenta está inactiva', HTTP_STATUS.FORBIDDEN);
      }

      // Resetear intentos fallidos
      usuario.metadata.intentosFallidos = 0;
      usuario.metadata.bloqueadoHasta = null;
      usuario.ultimoAcceso = Date.now();
      usuario.metadata.ultimaIp = ipAddress;

      // Generar tokens
      const accessToken = usuario.generarAccessToken();
      const refreshToken = usuario.generarRefreshToken();

      // Guardar refresh token
      usuario.refreshToken = refreshToken;
      await usuario.save({ validateBeforeSave: false });

      return {
        success: true,
        message: SUCCESS_MESSAGES.LOGIN_SUCCESS,
        data: {
          usuario: usuario.obtenerDatosPublicos(),
          accessToken,
          refreshToken,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Refresca el access token usando el refresh token
   * @param {String} refreshToken - Refresh token
   * @returns {Promise<Object>}
   */
  static async refrescarToken(refreshToken) {
    try {
      // Verificar refresh token
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

      if (decoded.type !== 'refresh') {
        throw new ErrorResponse(ERROR_MESSAGES.TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
      }

      // Buscar usuario
      const usuario = await User.findById(decoded.id).select('+refreshToken');

      if (!usuario || usuario.refreshToken !== refreshToken) {
        throw new ErrorResponse(ERROR_MESSAGES.TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
      }

      // Generar nuevo access token
      const nuevoAccessToken = usuario.generarAccessToken();

      return {
        success: true,
        message: 'Token refrescado exitosamente',
        data: {
          accessToken: nuevoAccessToken,
        },
      };
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        throw new ErrorResponse(ERROR_MESSAGES.TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
      }
      throw error;
    }
  }

  /**
   * Cierra sesión del usuario
   * @param {String} userId - ID del usuario
   * @returns {Promise<Object>}
   */
  static async cerrarSesion(userId) {
    try {
      const usuario = await User.findById(userId).select('+refreshToken');

      if (usuario) {
        usuario.refreshToken = undefined;
        await usuario.save({ validateBeforeSave: false });
      }

      return {
        success: true,
        message: SUCCESS_MESSAGES.LOGOUT_SUCCESS,
      };
    } catch (error) {
      throw error;
    }
  }
}

export default AuthService;


