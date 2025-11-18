import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ROLES, USER_STATUS } from '../conf/constants.js';

const userSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      maxlength: [50, 'El nombre no puede exceder 50 caracteres'],
    },
    apellido: {
      type: String,
      required: [true, 'El apellido es obligatorio'],
      trim: true,
      maxlength: [50, 'El apellido no puede exceder 50 caracteres'],
    },
    email: {
      type: String,
      required: [true, 'El email es obligatorio'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        'Por favor ingrese un email válido',
      ],
    },
    password: {
      type: String,
      required: [true, 'La contraseña es obligatoria'],
      minlength: [8, 'La contraseña debe tener al menos 8 caracteres'],
      select: false, // No incluir password en queries por defecto
    },
    telefono: {
      type: String,
      trim: true,
      default: null,
    },
    direccion: {
      calle: { type: String, trim: true },
      ciudad: { type: String, trim: true },
      provincia: { type: String, trim: true },
      codigoPostal: { type: String, trim: true },
      pais: { type: String, trim: true, default: 'Argentina' },
    },
    rol: {
      type: String,
      enum: {
        values: Object.values(ROLES),
        message: 'Rol no válido',
      },
      default: ROLES.USUARIO,
    },
    estado: {
      type: String,
      enum: {
        values: Object.values(USER_STATUS),
        message: 'Estado no válido',
      },
      default: USER_STATUS.PENDING_VERIFICATION,
    },
    estadoCuenta: {
      type: String,
      enum: ['activo', 'inactivo'],
      default: 'activo',
    },
    emailVerificado: {
      type: Boolean,
      default: false,
    },
    emailVerificationCode: {
      type: String,
      select: false,
    },
    emailVerificationExpire: {
      type: Date,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpire: {
      type: Date,
      select: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    ultimoAcceso: {
      type: Date,
      default: null,
    },
    avatar: {
      type: String,
      default: null,
    },
    metadata: {
      intentosFallidos: { type: Number, default: 0 },
      bloqueadoHasta: { type: Date, default: null },
      ipRegistro: { type: String, default: null },
      ultimaIp: { type: String, default: null },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Índices para mejorar rendimiento
userSchema.index({ email: 1 });
userSchema.index({ rol: 1 });
userSchema.index({ estado: 1 });
userSchema.index({ emailVerificationCode: 1 });
userSchema.index({ resetPasswordToken: 1 });

// Middleware: Encriptar password antes de guardar
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método: Comparar password
userSchema.methods.compararPassword = async function (passwordIngresado) {
  return await bcrypt.compare(passwordIngresado, this.password);
};

// Método: Generar JWT Access Token
userSchema.methods.generarAccessToken = function () {
  return jwt.sign(
    { 
      id: this._id, 
      rol: this.rol,
      email: this.email 
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    }
  );
};

// Método: Generar JWT Refresh Token
userSchema.methods.generarRefreshToken = function () {
  return jwt.sign(
    { 
      id: this._id,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
    }
  );
};

// Método: Generar código de verificación de email (6 dígitos)
userSchema.methods.generarEmailVerificationCode = function () {
  // Generar código de 6 dígitos
  const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Hashear el código antes de guardarlo (usando bcrypt)
  // Guardamos el código sin hashear para compararlo, pero en producción deberías hashearlo
  // Por ahora lo guardamos directamente para facilitar la comparación
  this.emailVerificationCode = verificationCode;
  
  // Configurar expiración (15 minutos por defecto)
  const expireMinutes = parseInt(process.env.EMAIL_VERIFICATION_EXPIRE_MINUTES || '15');
  this.emailVerificationExpire = Date.now() + expireMinutes * 60 * 1000;

  return verificationCode;
};

// Método: Generar token de reseteo de password
userSchema.methods.generarResetPasswordToken = function () {
  const resetToken = jwt.sign(
    { 
      id: this._id,
      email: this.email,
      type: 'password_reset'
    },
    process.env.JWT_SECRET,
    {
      expiresIn: '1h',
    }
  );

  this.resetPasswordToken = jwt.sign(
    { token: resetToken },
    process.env.JWT_SECRET
  );
  
  this.resetPasswordExpire = Date.now() + 60 * 60 * 1000; // 1 hora

  return resetToken;
};

// Método: Obtener datos públicos del usuario
userSchema.methods.obtenerDatosPublicos = function () {
  return {
    id: this._id,
    nombre: this.nombre,
    apellido: this.apellido,
    email: this.email,
    telefono: this.telefono,
    direccion: this.direccion,
    rol: this.rol,
    estado: this.estado,
    estadoCuenta: this.estadoCuenta,
    emailVerificado: this.emailVerificado,
    ultimoAcceso: this.ultimoAcceso,
    avatar: this.avatar,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

// Método estático: Buscar usuario por email con password
userSchema.statics.buscarPorEmailConPassword = function (email) {
  return this.findOne({ email }).select('+password +refreshToken');
};

const User = mongoose.model('User', userSchema);

export default User;


