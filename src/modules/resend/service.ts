import { AbstractNotificationProviderService } from "@medusajs/utils"
import { Resend } from "resend"
import * as path from "path"
import * as fs from "fs"
import Handlebars from "handlebars"

type ResendOptions = {
    apiKey: string
    from: string
}

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class ResendNotificationProviderService extends AbstractNotificationProviderService {
    static identifier = "resend-notification"
    protected resend: Resend
    protected options: ResendOptions

    constructor({ logger }, options: ResendOptions) {
        if (!options.apiKey) {
            throw new Error(`[Resend Notification Provider] RESEND_API_KEY is required`)
        }
        super()
        this.resend = new Resend(options.apiKey)
        this.options = options
    }

    async send(notification: any): Promise<{ id: string; to: string; status: string; data: Record<string, unknown> }> {
        const from = this.options.from || "onboarding@resend.dev"
        const { to, template, data } = notification
        const frontendUrl = process.env.STOREFRONT_URL || process.env.FRONTEND_URL || "http://localhost:3000"

        if (!to) {
            throw new Error("No 'to' address provided for notification")
        }

        // Validate email format
        if (!EMAIL_REGEX.test(to)) {
            throw new Error("Invalid email address format")
        }

        let htmlContent = ""
        let textContent = ""
        let subject = `Lumiera Wellness`

        try {
            // 使用简单的 HTML 模板
            if (template === 'customer_created') {
                console.log(`[Resend] Using inline HTML template for customer_created`)

                const firstName = data.first_name || "Valued Customer"

                htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>Welcome to Lumiera</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f6f4; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <!-- Wrapper Table -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f8f6f4; padding: 40px 20px;">
        <tr>
            <td align="center">
                <!-- Main Container -->
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);">
                    
                    <!-- Header with Logo -->
                    <tr>
                        <td style="padding: 48px 48px 32px; text-align: center; background: linear-gradient(135deg, #fdfcfb 0%, #f9f7f5 100%);">
                            <h1 style="margin: 0; font-size: 32px; font-weight: 300; letter-spacing: 8px; color: #2c2c2c; text-transform: uppercase;">LUMIERA</h1>
                            <p style="margin: 8px 0 0; font-size: 11px; letter-spacing: 3px; color: #999; text-transform: uppercase;">Premium Intimate Wellness</p>
                        </td>
                    </tr>
                    
                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 40px 48px;">
                            <!-- Welcome Heading -->
                            <h2 style="margin: 0 0 24px; font-size: 28px; font-weight: 400; color: #1a1a1a; letter-spacing: -0.5px;">Welcome, ${firstName}.</h2>
                            
                            <!-- Intro Text -->
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 28px; color: #4a4a4a;">
                                Thank you for joining Lumiera. We're honoured to welcome you to a community that values quality, discretion, and self-care.
                            </p>
                            
                            <p style="margin: 0 0 32px; font-size: 16px; line-height: 28px; color: #4a4a4a;">
                                Our carefully curated collection is designed with your well-being in mind — crafted from premium materials and delivered with the utmost care.
                            </p>
                            
                            ${data.discountCode ? `
                            <!-- Discount Code Section -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 32px 0;">
                                <tr>
                                    <td style="background: linear-gradient(135deg, #f8f6f4 0%, #f0ebe6 100%); border-radius: 12px; padding: 32px; text-align: center; border: 1px solid #e8e4df;">
                                        <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 2px; color: #888; text-transform: uppercase;">Your Exclusive Welcome Gift</p>
                                        <p style="margin: 0 0 16px; font-size: 16px; color: #4a4a4a;">Enjoy <strong style="color: #1a1a1a;">15% off</strong> your first order</p>
                                        
                                        <div style="background-color: #ffffff; border: 2px dashed #ccc; border-radius: 8px; padding: 16px 24px; display: inline-block; margin: 8px 0;">
                                            <span style="font-size: 24px; font-weight: 700; letter-spacing: 3px; color: #1a1a1a;">${data.discountCode}</span>
                                        </div>
                                        
                                        ${data.validUntil ? `<p style="margin: 16px 0 0; font-size: 13px; color: #999;">Valid until ${data.validUntil}</p>` : ''}
                                    </td>
                                </tr>
                            </table>
                            ` : ''}
                            
                            <!-- CTA Button -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center" style="padding: 16px 0 32px;">
                                        <a href="${frontendUrl}/shop" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 14px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; transition: background-color 0.3s;">
                                            Explore Our Collection
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            
                            <!-- Support Note -->
                            <p style="margin: 0; font-size: 14px; line-height: 24px; color: #888; border-top: 1px solid #eee; padding-top: 24px;">
                                Have questions? Simply reply to this email — our team is here to help with anything you need.
                            </p>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 32px 48px; background-color: #fafafa; border-top: 1px solid #eee;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td align="center">
                                        <p style="margin: 0 0 12px; font-size: 12px; color: #999; letter-spacing: 2px; text-transform: uppercase;">
                                            Lumiera Wellness Ltd
                                        </p>
                                        <p style="margin: 0 0 16px; font-size: 12px; color: #bbb;">
                                            London, United Kingdom
                                        </p>
                                        <p style="margin: 0; font-size: 12px;">
                                            <a href="${frontendUrl}" style="color: #888; text-decoration: none; margin: 0 8px;">Website</a>
                                            <span style="color: #ddd;">•</span>
                                            <a href="https://instagram.com/lumiera" style="color: #888; text-decoration: none; margin: 0 8px;">Instagram</a>
                                            <span style="color: #ddd;">•</span>
                                            <a href="mailto:support@lumierawellness.com" style="color: #888; text-decoration: none; margin: 0 8px;">Contact</a>
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    
                </table>
                
                <!-- Unsubscribe Footer -->
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; width: 100%;">
                    <tr>
                        <td style="padding: 24px; text-align: center;">
                            <p style="margin: 0; font-size: 11px; color: #bbb;">
                                You're receiving this email because you created an account at Lumiera.
                            </p>
                        </td>
                    </tr>
                </table>
                
            </td>
        </tr>
    </table>
</body>
</html>
                `

                subject = `Welcome to Lumiera, ${firstName}`

            } else if (template === 'order_placed') {
                console.log(`[Resend] Using inline HTML template for order_placed`)

                const firstName = data.first_name || "Valued Customer"
                // Prioritize actual ID (ULID) over display_id (sequential number)
                const fullOrderId = String(data.id || data.display_id || "N/A")
                // Extract ULID from order ID (remove order_ prefix)
                const orderId = fullOrderId.startsWith('order_') ? fullOrderId.substring(6) : fullOrderId
                const orderTotal = data.total || "0.00"
                const currencyCode = (data.currency_code || "USD").toUpperCase()

                // Build items HTML if items are available
                let itemsHtml = ""
                if (data.items && Array.isArray(data.items)) {
                    for (const item of data.items) {
                        const itemName = item.title || item.product_title || "Product"
                        const itemVariant = item.variant_title || ""
                        const itemQty = item.quantity || 1
                        const itemPrice = item.unit_price ? (item.unit_price / 100).toFixed(2) : "0.00"
                        const itemImage = item.thumbnail || "https://placehold.co/90x110/f8f6f4/999999?text=Product"

                        const itemTotal = item.unit_price ? ((item.unit_price * itemQty) / 100).toFixed(2) : "0.00"

                        itemsHtml += `
                        <tr>
                            <td style="padding: 20px 0; border-bottom: 1px dashed #F0F0F0;">
                                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                    <tbody><tr>
                                        <td width="90" valign="top">
                                            <img src="${itemImage}" alt="${itemName}" width="90" height="110" style="display: block; object-fit: cover; border-radius: 2px;">
                                        </td>
                                        <td valign="top" style="padding-left: 20px;">
                                            <p style="margin: 0 0 8px 0; font-size: 16px; color: #3E3E3E; font-family: 'Playfair Display', Georgia, serif;">${itemName}</p>
                                            ${itemVariant ? `<p style="margin: 0 0 5px 0; font-size: 13px; color: #999999; font-family: 'Lato', Helvetica, Arial, sans-serif;">${itemVariant}</p>` : ""}
                                            <p style="margin: 0; font-size: 13px; color: #999999; font-family: 'Lato', Helvetica, Arial, sans-serif;">Qty: ${itemQty} x ${currencyCode} ${itemPrice}</p>
                                        </td>
                                        <td valign="top" align="right" style="white-space: nowrap;">
                                            <p style="margin: 0; font-size: 15px; color: #3E3E3E; font-family: 'Lato', Helvetica, Arial, sans-serif;">${currencyCode} ${itemTotal}</p>
                                        </td>
                                    </tr>
                                </tbody></table>
                            </td>
                        </tr>`
                    }
                }

                // Calculate subtotal and shipping
                const subtotal = data.subtotal ? (data.subtotal / 100).toFixed(2) : orderTotal
                const shipping = data.shipping_total ? (data.shipping_total / 100).toFixed(2) : "0.00"
                const total = data.total ? (data.total / 100).toFixed(2) : orderTotal

                htmlContent = `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <title>Your Order Confirmation - LUMIERA</title>
    <link href="https://fonts.googleapis.com/css2?family=Lato:wght@400;700&family=Playfair+Display:wght@400;600&display=swap" rel="stylesheet">
    <style>
        body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
        table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; display: block; }
        table { border-collapse: collapse !important; }
        body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #FDFCF8; -webkit-font-smoothing: antialiased; }
        .font-serif { font-family: 'Playfair Display', Georgia, 'Times New Roman', serif; }
        .font-sans { font-family: 'Lato', Helvetica, Arial, sans-serif; }
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; padding: 0 !important; }
            .mobile-pad { padding-left: 20px !important; padding-right: 20px !important; }
            .img-full { width: 100% !important; height: auto !important; }
        }
    </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FDFCF8;">
    <table role="presentation" align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #F0F0F0;">
        <tbody>
            <!-- Header Logo -->
            <tr>
                <td align="center" style="padding: 40px 0 20px 0;">
                    <h1 class="font-serif" style="margin: 0; font-size: 26px; letter-spacing: 0.2em; text-transform: uppercase; color: #3E3E3E; font-family: 'Playfair Display', Georgia, serif;">LUMIERA</h1>
                </td>
            </tr>

            <!-- Main Content -->
            <tr>
                <td align="center" class="mobile-pad" style="padding: 0 40px 30px 40px;">
                    <p class="font-sans" style="margin: 0 0 15px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #999999; font-family: 'Lato', Helvetica, Arial, sans-serif;">Order #${orderId}</p>
                    <h2 class="font-serif" style="margin: 0 0 25px 0; font-size: 32px; line-height: 1.2; color: #3E3E3E; font-weight: 400; font-family: 'Playfair Display', Georgia, serif;">Your ritual awaits.</h2>
                    <p class="font-sans" style="margin: 0 0 15px 0; font-size: 15px; line-height: 1.7; color: #555555; font-family: 'Lato', Helvetica, Arial, sans-serif;">
                        Hello ${firstName}, thank you for choosing LUMIERA. We are preparing your order with care. As promised, it will be shipped in <strong>100% discreet packaging</strong> to ensure your privacy.
                    </p>
                </td>
            </tr>

            <!-- Order Items -->
            ${itemsHtml ? `
            <tr>
                <td class="mobile-pad" style="padding: 10px 40px 0 40px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top: 1px solid #F0F0F0;">
                        <tbody>${itemsHtml}</tbody>
                    </table>
                </td>
            </tr>
            ` : ""}

            <!-- Order Summary -->
            <tr>
                <td class="mobile-pad" style="padding: 0 40px 35px 40px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tbody>
                            <tr>
                                <td class="font-sans" style="padding-top: 10px; font-size: 14px; color: #787878; font-family: 'Lato', Helvetica, Arial, sans-serif;">Subtotal</td>
                                <td align="right" class="font-sans" style="padding-top: 10px; font-size: 14px; color: #3E3E3E; font-family: 'Lato', Helvetica, Arial, sans-serif;">${currencyCode} ${subtotal}</td>
                            </tr>
                            <tr>
                                <td class="font-sans" style="padding-top: 12px; padding-bottom: 15px; font-size: 14px; color: #787878; font-family: 'Lato', Helvetica, Arial, sans-serif;">Shipping (Standard Discreet)</td>
                                <td align="right" class="font-sans" style="padding-top: 12px; padding-bottom: 15px; font-size: 14px; color: #3E3E3E; font-family: 'Lato', Helvetica, Arial, sans-serif;">${currencyCode} ${shipping}</td>
                            </tr>
                            <tr>
                                <td class="font-serif" style="padding-top: 20px; font-size: 20px; font-weight: 400; border-top: 1px solid #E5E5E5; color: #3E3E3E; font-family: 'Playfair Display', Georgia, serif;">Total</td>
                                <td align="right" class="font-sans" style="padding-top: 20px; font-size: 22px; font-weight: 700; border-top: 1px solid #E5E5E5; color: #B08B7D; font-family: 'Lato', Helvetica, Arial, sans-serif;">${currencyCode} ${total}</td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>

            <!-- CTA Button -->
            <tr>
                <td align="center" class="mobile-pad" style="padding: 0 40px 45px 40px;">
                    <a href="${frontendUrl}/order/lookup?order=${orderId}&email=${data.email || ""}" target="_blank" style="background-color: #3E3E3E; color: #ffffff; padding: 16px 35px; text-decoration: none; font-family: 'Lato', sans-serif; font-size: 13px; text-transform: uppercase; letter-spacing: 0.15em; font-weight: bold; display: inline-block; border-radius: 2px;">
                        View Order Details
                    </a>
                </td>
            </tr>

            <!-- What happens next -->
            <tr>
                <td class="mobile-pad" style="background-color: #F9F8F6; padding: 35px 40px;">
                    <h3 class="font-serif" style="margin: 0 0 20px 0; font-size: 18px; color: #3E3E3E; font-weight: 400; font-family: 'Playfair Display', Georgia, serif;">What happens next?</h3>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tbody>
                            <tr>
                                <td width="25" valign="top" style="padding-top: 4px;">
                                    <div style="width: 8px; height: 8px; background-color: #B08B7D; border-radius: 50%;"></div>
                                </td>
                                <td class="font-sans" style="padding-bottom: 15px; font-size: 14px; line-height: 1.6; color: #555555; font-family: 'Lato', Helvetica, Arial, sans-serif;">
                                    <strong>Order Processing:</strong> Please allow 1-2 business days for us to prepare your order gently.
                                </td>
                            </tr>
                            <tr>
                                <td width="25" valign="top" style="padding-top: 4px;">
                                    <div style="width: 8px; height: 8px; background-color: #B08B7D; border-radius: 50%;"></div>
                                </td>
                                <td class="font-sans" style="padding-bottom: 15px; font-size: 14px; line-height: 1.6; color: #555555; font-family: 'Lato', Helvetica, Arial, sans-serif;">
                                    <strong>Shipping & Tracking:</strong> Once shipped, you'll receive a separate email with a discreet tracking link.
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </td>
            </tr>

            <!-- Footer -->
            <tr>
                <td align="center" class="mobile-pad" style="padding: 40px 40px 30px 40px; background-color: #FDFCF8;">
                    <p class="font-sans" style="margin: 0 0 12px 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #999999; font-family: 'Lato', Helvetica, Arial, sans-serif;">
                        LUMIERA LTD • London, United Kingdom
                    </p>
                    <p class="font-sans" style="margin: 0; font-size: 12px; color: #787878; font-family: 'Lato', Helvetica, Arial, sans-serif;">
                        Questions? <a href="mailto:support@lumierawellness.com" style="color: #B08B7D; text-decoration: none;">support@lumierawellness.com</a>
                    </p>
                </td>
            </tr>
        </tbody>
    </table>
</body>
</html>
`

                subject = `Order Confirmation #${orderId}`

            } else {  // 回退到 Handlebars 模板
                console.log(`[Resend] Using Handlebars template for ${template}`)
                const templateBaseDir = path.join(process.cwd(), "data", "templates", template)

                // Load HTML
                const htmlPath = path.join(templateBaseDir, "html.hbs")
                if (fs.existsSync(htmlPath)) {
                    const htmlSource = fs.readFileSync(htmlPath, "utf-8")
                    const htmlTemplate = Handlebars.compile(htmlSource)
                    htmlContent = htmlTemplate(data)
                } else {
                    console.warn(`[Resend] No template found for ${template}`)
                    htmlContent = `<h1>${template}</h1><pre>${JSON.stringify(data, null, 2)}</pre>`
                }

                // Load Text (Optional)
                const textPath = path.join(templateBaseDir, "text.hbs")
                if (fs.existsSync(textPath)) {
                    const textSource = fs.readFileSync(textPath, "utf-8")
                    const textTemplate = Handlebars.compile(textSource)
                    textContent = textTemplate(data)
                }

                if (template === 'order_placed') {
                    subject = `Order Confirmation #${data.display_id || data.id}`
                }
            }

        } catch (err) {
            console.error("[Resend] Failed to render template:", err)
            htmlContent = `<pre>${JSON.stringify(data, null, 2)}</pre>`
        }

        try {
            const emailOptions: any = {
                from,
                to,
                subject,
                html: htmlContent,
                reply_to: "support@lumierawellness.com"
            }

            if (textContent) {
                emailOptions.text = textContent
            }

            const { data: result, error } = await this.resend.emails.send(emailOptions)

            if (error) {
                console.error("[Resend] Email send failed:", error.message || "Unknown error")
                throw new Error("Failed to send email notification")
            }

            console.log(`[Resend] ✅ Email sent to ${to} [ID: ${result?.id}] [Template: ${template}]`)

            // Medusa v2 要求返回包含 id, to, status, data 的对象
            return {
                id: result?.id || `email-${Date.now()}`,
                to,
                status: "sent",
                data: {
                    resend_id: result?.id,
                    template,
                }
            }
        } catch (error) {
            console.error("[Resend] Send operation failed:", error instanceof Error ? error.message : "Unknown error")
            throw new Error("Email notification failed")
        }
    }
}

export default ResendNotificationProviderService
