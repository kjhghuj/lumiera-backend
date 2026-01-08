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
    static identifier = "resend-notification" // Matches the ID in medusa-config providers list, wait no, ID is configured in medusa-config. Provider identifier in class usually doesn't matter as much in V2 module loader if manual register, but good to have.
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
        // In Medusa V2, 'notification' object structure:
        // { to: string, template: string, data: object, ... }

        // It seems 'from' is not always passed in notification, so we use options.
        const from = this.options.from || "onboarding@resend.dev"
        const { to, template, data } = notification

        if (!to) {
            throw new Error("No 'to' address provided for notification")
        }

        // Template loading logic
        // We assume 'template' matches a folder name in 'data/templates'

        let htmlContent = ""
        let textContent = ""
        let subject = `Notification: ${template}`

        // Try to load template files
        try {
            const templateBaseDir = path.join(process.cwd(), "data", "templates", template)

            // Load HTML
            const htmlPath = path.join(templateBaseDir, "html.hbs")
            if (fs.existsSync(htmlPath)) {
                const htmlSource = fs.readFileSync(htmlPath, "utf-8")
                const htmlTemplate = Handlebars.compile(htmlSource)
                htmlContent = htmlTemplate(data)
            } else {
                // Fallback if file missing
                console.warn(`[Resend] HTML template not found at ${htmlPath}`)
                htmlContent = `<h1>${template}</h1><pre>${JSON.stringify(data, null, 2)}</pre>`
            }

            // Load Text (Optional)
            const textPath = path.join(templateBaseDir, "text.hbs")
            if (fs.existsSync(textPath)) {
                const textSource = fs.readFileSync(textPath, "utf-8")
                const textTemplate = Handlebars.compile(textSource)
                textContent = textTemplate(data)
            }

            // Determine Subject (could be in a subject.hbs or just generic)
            // For 'order_placed', let's make it nice.
            if (template === 'order_placed') {
                subject = `Order Confirmation #${data.display_id || data.id}`
            }

        } catch (err) {
            console.error("[Resend] Failed to load/render template:", err)
            // Fallback to simple data dump
            htmlContent = `<pre>${JSON.stringify(data, null, 2)}</pre>`
        }

        try {
            const emailOptions: any = {
                from,
                to,
                subject,
                html: htmlContent,
            }

            if (textContent) {
                emailOptions.text = textContent
            }

            const { data: result, error } = await this.resend.emails.send(emailOptions)

            if (error) {
                console.error("Resend API Usage Error:", error)
                throw new Error(`Resend Error: ${error.message}`)
            }

            console.log(`[Resend] Sent email to ${to} [ID: ${result?.id}]`)

        } catch (error) {
            console.error("Resend send failed:", error)
            throw error
        }
    }
}

export default ResendNotificationProviderService
