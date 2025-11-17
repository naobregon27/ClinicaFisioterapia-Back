import mongoose from 'mongoose';

const pacienteSchema = new mongoose.Schema(
  {
    // Datos Personales
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
    dni: {
      type: String,
      required: [true, 'El DNI es obligatorio'],
      unique: true,
      trim: true,
      match: [/^\d{7,8}$/, 'DNI inválido'],
    },
    fechaNacimiento: {
      type: Date,
      default: null,
    },
    edad: {
      type: Number,
      min: 0,
      max: 120,
    },
    genero: {
      type: String,
      enum: ['masculino', 'femenino', 'otro', 'no_especifica'],
      default: 'no_especifica',
    },
    
    // Contacto
    telefono: {
      type: String,
      required: [true, 'El teléfono es obligatorio'],
      trim: true,
    },
    telefonoAlternativo: {
      type: String,
      trim: true,
      default: null,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email inválido'],
      default: null,
    },
    
    // Dirección
    direccion: {
      calle: { type: String, trim: true },
      numero: { type: String, trim: true },
      barrio: { type: String, trim: true },
      ciudad: { type: String, trim: true, default: 'San Miguel de Tucumán' },
      provincia: { type: String, trim: true, default: 'Tucumán' },
      codigoPostal: { type: String, trim: true },
      referencia: { type: String, trim: true }, // Ej: Mz 4, Casa 11
    },
    
    // Obra Social / Cobertura
    obraSocial: {
      nombre: { 
        type: String, 
        trim: true,
        default: 'Particular',
      },
      numeroAfiliado: { 
        type: String, 
        trim: true,
        default: null,
      },
      plan: { 
        type: String, 
        trim: true,
        default: null,
      },
      vigenciaDesde: { 
        type: Date,
        default: null,
      },
      vigenciaHasta: { 
        type: Date,
        default: null,
      },
    },
    
    // Información Médica
    diagnostico: {
      principal: { 
        type: String, 
        trim: true,
        default: null,
      },
      secundarios: [{ 
        type: String, 
        trim: true 
      }],
      observaciones: { 
        type: String, 
        trim: true,
        default: null,
      },
    },
    
    // Datos Médicos Adicionales
    medicoDerivante: {
      nombre: { type: String, trim: true },
      matricula: { type: String, trim: true },
      telefono: { type: String, trim: true },
      especialidad: { type: String, trim: true },
    },
    
    // Antecedentes
    antecedentes: {
      patologicos: { type: String, trim: true },
      quirurgicos: { type: String, trim: true },
      alergias: { type: String, trim: true },
      medicacion: { type: String, trim: true },
    },
    
    // Contacto de Emergencia
    contactoEmergencia: {
      nombre: { type: String, trim: true },
      relacion: { type: String, trim: true },
      telefono: { type: String, trim: true },
    },
    
    // Estado del Paciente
    estado: {
      type: String,
      enum: ['activo', 'inactivo', 'alta', 'derivado', 'abandono'],
      default: 'activo',
    },
    
    // Información de Pagos
    modalidadPago: {
      type: String,
      enum: ['efectivo', 'transferencia', 'tarjeta', 'obra_social', 'mixto'],
      default: 'efectivo',
    },
    valorSesion: {
      type: Number,
      default: 0,
      min: 0,
    },
    
    // Horarios Habituales (opcional)
    horariosHabituales: [{
      dia: { 
        type: String, 
        enum: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
      },
      horaEntrada: String,
      horaSalida: String,
    }],
    
    // Observaciones Generales
    observaciones: {
      type: String,
      trim: true,
      maxlength: [1000, 'Las observaciones no pueden exceder 1000 caracteres'],
    },
    
    // Documentación
    documentos: [{
      tipo: { 
        type: String, 
        enum: ['orden_medica', 'estudio', 'consentimiento', 'otro'],
      },
      nombre: String,
      url: String,
      fecha: { type: Date, default: Date.now },
    }],
    
    // Fotos (opcional para evolución)
    fotos: [{
      descripcion: String,
      url: String,
      fecha: { type: Date, default: Date.now },
    }],
    
    // Usuario que creó el registro
    creadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // Última modificación
    modificadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    
    // Fecha de alta en el sistema
    fechaAlta: {
      type: Date,
      default: Date.now,
    },
    
    // Fecha de alta médica (fin de tratamiento)
    fechaAltaMedica: {
      type: Date,
      default: null,
    },
    
    // Estadísticas rápidas (se actualizan con cada sesión)
    estadisticas: {
      totalSesiones: { type: Number, default: 0 },
      totalAbonado: { type: Number, default: 0 },
      saldoPendiente: { type: Number, default: 0 },
      ultimaSesion: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Índices para búsquedas rápidas
pacienteSchema.index({ dni: 1 });
pacienteSchema.index({ apellido: 1, nombre: 1 });
pacienteSchema.index({ estado: 1 });
pacienteSchema.index({ 'obraSocial.nombre': 1 });
pacienteSchema.index({ creadoPor: 1 });
pacienteSchema.index({ createdAt: -1 });

// Virtual para nombre completo
pacienteSchema.virtual('nombreCompleto').get(function() {
  return `${this.apellido}, ${this.nombre}`;
});

// Virtual para calcular edad desde fecha de nacimiento
pacienteSchema.virtual('edadCalculada').get(function() {
  if (!this.fechaNacimiento) return this.edad || null;
  
  const hoy = new Date();
  const nacimiento = new Date(this.fechaNacimiento);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }
  
  return edad;
});

// Método para obtener datos públicos del paciente
pacienteSchema.methods.obtenerDatosPublicos = function() {
  return {
    id: this._id,
    nombreCompleto: this.nombreCompleto,
    nombre: this.nombre,
    apellido: this.apellido,
    dni: this.dni,
    telefono: this.telefono,
    email: this.email,
    obraSocial: this.obraSocial,
    diagnostico: this.diagnostico,
    estado: this.estado,
    estadisticas: this.estadisticas,
    fechaAlta: this.fechaAlta,
    createdAt: this.createdAt,
  };
};

// Método para obtener ficha completa
pacienteSchema.methods.obtenerFichaCompleta = function() {
  const obj = this.toObject();
  obj.id = this._id;
  obj.nombreCompleto = this.nombreCompleto;
  obj.edadCalculada = this.edadCalculada;
  return obj;
};

// Middleware: Calcular edad antes de guardar
pacienteSchema.pre('save', function(next) {
  if (this.fechaNacimiento && !this.edad) {
    const hoy = new Date();
    const nacimiento = new Date(this.fechaNacimiento);
    this.edad = hoy.getFullYear() - nacimiento.getFullYear();
  }
  next();
});

// Configurar toJSON para incluir virtuals
pacienteSchema.set('toJSON', { virtuals: true });
pacienteSchema.set('toObject', { virtuals: true });

const Paciente = mongoose.model('Paciente', pacienteSchema);

export default Paciente;




