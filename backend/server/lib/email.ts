import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendOTP = async (to: string, otp: string) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('EMAIL_USER or EMAIL_PASS not configured. Printing OTP to console instead:');
    console.warn(`[OTP for ${to}]: ${otp}`);
    return;
  }
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject: 'Your VMS Verification Code',
    text: `Your one-time password (OTP) is: ${otp}\n\nIt will expire in 10 minutes.`,
    html: `<p>Your one-time password (OTP) is: <strong style="font-size: 1.2em;">${otp}</strong></p><p>It will expire in 10 minutes.</p>`,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Failed to send verification email');
  }
};
