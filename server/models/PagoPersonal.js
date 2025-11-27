import mongoose from 'mongoose';

const pagoPersonalSchema = new mongoose.Schema(
  {
    // Mes y año del pago
    mes: {
      type: Number, // 1-12
      required: true,
      min: 1,
      max: 12,
    },
    año: {
      type: Number,
      required: true,
      min: 2000,
    },
    
    // Semana del mes (1-5)
    semana: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    
    // Día de la semana y fecha específica
    diaSemana: {
      type: String,
      enum: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'],
      required: true,
    },
    fecha: {
      type: Date,
      required: true,
      index: true,
    },
    
    // Monto del día
    monto: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    
    // Distribución del pago entre categorías/personas
    distribucion: {
      farfan: {
        type: Number,
        min: 0,
        default: 0,
      }, // 30% del total
      mica: {
        type: Number,
        min: 0,
        default: 0,
      }, // 20% del total
      ffma: {
        type: Number,
        min: 0,
        default: 0,
      }, // 50% del total
    },
    
    // Observaciones del día
    observaciones: {
      type: String,
      trim: true,
      maxlength: [500, 'Las observaciones no pueden exceder 500 caracteres'],
    },
    
    // Estado del pago
    estado: {
      type: String,
      enum: ['pendiente', 'procesado', 'pagado', 'cancelado'],
      default: 'pendiente',
    },
    
    // Usuario que creó/modificó el registro
    creadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
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

// Índices compuestos para consultas rápidas
pagoPersonalSchema.index({ año: 1, mes: 1, semana: 1 });
pagoPersonalSchema.index({ fecha: 1 });
pagoPersonalSchema.index({ año: 1, mes: 1 });
pagoPersonalSchema.index({ estado: 1, fecha: -1 });

// Índice único para evitar duplicados (mismo día en la misma semana del mes)
pagoPersonalSchema.index({ año: 1, mes: 1, semana: 1, fecha: 1 }, { unique: true });

// Virtual para calcular el total de la distribución
pagoPersonalSchema.virtual('totalDistribucion').get(function() {
  return this.distribucion.farfan + this.distribucion.mica + this.distribucion.ffma;
});

// Middleware: Calcular distribución automáticamente si no se proporciona
pagoPersonalSchema.pre('save', function(next) {
  // Si el monto existe pero la distribución no está completa o no coincide
  if (this.monto > 0) {
    // Si no se ha calculado la distribución, calcularla automáticamente
    if (this.distribucion.farfan === 0 && this.distribucion.mica === 0 && this.distribucion.ffma === 0) {
      this.distribucion.farfan = Math.round(this.monto * 0.30 * 100) / 100; // 30%
      this.distribucion.mica = Math.round(this.monto * 0.20 * 100) / 100;   // 20%
      this.distribucion.ffma = Math.round(this.monto * 0.50 * 100) / 100;   // 50%
    }
    
    // Ajustar para que la suma sea exacta
    const total = this.distribucion.farfan + this.distribucion.mica + this.distribucion.ffma;
    if (total !== this.monto) {
      // Ajustar la diferencia en ffma (la mayor proporción)
      const diferencia = this.monto - total;
      this.distribucion.ffma = Math.round((this.distribucion.ffma + diferencia) * 100) / 100;
    }
  }
  
  next();
});

// Configurar toJSON para incluir virtuals
pagoPersonalSchema.set('toJSON', { virtuals: true });
pagoPersonalSchema.set('toObject', { virtuals: true });

// Método estático para obtener planilla completa de un mes
pagoPersonalSchema.statics.obtenerPlanillaMes = async function(año, mes) {
  const registros = await this.find({ año, mes })
    .sort({ semana: 1, fecha: 1 })
    .populate('creadoPor', 'nombre apellido')
    .populate('modificadoPor', 'nombre apellido')
    .lean();
  
  // Organizar por semanas
  const planillaPorSemanas = {};
  
  registros.forEach(registro => {
    if (!planillaPorSemanas[registro.semana]) {
      planillaPorSemanas[registro.semana] = {
        semana: registro.semana,
        dias: {},
        subtotal: 0,
        distribucion: { farfan: 0, mica: 0, ffma: 0 },
      };
    }
    
    const colaborador = registro.creadoPor
      ? {
          id: registro.creadoPor._id || registro.creadoPor.id,
          nombre: registro.creadoPor.nombre,
          apellido: registro.creadoPor.apellido,
          nombreCompleto: [registro.creadoPor.nombre, registro.creadoPor.apellido]
            .filter(Boolean)
            .join(' ')
            .trim(),
        }
      : null;

    const diaNombre = registro.diaSemana;
    planillaPorSemanas[registro.semana].dias[diaNombre] = {
      fecha: registro.fecha,
      monto: registro.monto,
      distribucion: registro.distribucion,
      observaciones: registro.observaciones,
      estado: registro.estado,
      colaborador,
    };
    
    planillaPorSemanas[registro.semana].subtotal += registro.monto;
    planillaPorSemanas[registro.semana].distribucion.farfan += registro.distribucion.farfan;
    planillaPorSemanas[registro.semana].distribucion.mica += registro.distribucion.mica;
    planillaPorSemanas[registro.semana].distribucion.ffma += registro.distribucion.ffma;
  });
  
  // Calcular totales del mes
  let totalMes = 0;
  const distribucionTotal = { farfan: 0, mica: 0, ffma: 0 };
  
  Object.values(planillaPorSemanas).forEach(semana => {
    totalMes += semana.subtotal;
    distribucionTotal.farfan += semana.distribucion.farfan;
    distribucionTotal.mica += semana.distribucion.mica;
    distribucionTotal.ffma += semana.distribucion.ffma;
  });
  
  return {
    año,
    mes,
    semanas: planillaPorSemanas,
    totales: {
      total: Math.round(totalMes * 100) / 100,
      distribucion: {
        farfan: Math.round(distribucionTotal.farfan * 100) / 100,
        mica: Math.round(distribucionTotal.mica * 100) / 100,
        ffma: Math.round(distribucionTotal.ffma * 100) / 100,
      },
    },
  };
};

const PagoPersonal = mongoose.model('PagoPersonal', pagoPersonalSchema);

export default PagoPersonal;


