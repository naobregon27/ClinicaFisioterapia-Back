import mongoose from 'mongoose';

const sesionSchema = new mongoose.Schema(
  {
    // Paciente asociado
    paciente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Paciente',
      required: [true, 'El paciente es obligatorio'],
      index: true,
    },
    
    // Fecha de la sesión
    fecha: {
      type: Date,
      required: [true, 'La fecha es obligatoria'],
      default: Date.now,
      index: true,
    },
    
    // Tipo de sesión
    tipoSesion: {
      type: String,
      enum: ['presencial', 'domicilio', 'virtual', 'evaluacion', 'control'],
      default: 'presencial',
    },
    
    // Horarios
    horaEntrada: {
      type: String,
      trim: true,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'],
    },
    horaSalida: {
      type: String,
      trim: true,
      match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Formato de hora inválido (HH:MM)'],
    },
    
    // Duración calculada (en minutos)
    duracion: {
      type: Number,
      min: 0,
      default: 0,
    },
    
    // Número de orden del día
    numeroOrden: {
      type: Number,
      min: 1,
    },
    
    // Información de la sesión en el tratamiento
    numeroSesion: {
      type: Number,
      min: 1,
      default: null,
    }, // Número de sesión actual del paciente (ej: 3 de 10) - se calcula automáticamente
    
    // Detalles del tratamiento realizado
    detallesTratamiento: {
      descripcion: { type: String, trim: true },
      tecnicas: [{ type: String, trim: true }],
      areas: [{ type: String, trim: true }], // Zonas tratadas
      intensidad: { 
        type: String, 
        enum: ['leve', 'moderada', 'intensa'],
        default: 'moderada'
      },
    },
    
    // Evolución del paciente
    evolucion: {
      estadoGeneral: { 
        type: String,
        enum: ['mejorado', 'estable', 'empeorado'],
      },
      dolor: { 
        type: Number, 
        min: 0, 
        max: 10,
        default: null,
      }, // Escala 0-10
      movilidad: { 
        type: String,
        enum: ['limitada', 'parcial', 'completa'],
      },
      observaciones: { type: String, trim: true },
    },
    
    // Información de pago
    pago: {
      monto: { 
        type: Number, 
        required: [true, 'El monto es obligatorio'],
        min: 0,
        default: 0,
      },
      metodoPago: {
        type: String,
        enum: ['efectivo', 'transferencia', 'tarjeta', 'obra_social', 'pendiente'],
        default: 'pendiente',
      },
      pagado: {
        type: Boolean,
        default: false,
      },
      comprobante: {
        numero: { type: String, trim: true },
        tipo: { 
          type: String, 
          enum: ['factura', 'recibo', 'otro'],
        },
        url: { type: String, trim: true },
      },
      fechaPago: {
        type: Date,
        default: null,
      },
    },
    
    // Estado de la sesión
    estado: {
      type: String,
      enum: ['programada', 'realizada', 'cancelada', 'ausente', 'reprogramada'],
      default: 'programada',
    },
    
    // Motivo de cancelación/ausencia
    motivoCancelacion: {
      type: String,
      trim: true,
      maxlength: [500, 'El motivo no puede exceder 500 caracteres'],
    },
    
    // Sesión reprogramada (si se cancela y se posterga)
    sesionReprogramada: {
      fecha: { type: Date },
      sesionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sesion',
      }, // ID de la nueva sesión creada al reprogramar
    },
    
    // Observaciones generales de la sesión
    observaciones: {
      type: String,
      trim: true,
      maxlength: [1000, 'Las observaciones no pueden exceder 1000 caracteres'],
    },
    
    // Indicaciones para próxima sesión
    indicaciones: {
      type: String,
      trim: true,
      maxlength: [500, 'Las indicaciones no pueden exceder 500 caracteres'],
    },
    
    // Profesional que atendió
    profesional: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    
    // Firma digital (opcional)
    firma: {
      paciente: { type: String }, // URL o data de la firma
      profesional: { type: String },
    },
    
    // Archivos adjuntos (ej: fotos de evolución)
    adjuntos: [{
      tipo: { type: String, enum: ['foto', 'documento', 'estudio', 'otro'] },
      descripcion: String,
      url: String,
      fecha: { type: Date, default: Date.now },
    }],
    
    // Próxima sesión sugerida
    proximaSesion: {
      fecha: { type: Date },
      observaciones: { type: String, trim: true },
    },
    
    // Recordatorio enviado
    recordatorioEnviado: {
      type: Boolean,
      default: false,
    },
    
    // Metadata
    modificadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Índices compuestos para consultas frecuentes
sesionSchema.index({ paciente: 1, fecha: -1 });
sesionSchema.index({ fecha: -1 });
sesionSchema.index({ estado: 1, fecha: -1 });
sesionSchema.index({ 'pago.pagado': 1 });
sesionSchema.index({ profesional: 1, fecha: -1 });
sesionSchema.index({ createdAt: -1 });

// Índice para buscar sesiones de un día específico
sesionSchema.index({ 
  fecha: 1, 
  numeroOrden: 1 
});

// Virtual para obtener fecha formateada
sesionSchema.virtual('fechaFormateada').get(function() {
  return this.fecha.toLocaleDateString('es-AR');
});

// Método para calcular duración
sesionSchema.methods.calcularDuracion = function() {
  if (!this.horaEntrada || !this.horaSalida) return 0;
  
  const [horaE, minE] = this.horaEntrada.split(':').map(Number);
  const [horaS, minS] = this.horaSalida.split(':').map(Number);
  
  const entrada = horaE * 60 + minE;
  const salida = horaS * 60 + minS;
  
  return salida - entrada;
};

// Método para obtener datos de la planilla diaria
sesionSchema.methods.obtenerDatosPlanilla = function() {
  return {
    id: this._id,
    numeroOrden: this.numeroOrden,
    paciente: this.paciente,
    obraSocial: this.paciente?.obraSocial?.nombre,
    horaEntrada: this.horaEntrada,
    horaSalida: this.horaSalida,
    duracion: this.duracion,
    monto: this.pago.monto,
    pagado: this.pago.pagado,
    metodoPago: this.pago.metodoPago,
    estado: this.estado,
    observaciones: this.observaciones,
    fecha: this.fecha,
    numeroSesion: this.numeroSesion,
  };
};

// Middleware: Calcular duración antes de guardar
sesionSchema.pre('save', function(next) {
  if (this.horaEntrada && this.horaSalida) {
    this.duracion = this.calcularDuracion();
  }
  
  // Si se marca como pagado, actualizar fecha de pago
  if (this.pago.pagado && !this.pago.fechaPago) {
    this.pago.fechaPago = new Date();
  }
  
  next();
});

// Middleware: Actualizar estadísticas del paciente después de guardar
sesionSchema.post('save', async function(doc) {
  try {
    const Paciente = mongoose.model('Paciente');
    const Sesion = mongoose.model('Sesion');
    
    // Calcular estadísticas de TODAS las sesiones (no solo realizadas)
    const stats = await Sesion.aggregate([
      { 
        $match: { 
          paciente: doc.paciente
        } 
      },
      {
        $group: {
          _id: null,
          totalSesiones: { $sum: 1 },
          totalAbonado: { 
            $sum: { 
              $cond: [{ $eq: ['$pago.pagado', true] }, '$pago.monto', 0] 
            }
          },
          saldoPendiente: { 
            $sum: { 
              $cond: [{ $eq: ['$pago.pagado', false] }, '$pago.monto', 0] 
            }
          },
          ultimaSesion: { $max: '$fecha' },
        }
      }
    ]);
    
    // Actualizar estadísticas siempre, incluso si no hay sesiones (para resetear a 0)
    const estadisticas = stats.length > 0 ? {
      totalSesiones: stats[0].totalSesiones,
      totalAbonado: stats[0].totalAbonado,
      saldoPendiente: stats[0].saldoPendiente,
      ultimaSesion: stats[0].ultimaSesion,
    } : {
      totalSesiones: 0,
      totalAbonado: 0,
      saldoPendiente: 0,
      ultimaSesion: null,
    };
    
    await Paciente.findByIdAndUpdate(doc.paciente, {
      estadisticas: estadisticas
    });
  } catch (error) {
    console.error('Error actualizando estadísticas del paciente:', error);
  }
});

// Configurar toJSON para incluir virtuals
sesionSchema.set('toJSON', { virtuals: true });
sesionSchema.set('toObject', { virtuals: true });

const Sesion = mongoose.model('Sesion', sesionSchema);

export default Sesion;



