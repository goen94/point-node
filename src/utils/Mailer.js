const nodemailer = require('nodemailer');
const config = require('@src/config/config');

class Mailer {
  constructor({ to, subject, html = '', attachments }) {
    this.to = to;
    this.subject = subject;
    this.html = html;
    this.attachments = attachments;
  }

  async call() {
    const transporter = createTransporter();
    const info = await transporter.sendMail({
      from: config.email.from,
      to: this.to,
      subject: this.subject,
      html: this.html,
      attachments: this.attachments,
    });

    return {
      messageId: info.messageId,
      to: this.to,
    };
  }
}

// private

function createTransporter() {
  return nodemailer.createTransport({
    pool: true,
    host: config.email.smtp.host,
    port: config.email.smtp.port,
    auth: {
      user: config.email.smtp.auth.user,
      pass: config.email.smtp.auth.pass,
    },
  });
}

module.exports = Mailer;
