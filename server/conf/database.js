import mongoose from 'mongoose';
import colors from 'colors';

/**
 * Conecta a la base de datos MongoDB
 * @returns {Promise<void>}
 */
const connectDB = async () => {
  try {
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    const conn = await mongoose.connect(process.env.MONGODB_URI, options);

    console.log(
      colors.cyan.underline.bold(
        `✓ MongoDB Conectado: ${conn.connection.host}`
      )
    );

    // Manejo de eventos de la conexión
    mongoose.connection.on('error', (err) => {
      console.error(colors.red(`✗ Error de conexión a MongoDB: ${err.message}`));
    });

    mongoose.connection.on('disconnected', () => {
      console.log(colors.yellow('⚠ MongoDB desconectado'));
    });

    mongoose.connection.on('reconnected', () => {
      console.log(colors.green('✓ MongoDB reconectado'));
    });

    // Manejo de cierre graceful
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log(colors.yellow('\n⚠ Conexión a MongoDB cerrada por terminación de la aplicación'));
      process.exit(0);
    });

  } catch (error) {
    console.error(colors.red.bold(`✗ Error al conectar a MongoDB: ${error.message}`));
    console.error(colors.red(`Stack: ${error.stack}`));
    process.exit(1);
  }
};

export default connectDB;


