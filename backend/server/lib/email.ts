import { Resend } from 'resend';


const resend = new Resend(process.env.RESEND_API_KEY);

const getFromEmail = () => process.env.RESEND_FROM_EMAIL as string;

export interface VisitEmailData {
  visitorName: string;
  visitorEmail: string;
  visitId: string;
  purpose: string;
  passType: string;
  validFrom: string;
  validUntil: string;
  vehicleNumber: string;
  hostName: string;
  approvedBy?: string;
  deniedBy?: string;
}

const generateQRCode = (data: VisitEmailData): string => {
  const qrData = JSON.stringify({
    vId: data.visitId,
    n: data.visitorName,
    e: data.visitorEmail,
    p: data.purpose,
    t: data.passType,
    d: data.validFrom,
    u: data.validUntil,
    v: data.vehicleNumber,
  });
  return `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrData)}`;
};

const wrap = (title: string, body: string) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f4f6f9;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1a1a2e;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f6f9;padding:32px 16px;"><tr><td align="center">
<table width="520" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
${body}
<tr><td align="center" style="padding:20px 28px;border-top:1px solid #f0f0f0;">
<p style="margin:0;font-size:11px;color:#bbb;line-height:1.7;">Automated message &middot; IIIT Nagpur Visitor Management System<br>Do not reply to this email</p>
</td></tr>
</table></td></tr></table></body></html>`;

const row = (label: string, value: string) => `<tr>
  <td style="padding:9px 0;border-bottom:1px solid #f5f5f5;font-size:12.5px;color:#888;white-space:nowrap;padding-right:16px;">${label}</td>
  <td style="padding:9px 0;border-bottom:1px solid #f5f5f5;font-size:12.5px;color:#1a1a2e;font-weight:600;">${value}</td>
</tr>`;

export const sendOTP = async (to: string, otp: string) => {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const body = `
<tr><td style="background:#4f46e5;padding:32px 28px;text-align:center;">
  <h1 style="margin:0;font-size:20px;font-weight:700;color:#fff;">Verify Your Email</h1>
  <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">IIIT Nagpur Visitor Management System</p>
</td></tr>
<tr><td style="padding:32px 28px;">
  <p style="margin:0 0 24px;font-size:14px;color:#555;line-height:1.7;">Use the code below to verify your email. Expires in <strong>10 minutes</strong>.</p>
  <div style="background:#f4f6f9;border-radius:10px;padding:24px;text-align:center;margin-bottom:24px;">
    <span style="font-size:38px;font-weight:800;letter-spacing:14px;color:#1a1a2e;">${otp}</span>
  </div>
  <p style="margin:0;font-size:12px;color:#bbb;">If you did not request this, ignore this email.</p>
</td></tr>`;
    const { error } = await resend.emails.send({ from: getFromEmail(), to, subject: 'Your Verification Code — IIIT Nagpur VMS', html: wrap('Verify Your Email', body) });
    if (error) console.error('[Email] OTP error:', error);
  } catch (err) { console.error('[Email] sendOTP error:', err); }
};

export const sendVisitRequestReceivedEmail = async (data: VisitEmailData) => {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const qr = generateQRCode(data);
    const body = `
<tr><td style="background:#f59e0b;padding:32px 28px;text-align:center;">
  <p style="margin:0 0 6px;font-size:22px;">&#9203;</p>
  <h1 style="margin:0;font-size:20px;font-weight:700;color:#fff;">Visit Request Received</h1>
  <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">Pending approval from Campus Administration</p>
</td></tr>
<tr><td style="padding:28px;">
  <p style="margin:0 0 22px;font-size:14px;color:#555;line-height:1.7;">Hi <strong>${data.visitorName}</strong>, your visit request has been received and is awaiting review. You will be notified once it is approved or declined.</p>
  <div style="text-align:center;margin-bottom:22px;">
    <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:0.06em;">QR Code — Not Yet Active</p>
    <div style="display:inline-block;filter:blur(5px);opacity:0.45;background:#fff;border:1px solid #eee;border-radius:10px;padding:10px;">
      <img src="${qr}" alt="QR Code" width="140" height="140" style="display:block;border-radius:4px;">
    </div>
    <p style="margin:8px 0 0;font-size:11px;color:#bbb;">Will be activated upon approval.</p>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    ${row('Reference ID', `<span style="font-family:monospace;font-size:12px;">${data.visitId}</span>`)}
    ${row('Host', data.hostName)}
    ${row('Purpose', data.purpose)}
    ${row('Visit Date', data.validFrom)}
    ${row('Status', '<span style="color:#f59e0b;">&#9203;&nbsp; Pending</span>')}
  </table>
</td></tr>`;
    const { error } = await resend.emails.send({ from: getFromEmail(), to: data.visitorEmail, subject: `Visit Request Received | Ref: ${data.visitId}`, html: wrap('Visit Request Received', body) });
    if (error) console.error('[Email] Pending error:', error);
  } catch (err) { console.error('[Email] sendVisitRequestReceivedEmail error:', err); }
};

export const sendVisitApprovedEmail = async (data: VisitEmailData) => {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const qr = generateQRCode(data);
    const body = `
<tr><td style="background:#10b981;padding:32px 28px;text-align:center;">
  <p style="margin:0 0 6px;font-size:22px;">&#9989;</p>
  <h1 style="margin:0;font-size:20px;font-weight:700;color:#fff;">Visit Approved!</h1>
  <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">Your QR code is now active &#8212; show it at the security desk</p>
</td></tr>
<tr><td style="padding:28px;">
  <p style="margin:0 0 22px;font-size:14px;color:#555;line-height:1.7;">Hi <strong>${data.visitorName}</strong>, your visit has been approved by <strong>${data.approvedBy || data.hostName}</strong>. Show the QR code at reception or the security desk on arrival.</p>
  <div style="text-align:center;margin-bottom:22px;">
    <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:0.06em;">&#10003; Active &#8212; Ready to Scan</p>
    <div style="display:inline-block;background:#fff;border:2px solid #10b981;border-radius:10px;padding:10px;box-shadow:0 4px 14px rgba(16,185,129,0.18);">
      <img src="${qr}" alt="Visit QR Code" width="160" height="160" style="display:block;border-radius:4px;">
    </div>
    <p style="margin:10px 0 0;font-size:11px;color:#10b981;font-weight:600;">Screenshot this before visiting campus.</p>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">
    ${row('Reference ID', `<span style="font-family:monospace;font-size:12px;">${data.visitId}</span>`)}
    ${row('Host', data.hostName)}
    ${row('Purpose', data.purpose)}
    ${row('Visit Date', data.validFrom)}
    ${data.passType === 'multi_day' && data.validUntil ? row('Valid Until', data.validUntil) : ''}
    ${row('Status', '<span style="color:#10b981;">&#9989;&nbsp; Approved</span>')}
  </table>
  <div style="background:#fefce8;border-left:3px solid #f59e0b;border-radius:6px;padding:12px 14px;">
    <p style="margin:0;font-size:12px;color:#92400e;line-height:1.6;"><strong>Tip:</strong> Screenshot the QR code or keep this email accessible offline &#8212; connectivity on campus may vary.</p>
  </div>
</td></tr>`;
    const { error } = await resend.emails.send({ from: getFromEmail(), to: data.visitorEmail, subject: `Visit Approved | Ref: ${data.visitId}`, html: wrap('Visit Approved', body) });
    if (error) console.error('[Email] Approved error:', error);
  } catch (err) { console.error('[Email] sendVisitApprovedEmail error:', err); }
};

export const sendVisitDeniedEmail = async (data: VisitEmailData) => {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const qr = generateQRCode(data);
    const body = `
<tr><td style="background:#ef4444;padding:32px 28px;text-align:center;">
  <p style="margin:0 0 6px;font-size:22px;">&#128683;</p>
  <h1 style="margin:0;font-size:20px;font-weight:700;color:#fff;">Visit Request Declined</h1>
  <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">Your request could not be approved at this time</p>
</td></tr>
<tr><td style="padding:28px;">
  <p style="margin:0 0 22px;font-size:14px;color:#555;line-height:1.7;">Hi <strong>${data.visitorName}</strong>, we regret to inform you that your visit request has been declined. Please contact your host <strong>${data.hostName}</strong> for further information.</p>
  <div style="text-align:center;margin-bottom:22px;">
    <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:0.06em;">QR Code &#8212; Revoked</p>
    <div style="display:inline-block;filter:blur(5px);opacity:0.4;background:#fff;border:1px solid #eee;border-radius:10px;padding:10px;">
      <img src="${qr}" alt="QR Code" width="140" height="140" style="display:block;border-radius:4px;">
    </div>
    <p style="margin:8px 0 0;font-size:11px;color:#bbb;">This QR code is not valid for campus entry.</p>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" border="0">
    ${row('Reference ID', `<span style="font-family:monospace;font-size:12px;">${data.visitId}</span>`)}
    ${row('Host', data.hostName)}
    ${row('Purpose', data.purpose)}
    ${row('Visit Date', data.validFrom)}
    ${row('Status', '<span style="color:#ef4444;">&#128683;&nbsp; Declined</span>')}
  </table>
</td></tr>`;
    const { error } = await resend.emails.send({ from: getFromEmail(), to: data.visitorEmail, subject: `Visit Request Declined | Ref: ${data.visitId}`, html: wrap('Visit Declined', body) });
    if (error) console.error('[Email] Denied error:', error);
  } catch (err) { console.error('[Email] sendVisitDeniedEmail error:', err); }
};

export const sendVisitCheckInEmail = async (data: VisitEmailData & { checkInTime?: string; entryGate?: string }) => {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const body = `
<tr><td style="background:#0284c7;padding:32px 28px;text-align:center;">
  <p style="margin:0 0 6px;font-size:22px;">&#128712;</p>
  <h1 style="margin:0;font-size:20px;font-weight:700;color:#fff;">Checked In Successfully</h1>
  <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">Welcome to IIIT Nagpur Campus</p>
</td></tr>
<tr><td style="padding:28px;">
  <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.7;">Hi <strong>${data.visitorName}</strong>, your gate entry has been recorded at <strong>${data.entryGate || 'Main Gate'}</strong>.</p>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">
    ${row('Reference ID', `<span style="font-family:monospace;font-size:12px;">${data.visitId}</span>`)}
    ${row('Check-In Time', data.checkInTime || new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }))}
    ${row('Host', data.hostName)}
    ${row('Purpose', data.purpose)}
    ${row('Gate', data.entryGate || 'Main Gate')}
    ${row('Status', '<span style="color:#0284c7;">&#10003;&nbsp; On Campus</span>')}
  </table>
  <p style="margin:0;font-size:12px;color:#888;line-height:1.6;">Please keep your badge/pass accessible until departure.</p>
</td></tr>`;
    const { error } = await resend.emails.send({ from: getFromEmail(), to: data.visitorEmail, subject: `Campus Check-In Confirmed | Ref: ${data.visitId}`, html: wrap('Check-In Confirmed', body) });
    if (error) console.error('[Email] CheckIn error:', error);
  } catch (err) { console.error('[Email] sendVisitCheckInEmail error:', err); }
};

export const sendVisitCheckOutEmail = async (data: VisitEmailData & { checkOutTime?: string; exitGate?: string }) => {
  if (!process.env.RESEND_API_KEY) return;
  try {
    const body = `
<tr><td style="background:#475569;padding:32px 28px;text-align:center;">
  <p style="margin:0 0 6px;font-size:22px;">&#128075;</p>
  <h1 style="margin:0;font-size:20px;font-weight:700;color:#fff;">Checked Out &middot; Visit Completed</h1>
  <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.85);">Thank you for visiting IIIT Nagpur</p>
</td></tr>
<tr><td style="padding:28px;">
  <p style="margin:0 0 20px;font-size:14px;color:#555;line-height:1.7;">Hi <strong>${data.visitorName}</strong>, your departure was successfully recorded at <strong>${data.exitGate || 'Main Gate'}</strong>. Your gate pass is now closed.</p>
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">
    ${row('Reference ID', `<span style="font-family:monospace;font-size:12px;">${data.visitId}</span>`)}
    ${row('Check-Out Time', data.checkOutTime || new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }))}
    ${row('Host', data.hostName)}
    ${row('Gate', data.exitGate || 'Main Exit Checkpoint')}
    ${row('Status', '<span style="color:#475569;">&#10003;&nbsp; Completed</span>')}
  </table>
  <p style="margin:0;font-size:12px;color:#888;">We hope you had a pleasant experience on campus.</p>
</td></tr>`;
    const { error } = await resend.emails.send({ from: getFromEmail(), to: data.visitorEmail, subject: `Visit Completed (Check-Out) | Ref: ${data.visitId}`, html: wrap('Visit Completed', body) });
    if (error) console.error('[Email] CheckOut error:', error);
  } catch (err) { console.error('[Email] sendVisitCheckOutEmail error:', err); }
};

