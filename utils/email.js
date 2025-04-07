const nodemailer = require('nodemailer');

const sendemail = async (options) => {
  // 1) create a transporter
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    // logger: true,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASS,
    },
  });

  // 2) define the email options
  const mailoptions = {
    from: 'mohamed khalil <khm40005000@gmail.com>',
    to: options.email,
    subject: options.subject,
    text: options.message,
  };
  // 3) actually send the email
  console.log('email sending');
  await transporter.sendMail(mailoptions); // this returns a promise
  console.log('email sent');
};
module.exports = sendemail;
