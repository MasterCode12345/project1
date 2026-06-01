package service

import (
	"fmt"
	"net/smtp"

	"project1-be/internal/config"
	"project1-be/internal/model"
)

type EmailService interface {
	SendVerificationEmail(toEmail, toName, verifyURL string) error
	SendOrderConfirmationEmail(toEmail, toName string, order *OrderEmailData) error
	SendResetPasswordEmail(toEmail, toName, resetURL string) error
}

// OrderEmailData chứa thông tin cần thiết để render email đơn hàng
type OrderEmailData struct {
	OrderCode       string
	ShippingName    string
	ShippingPhone   string
	ShippingAddress string
	Items           []OrderItemEmailData
	TotalAmount     float64
	PaymentMethod   string
}

type emailService struct {
	cfg *config.Config
}

func NewEmailService(cfg *config.Config) EmailService {
	return &emailService{cfg: cfg}
}

func (s *emailService) SendVerificationEmail(toEmail, toName, verifyURL string) error {
	// Nếu chưa cấu hình SMTP, log ra và bỏ qua (development mode)
	if s.cfg.SMTPUser == "" || s.cfg.SMTPPassword == "" {
		fmt.Printf("[email] DEV MODE — verify link cho %s: %s\n", toEmail, verifyURL)
		return nil
	}

	subject := "Xác minh tài khoản UniMarket"
	body := buildVerifyEmailHTML(toName, verifyURL)

	msg := "From: UniMarket <" + s.cfg.SMTPFrom + ">\r\n" +
		"To: " + toEmail + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=UTF-8\r\n\r\n" +
		body

	auth := smtp.PlainAuth("", s.cfg.SMTPUser, s.cfg.SMTPPassword, s.cfg.SMTPHost)
	addr := s.cfg.SMTPHost + ":" + s.cfg.SMTPPort

	if err := smtp.SendMail(addr, auth, s.cfg.SMTPFrom, []string{toEmail}, []byte(msg)); err != nil {
		return fmt.Errorf("gửi email thất bại: %w", err)
	}
	return nil
}

// OrderItemEmailData là struct phụ để truyền vào email template
type OrderItemEmailData struct {
	ProductName string
	Quantity    int
	UnitPrice   float64
	Subtotal    float64
}

func (s *emailService) SendOrderConfirmationEmail(toEmail, toName string, order *OrderEmailData) error {
	if s.cfg.SMTPUser == "" || s.cfg.SMTPPassword == "" {
		fmt.Printf("[email] DEV MODE — xác nhận đơn hàng %s gửi tới %s\n", order.OrderCode, toEmail)
		return nil
	}

	subject := fmt.Sprintf("Xác nhận đơn hàng %s — UniMarket", order.OrderCode)
	body := buildOrderConfirmationHTML(toName, order)

	msg := "From: UniMarket <" + s.cfg.SMTPFrom + ">\r\n" +
		"To: " + toEmail + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=UTF-8\r\n\r\n" +
		body

	auth := smtp.PlainAuth("", s.cfg.SMTPUser, s.cfg.SMTPPassword, s.cfg.SMTPHost)
	addr := s.cfg.SMTPHost + ":" + s.cfg.SMTPPort

	if err := smtp.SendMail(addr, auth, s.cfg.SMTPFrom, []string{toEmail}, []byte(msg)); err != nil {
		return fmt.Errorf("gửi email đơn hàng thất bại: %w", err)
	}
	return nil
}

func buildOrderConfirmationHTML(name string, o *OrderEmailData) string {
	// Build bảng sản phẩm
	itemRows := ""
	for _, item := range o.Items {
		itemRows += fmt.Sprintf(`
		<tr>
		  <td style="padding:10px 12px;border-bottom:1px solid #e7eeff;color:#111c2d;">%s</td>
		  <td style="padding:10px 12px;border-bottom:1px solid #e7eeff;text-align:center;">%d</td>
		  <td style="padding:10px 12px;border-bottom:1px solid #e7eeff;text-align:right;">%s</td>
		  <td style="padding:10px 12px;border-bottom:1px solid #e7eeff;text-align:right;font-weight:700;color:#006c49;">%s</td>
		</tr>`,
			item.ProductName,
			item.Quantity,
			formatVND(item.UnitPrice),
			formatVND(item.Subtotal),
		)
	}

	paymentLabel := paymentMethodLabel(o.PaymentMethod)

	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"></head>
<body style="font-family:Inter,sans-serif;background:#f9f9ff;margin:0;padding:32px;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 14px rgba(30,41,59,0.08);">
    <div style="background:#10b981;padding:24px 32px;">
      <h1 style="color:#ffffff;margin:0;font-size:1.4rem;">UniMarket</h1>
      <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:0.9rem;">Xác nhận đơn hàng</p>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#111c2d;margin-top:0;">Xin chào, %s!</h2>
      <p style="color:#505f76;">Đơn hàng của bạn đã được đặt thành công. Chúng tôi sẽ xử lý và liên hệ sớm nhất.</p>

      <!-- Mã đơn hàng -->
      <div style="background:#f0f3ff;border-radius:10px;padding:16px 20px;margin:20px 0;">
        <span style="color:#505f76;font-size:0.85rem;font-weight:600;">Mã đơn hàng</span><br>
        <strong style="color:#006c49;font-size:1.2rem;letter-spacing:0.04em;">%s</strong>
      </div>

      <!-- Bảng sản phẩm -->
      <table style="width:100%%;border-collapse:collapse;margin-bottom:20px;">
        <thead>
          <tr style="background:#f0f3ff;">
            <th style="padding:10px 12px;text-align:left;font-size:0.82rem;color:#505f76;font-weight:700;">Sản phẩm</th>
            <th style="padding:10px 12px;text-align:center;font-size:0.82rem;color:#505f76;font-weight:700;">SL</th>
            <th style="padding:10px 12px;text-align:right;font-size:0.82rem;color:#505f76;font-weight:700;">Đơn giá</th>
            <th style="padding:10px 12px;text-align:right;font-size:0.82rem;color:#505f76;font-weight:700;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>%s</tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="padding:14px 12px;text-align:right;font-weight:700;color:#111c2d;">Tổng cộng:</td>
            <td style="padding:14px 12px;text-align:right;font-weight:800;font-size:1.1rem;color:#006c49;">%s</td>
          </tr>
        </tfoot>
      </table>

      <!-- Thông tin giao hàng -->
      <div style="border:1px solid #e7eeff;border-radius:10px;padding:18px 20px;margin-bottom:20px;">
        <h3 style="margin:0 0 12px;color:#111c2d;font-size:1rem;">Thông tin giao hàng</h3>
        <table style="width:100%%;">
          <tr><td style="color:#505f76;font-size:0.88rem;padding:3px 0;width:130px;">Người nhận:</td><td style="font-weight:600;color:#111c2d;font-size:0.88rem;">%s</td></tr>
          <tr><td style="color:#505f76;font-size:0.88rem;padding:3px 0;">Số điện thoại:</td><td style="font-weight:600;color:#111c2d;font-size:0.88rem;">%s</td></tr>
          <tr><td style="color:#505f76;font-size:0.88rem;padding:3px 0;">Địa chỉ:</td><td style="font-weight:600;color:#111c2d;font-size:0.88rem;">%s</td></tr>
          <tr><td style="color:#505f76;font-size:0.88rem;padding:3px 0;">Thanh toán:</td><td style="font-weight:600;color:#111c2d;font-size:0.88rem;">%s</td></tr>
        </table>
      </div>

      <p style="color:#505f76;font-size:0.85rem;text-align:center;">
        Cảm ơn bạn đã tin tưởng mua sắm tại UniMarket! 🎉
      </p>
    </div>
  </div>
</body>
</html>`,
		name,
		o.OrderCode,
		itemRows,
		formatVND(o.TotalAmount),
		o.ShippingName,
		o.ShippingPhone,
		o.ShippingAddress,
		paymentLabel,
	)
}

func paymentMethodLabel(method string) string {
	switch method {
	case model.PaymentMethodCOD, "":
		return "Thanh toán khi nhận hàng (COD)"
	case model.PaymentMethodVNPay:
		return "Thanh toán qua VNPay"
	case model.PaymentMethodBankTransfer:
		return "Chuyển khoản ngân hàng"
	case model.PaymentMethodMomo:
		return "Ví MoMo"
	default:
		return method
	}
}

func formatVND(amount float64) string {
	// Format số thành "59.490.000 đ"
	intPart := int64(amount)
	s := fmt.Sprintf("%d", intPart)
	result := ""
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			result += "."
		}
		result += string(c)
	}
	return result + " đ"
}

func (s *emailService) SendResetPasswordEmail(toEmail, toName, resetURL string) error {
	if s.cfg.SMTPUser == "" || s.cfg.SMTPPassword == "" {
		fmt.Printf("[email] DEV MODE — reset password link cho %s: %s\n", toEmail, resetURL)
		return nil
	}

	subject := "Đặt lại mật khẩu — UniMarket"
	body := buildResetPasswordHTML(toName, resetURL)

	msg := "From: UniMarket <" + s.cfg.SMTPFrom + ">\r\n" +
		"To: " + toEmail + "\r\n" +
		"Subject: " + subject + "\r\n" +
		"MIME-Version: 1.0\r\n" +
		"Content-Type: text/html; charset=UTF-8\r\n\r\n" +
		body

	auth := smtp.PlainAuth("", s.cfg.SMTPUser, s.cfg.SMTPPassword, s.cfg.SMTPHost)
	if err := smtp.SendMail(s.cfg.SMTPHost+":"+s.cfg.SMTPPort, auth, s.cfg.SMTPFrom, []string{toEmail}, []byte(msg)); err != nil {
		return fmt.Errorf("gửi email reset password thất bại: %w", err)
	}
	return nil
}

func buildResetPasswordHTML(name, resetURL string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"></head>
<body style="font-family:Inter,sans-serif;background:#f9f9ff;margin:0;padding:32px;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 14px rgba(30,41,59,0.08);">
    <div style="background:#10b981;padding:28px 32px;">
      <h1 style="color:#ffffff;margin:0;font-size:1.5rem;">UniMarket</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#111c2d;margin-top:0;">Xin chào, %s!</h2>
      <p style="color:#505f76;line-height:1.6;">
        Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.<br>
        Bấm nút bên dưới để tạo mật khẩu mới.
      </p>
      <p style="color:#ba1a1a;font-size:0.88rem;">
        ⚠ Liên kết này sẽ hết hạn sau <strong>15 phút</strong>.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="%s"
           style="display:inline-block;background:#006c49;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:1rem;">
          Đặt lại mật khẩu
        </a>
      </div>
      <p style="color:#505f76;font-size:0.85rem;">
        Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Tài khoản của bạn vẫn an toàn.
      </p>
      <hr style="border:none;border-top:1px solid #e7eeff;margin:24px 0;">
      <p style="color:#505f76;font-size:0.82rem;margin:0;">
        Hoặc copy link sau vào trình duyệt:<br>
        <a href="%s" style="color:#006c49;word-break:break-all;">%s</a>
      </p>
    </div>
  </div>
</body>
</html>`, name, resetURL, resetURL, resetURL)
}

func buildVerifyEmailHTML(name, verifyURL string) string {
	return fmt.Sprintf(`<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"></head>
<body style="font-family:Inter,sans-serif;background:#f9f9ff;margin:0;padding:32px;">
  <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 14px rgba(30,41,59,0.08);">
    <div style="background:#10b981;padding:28px 32px;">
      <h1 style="color:#ffffff;margin:0;font-size:1.5rem;">UniMarket</h1>
    </div>
    <div style="padding:32px;">
      <h2 style="color:#111c2d;margin-top:0;">Xin chào, %s!</h2>
      <p style="color:#505f76;line-height:1.6;">
        Cảm ơn bạn đã đăng ký tài khoản UniMarket.<br>
        Vui lòng bấm nút bên dưới để xác minh email và kích hoạt tài khoản.
      </p>
      <p style="color:#ba1a1a;font-size:0.88rem;">
        ⚠ Liên kết này sẽ hết hạn sau <strong>30 phút</strong>.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="%s"
           style="display:inline-block;background:#006c49;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:1rem;">
          Xác minh tài khoản
        </a>
      </div>
      <p style="color:#505f76;font-size:0.85rem;">
        Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email này.
      </p>
      <hr style="border:none;border-top:1px solid #e7eeff;margin:24px 0;">
      <p style="color:#505f76;font-size:0.82rem;margin:0;">
        Hoặc copy link sau vào trình duyệt:<br>
        <a href="%s" style="color:#006c49;word-break:break-all;">%s</a>
      </p>
    </div>
  </div>
</body>
</html>`, name, verifyURL, verifyURL, verifyURL)
}
