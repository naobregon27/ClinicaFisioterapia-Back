import sgMail from '@sendgrid/mail';
import colors from 'colors';

/**
 * Servicio para envío de emails usando SendGrid
 */
class EmailService {
  /**
   * Valida que las variables de entorno de SendGrid estén configuradas
   * @returns {Boolean}
   */
  static validarConfiguracion() {
    const apiKey = process.env.SENDGRID_API_KEY;
    const fromEmail = process.env.SENDGRID_FROM_EMAIL;

    if (!apiKey || apiKey === 'SG.tu_api_key_de_sendgrid_aqui' || apiKey.startsWith('SG.dummy')) {
      return {
        valido: false,
        error: 'SENDGRID_API_KEY no está configurada o es inválida. Por favor, configura una API key válida de SendGrid en tu archivo .env'
      };
    }

    if (!fromEmail || fromEmail === 'noreply@clinicafisioterapia.com') {
      return {
        valido: false,
        error: 'SENDGRID_FROM_EMAIL no está configurado. Por favor, configura un email de remitente válido y verificado en SendGrid'
      };
    }

    return { valido: true };
  }

  /**
   * Configura SendGrid con la API key
   */
  static configurar() {
    const apiKey = process.env.SENDGRID_API_KEY;
    
    if (apiKey && apiKey !== 'SG.tu_api_key_de_sendgrid_aqui' && !apiKey.startsWith('SG.dummy')) {
      sgMail.setApiKey(apiKey);
    }
  }

  /**
   * Envía un email genérico
   * @param {Object} options - Opciones del email
   * @returns {Promise<Object>}
   */
  static async enviarEmail({ to, subject, html, text }) {
    try {
      // Validar configuración
      const validacion = this.validarConfiguracion();
      if (!validacion.valido) {
        const errorMsg = `⚠️  ${validacion.error}`;
        console.error(colors.yellow(errorMsg));
        
        // En desarrollo, no fallar pero mostrar advertencia
        if (process.env.NODE_ENV === 'development') {
          console.log(colors.yellow('📧 Modo desarrollo: Email no enviado. El usuario se registró correctamente.'));
          console.log(colors.cyan('💡 Para habilitar el envío de emails, configura SENDGRID_API_KEY y SENDGRID_FROM_EMAIL en tu archivo .env'));
          return {
            success: false,
            message: 'Email no enviado - SendGrid no configurado',
            development: true
          };
        }
        
        // En producción, lanzar error
        throw new Error(validacion.error);
      }

      // Configurar SendGrid
      this.configurar();

      const msg = {
        to,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL,
          name: process.env.SENDGRID_FROM_NAME || 'Clínica Fisioterapia',
        },
        subject,
        text,
        html,
      };

      const response = await sgMail.send(msg);

      if (process.env.NODE_ENV === 'development') {
        console.log(colors.green('✓ Email enviado exitosamente a:'), to);
      }

      return {
        success: true,
        messageId: response[0].headers['x-message-id'],
      };
    } catch (error) {
      console.error(colors.red('✗ Error al enviar email:'), error.message);
      
      if (error.response) {
        console.error(colors.red('Detalles del error de SendGrid:'));
        console.error(colors.red(JSON.stringify(error.response.body, null, 2)));
        
        // Mensajes más específicos según el tipo de error
        if (error.response.body?.errors) {
          const sendgridError = error.response.body.errors[0];
          
          if (sendgridError.message?.includes('authorization grant')) {
            console.error(colors.red('\n🔑 Error de autenticación de SendGrid:'));
            console.error(colors.yellow('   - Verifica que tu SENDGRID_API_KEY sea válida'));
            console.error(colors.yellow('   - Asegúrate de que la API key no haya expirado'));
            console.error(colors.yellow('   - Verifica que la API key tenga permisos de "Mail Send"'));
          } else if (sendgridError.message?.includes('sender')) {
            console.error(colors.red('\n📧 Error de remitente:'));
            console.error(colors.yellow('   - Verifica que SENDGRID_FROM_EMAIL esté verificado en SendGrid'));
            console.error(colors.yellow('   - Ve a SendGrid > Settings > Sender Authentication'));
          }
        }
      }

      throw new Error(`Error al enviar el email: ${error.message}`);
    }
  }

  /**
   * Envía email de verificación de cuenta con código de 6 dígitos
   * @param {String} email - Email del destinatario
   * @param {String} nombre - Nombre del usuario
   * @param {String} verificationCode - Código de verificación de 6 dígitos
   * @returns {Promise<Object>}
   */
  static async enviarEmailVerificacion(email, nombre, verificationCode) {
    const expireMinutes = parseInt(process.env.EMAIL_VERIFICATION_EXPIRE_MINUTES || '15');

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f4f4f4;
            padding: 30px;
            border-radius: 10px;
          }
          .header {
            background-color: #4CAF50;
            color: white;
            padding: 20px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .content {
            background-color: white;
            padding: 30px;
            border-radius: 0 0 10px 10px;
          }
          .code-container {
            text-align: center;
            margin: 30px 0;
            padding: 20px;
            background-color: #f9f9f9;
            border-radius: 10px;
            border: 2px dashed #4CAF50;
          }
          .verification-code {
            font-size: 36px;
            font-weight: bold;
            letter-spacing: 8px;
            color: #4CAF50;
            font-family: 'Courier New', monospace;
            margin: 10px 0;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            font-size: 12px;
            color: #666;
          }
          .warning {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡Bienvenido a Clínica Fisioterapia!</h1>
          </div>
          <div class="content">
            <h2>Hola ${nombre},</h2>
            <p>Gracias por registrarte en nuestra plataforma. Para completar tu registro, por favor verifica tu dirección de correo electrónico usando el siguiente código:</p>
            
            <div class="code-container">
              <p style="margin: 0 0 10px 0; font-weight: bold;">Tu código de verificación es:</p>
              <div class="verification-code">${verificationCode}</div>
            </div>
            
            <div class="warning">
              <p style="margin: 0;"><strong>⚠️ Importante:</strong> Este código expirará en ${expireMinutes} minutos. No compartas este código con nadie.</p>
            </div>
            
            <p>Ingresa este código en la página de verificación para activar tu cuenta.</p>
            <p>Si no creaste una cuenta con nosotros, puedes ignorar este correo de forma segura.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Clínica Fisioterapia. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      Hola ${nombre},
      
      Gracias por registrarte en Clínica Fisioterapia. Para completar tu registro, por favor verifica tu dirección de correo electrónico usando el siguiente código:
      
      CÓDIGO DE VERIFICACIÓN: ${verificationCode}
      
      Este código expirará en ${expireMinutes} minutos.
      
      Ingresa este código en la página de verificación para activar tu cuenta.
      
      Si no creaste una cuenta con nosotros, puedes ignorar este correo.
      
      Saludos,
      Equipo de Clínica Fisioterapia
    `;

    return await this.enviarEmail({
      to: email,
      subject: 'Código de verificación - Clínica Fisioterapia',
      html,
      text,
    });
  }

  /**
   * Envía email de bienvenida (después de verificar)
   * @param {String} email - Email del destinatario
   * @param {String} nombre - Nombre del usuario
   * @returns {Promise<Object>}
   */
  static async enviarEmailBienvenida(email, nombre) {
    const loginUrl = 'https://fisioterapiamiguel.netlify.app/login';

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f4f4f4;
            padding: 30px;
            border-radius: 10px;
          }
          .header {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 10px 10px 0 0;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
          }
          .content {
            background-color: white;
            padding: 40px;
            border-radius: 0 0 10px 10px;
          }
          .success-icon {
            text-align: center;
            font-size: 64px;
            margin: 20px 0;
          }
          .button {
            display: inline-block;
            padding: 15px 40px;
            background-color: #4CAF50;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 25px 0;
            font-weight: bold;
            text-align: center;
          }
          .button-container {
            text-align: center;
            margin: 30px 0;
          }
          .features {
            background-color: #f9f9f9;
            padding: 20px;
            border-radius: 8px;
            margin: 25px 0;
          }
          .features ul {
            margin: 10px 0;
            padding-left: 20px;
          }
          .features li {
            margin: 8px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 12px;
            color: #666;
            padding-top: 20px;
            border-top: 1px solid #eee;
          }
          .highlight {
            background-color: #e8f5e9;
            padding: 15px;
            border-left: 4px solid #4CAF50;
            margin: 20px 0;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>¡Bienvenido a Clínica Fisioterapia! 🎉</h1>
          </div>
          <div class="content">
            <div class="success-icon">✅</div>
            <h2 style="text-align: center; color: #4CAF50;">¡Tu cuenta ha sido verificada exitosamente!</h2>
            
            <p style="font-size: 18px;"><strong>Hola ${nombre},</strong></p>
            
            <div class="highlight">
              <p style="margin: 0; font-weight: bold; color: #2e7d32;">
                🎊 ¡Felicidades! Ya estás dentro de la plataforma y puedes comenzar a usar todos nuestros servicios.
              </p>
            </div>
            
            <p>Tu cuenta ha sido activada correctamente y ahora tienes acceso completo a:</p>
            
            <div class="features">
              <ul>
                <li>✅ Agendar y gestionar tus citas</li>
                <li>✅ Ver tu historial de tratamientos</li>
                <li>✅ Acceder a recursos y materiales exclusivos</li>
                <li>✅ Comunicarte con nuestros profesionales</li>
                <li>✅ Y mucho más...</li>
              </ul>
            </div>
            
            <div class="button-container">
              <a href="${loginUrl}" class="button">Iniciar Sesión Ahora</a>
            </div>
            
            <p style="text-align: center; color: #666; font-size: 14px;">
              O visita: <a href="${loginUrl}" style="color: #4CAF50;">${loginUrl}</a>
            </p>
            
            <p>Si tienes alguna pregunta o necesitas ayuda, nuestro equipo está aquí para asistirte.</p>
            
            <p style="margin-top: 30px;">
              <strong>¡Esperamos verte pronto!</strong><br>
              El equipo de Clínica Fisioterapia
            </p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Clínica Fisioterapia. Todos los derechos reservados.</p>
            <p style="margin-top: 10px;">
              Este es un email automático, por favor no respondas a este mensaje.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
      ¡Bienvenido a Clínica Fisioterapia! 🎉
      
      Hola ${nombre},
      
      ¡Felicidades! Tu cuenta ha sido verificada exitosamente.
      
      🎊 Ya estás dentro de la plataforma y puedes comenzar a usar todos nuestros servicios.
      
      Tu cuenta ha sido activada correctamente y ahora tienes acceso completo a:
      ✅ Agendar y gestionar tus citas
      ✅ Ver tu historial de tratamientos
      ✅ Acceder a recursos y materiales exclusivos
      ✅ Comunicarte con nuestros profesionales
      ✅ Y mucho más...
      
      Para comenzar, inicia sesión en: ${loginUrl}
      
      Si tienes alguna pregunta o necesitas ayuda, nuestro equipo está aquí para asistirte.
      
      ¡Esperamos verte pronto!
      
      El equipo de Clínica Fisioterapia
      
      ---
      Este es un email automático, por favor no respondas a este mensaje.
      © ${new Date().getFullYear()} Clínica Fisioterapia. Todos los derechos reservados.
    `;

    return await this.enviarEmail({
      to: email,
      subject: '¡Bienvenido! Tu cuenta está activa - Clínica Fisioterapia',
      html,
      text,
    });
  }

  /**
   * Envía email de recuperación de contraseña
   * @param {String} email - Email del destinatario
   * @param {String} nombre - Nombre del usuario
   * @param {String} resetToken - Token de recuperación
   * @returns {Promise<Object>}
   */
  static async enviarEmailRecuperacion(email, nombre, resetToken) {
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #f44336;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Hola ${nombre},</h2>
          <p>Recibimos una solicitud para restablecer tu contraseña.</p>
          <p>Haz clic en el botón de abajo para crear una nueva contraseña:</p>
          <div style="text-align: center;">
            <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
          </div>
          <p>O copia y pega este enlace en tu navegador:</p>
          <p style="word-break: break-all;">${resetUrl}</p>
          <p><strong>Este enlace expirará en 1 hora.</strong></p>
          <p>Si no solicitaste restablecer tu contraseña, puedes ignorar este correo de forma segura.</p>
        </div>
      </body>
      </html>
    `;

    const text = `
      Hola ${nombre},
      
      Recibimos una solicitud para restablecer tu contraseña.
      
      Visita el siguiente enlace para crear una nueva contraseña:
      ${resetUrl}
      
      Este enlace expirará en 1 hora.
      
      Si no solicitaste restablecer tu contraseña, puedes ignorar este correo.
      
      Saludos,
      Equipo de Clínica Fisioterapia
    `;

    return await this.enviarEmail({
      to: email,
      subject: 'Recuperación de contraseña - Clínica Fisioterapia',
      html,
      text,
    });
  }
}

export default EmailService;


