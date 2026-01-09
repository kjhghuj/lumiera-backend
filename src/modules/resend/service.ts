import { AbstractNotificationProviderService } from "@medusajs/utils"
import { Resend } from "resend"
import * as path from "path"
import * as fs from "fs"
import Handlebars from "handlebars"

type ResendOptions = {
    apiKey: string
    from: string
}

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

    async send(notification: any): Promise<void> {
        const from = this.options.from || "onboarding@resend.dev"
        const { to, template, data } = notification

        if (!to) {
            throw new Error("No 'to' address provided for notification")
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
                                        <a href="http://localhost:3000/shop" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 6px; font-size: 14px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; transition: background-color 0.3s;">
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
                                            <a href="http://localhost:3000" style="color: #888; text-decoration: none; margin: 0 8px;">Website</a>
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
                console.error("Resend API Error:", error)
                throw new Error(`Resend Error: ${error.message}`)
            }

            console.log(`[Resend] ✅ Email sent to ${to} [ID: ${result?.id}] [Template: ${template}]`)

        } catch (error) {
            console.error("Resend send failed:", error)
            throw error
        }
    }
}

export default ResendNotificationProviderService
