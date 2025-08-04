const nodemailer = require("nodemailer");
 

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  auth: {
    user: process.env.NODE_MAILER_EMAIL,
    pass: process.env.NODE_MAILER_PASSWORD,
  },
});

exports.sendResetPasswordMail = async (email, token) => {

  console.log({
    email,
    token
  })
  const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

  const mailOptions = {
    from: process.env.NODE_MAILER_EMAIL,
    to: email,
    subject: "Réinitialisation de votre mot de passe",
    html: `
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: #fff; padding: 20px; border-radius: 8px; }
          .header { background: #0078d4; color: white; padding: 10px; text-align: center; font-size: 20px; }
          .content { padding: 20px; text-align: center; }
          .button { background: #0078d4; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">Réinitialisation du mot de passe</div>
          <div class="content">
            <p>Nous avons reçu une demande de réinitialisation de votre mot de passe.</p>
            <p>Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :</p>
            <a href="${resetLink}" class="button">Réinitialiser le mot de passe</a>
            <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet e-mail.</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Email de réinitialisation envoyé à:", email);
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'e-mail:", error);
  }
}; 
// Function to send email to admin
exports.sendEmailToAdmin = async (name, email, phone, subject, message) => {
  const mailOptions = {
    from: process.env.NODE_MAILER_EMAIL,
    to: process.env.ADMIN_EMAIL, // Admin email from environment variable
    subject: `Nouveau message de contact: ${subject}`,
    html: `
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: #fff; padding: 20px; border-radius: 8px; }
          .header { background: #0078d4; color: white; padding: 10px; text-align: center; font-size: 20px; }
          .content { padding: 20px; }
          .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">Nouveau Message de Contact</div>
          <div class="content">
            <p><strong>Nom:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Téléphone:</strong> ${phone || "Non fourni"}</p>
            <p><strong>Message:</strong></p>
            <p>${message}</p>
          </div>
          <div class="footer">Cet e-mail a été envoyé automatiquement via le formulaire de contact.</div>
        </div>
      </body>
      </html>
    `,
  };


  try {
    await transporter.sendMail(mailOptions);
    console.log("Email envoyé à l'admin avec succès.");
  } catch (error) {
    console.error("Erreur lors de l'envoi de l'e-mail à l'admin:", error);
  }
};