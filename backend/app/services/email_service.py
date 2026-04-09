import os
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

logger = logging.getLogger("films.email")

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
SMTP_FROM = os.getenv("SMTP_FROM", f"Filmverse <{SMTP_USER}>")


def send_otp_email(to_email: str, otp: str, username: str = "") -> bool:
    """
    Gửi email chứa mã OTP 6 chữ số.
    Trả về True nếu thành công, False nếu lỗi (không raise để tránh leak info).
    """
    if not SMTP_USER or not SMTP_PASS:
        logger.error("SMTP chưa cấu hình — set SMTP_USER và SMTP_PASS trong .env")
        return False

    display_name = username or to_email.split("@")[0]

    html_body = f"""
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Đặt lại mật khẩu Filmvs</title>
</head>
<body style="margin:0;padding:0;background:#0a0d11;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0d11;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0"
               style="background:#13181f;border-radius:16px;border:1px solid rgba(255,255,255,0.07);overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a0a0b,#0d0d0d);padding:32px 40px;text-align:center;border-bottom:1px solid rgba(229,9,20,0.2);">
              <span style="font-family:'Arial Narrow',sans-serif;font-size:28px;font-weight:700;letter-spacing:4px;color:#f0f4ff;">
                FILM<span style="color:#e50914;">VERSE</span>
              </span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 6px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;">
                Xin chào, {display_name}
              </p>
              <h1 style="margin:0 0 20px;font-size:22px;font-weight:600;color:#f0f4ff;">
                Đặt lại mật khẩu
              </h1>
              <p style="margin:0 0 28px;font-size:15px;color:#9ca3af;line-height:1.7;">
                Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.
                Sử dụng mã OTP dưới đây — mã có hiệu lực trong <strong style="color:#f0f4ff;">15 phút</strong>.
              </p>

              <!-- OTP Box -->
              <div style="text-align:center;margin:0 0 28px;">
                <div style="display:inline-block;background:#0a0d11;border:1.5px solid #e50914;border-radius:12px;padding:20px 40px;">
                  <span style="font-family:'Courier New',monospace;font-size:38px;font-weight:700;letter-spacing:14px;color:#e50914;">
                    {otp}
                  </span>
                </div>
              </div>

              <p style="margin:0 0 8px;font-size:13px;color:#6b7280;text-align:center;">
                Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
              </p>
              <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;">
                Tài khoản của bạn vẫn an toàn.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#0e1218;padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
              <p style="margin:0;font-size:12px;color:#4b5563;">
                &copy; 2025 Filmverse — Không trả lời email này.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[Filmverse] Mã OTP đặt lại mật khẩu: {otp}"
    msg["From"]    = SMTP_FROM
    msg["To"]      = to_email
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.sendmail(SMTP_USER, [to_email], msg.as_string())
        logger.info(f"OTP email sent to {to_email}")
        return True
    except smtplib.SMTPAuthenticationError:
        logger.error("SMTP authentication failed — kiểm tra SMTP_USER / SMTP_PASS")
        return False
    except smtplib.SMTPRecipientsRefused:
        logger.warning(f"SMTP rejected recipient: {to_email}")
        return False
    except Exception as e:
        logger.error(f"Failed to send OTP email to {to_email}: {e}")
        return False