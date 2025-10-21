import { EmailService } from './EmailService.js';
import { UserModel } from '../models/User.js';
import { JWTUtils } from '../utils/jwt.js';
import { config } from '../config/index.js';

export class EmailVerificationService {
  private emailService: EmailService;

  constructor() {
    this.emailService = new EmailService();
  }

  async sendVerificationEmail(userId: string, email: string, fullName?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Generate verification token (expires in 24 hours)
      const verificationToken = JWTUtils.generateToken({
        userId,
        email
      });

      const verificationUrl = `${config.corsOrigin}/verify-email?token=${verificationToken}`;
      
      const emailHtml = this.generateVerificationEmailHtml(fullName || 'User', verificationUrl);

      const result = await this.emailService.sendEmail({
        from: 'Sleven <noreply@sleven.sa>',
        to: [email],
        subject: 'تأكيد حسابك - Sleven',
        html: emailHtml,
      });

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send verification email'
      };
    }
  }

  async verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
    try {
      const payload = JWTUtils.verifyToken(token);
      if (!payload) {
        return { success: false, error: 'Invalid verification token' };
      }

      // Update user as verified
      const user = await UserModel.findById(payload.userId);
      if (!user) {
        return { success: false, error: 'User not found' };
      }

      // Mark user as verified
      await UserModel.update(payload.userId, { is_verified: true });

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Email verification failed'
      };
    }
  }

  private generateVerificationEmailHtml(fullName: string, verificationUrl: string): string {
    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تأكيد حسابك - Sleven</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #4F9860;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #4F9860;
            margin-bottom: 10px;
        }
        .verify-button {
            display: inline-block;
            background-color: #4F9860;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            color: #666;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">SLEVEN</div>
            <h1>مرحباً ${fullName}! 👋</h1>
        </div>

        <div style="text-align: center;">
            <h2>أهلاً وسهلاً بك في Sleven! 🎉</h2>
            <p>شكراً لانضمامك إلينا. لتأكيد حسابك والبدء في التسوق، يرجى النقر على الزر أدناه:</p>
            
            <a href="${verificationUrl}" class="verify-button">
                تأكيد حسابي
            </a>
            
            <p>أو انسخ والصق الرابط التالي في متصفحك:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            
            <p><strong>ملاحظة:</strong> هذا الرابط صالح لمدة 24 ساعة فقط.</p>
        </div>

        <div class="footer">
            <p>إذا لم تقم بإنشاء حساب، يرجى تجاهل هذا البريد الإلكتروني.</p>
            <p style="margin-top: 20px; font-size: 12px; color: #999;">
                © 2024 Sleven. جميع الحقوق محفوظة.
            </p>
        </div>
    </div>
</body>
</html>
    `;
  }
}
