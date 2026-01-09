import { SubscriberArgs, type SubscriberConfig } from "@medusajs/medusa"
import { Modules } from "@medusajs/framework/utils"

export default async function customerCreatedHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    const notificationModuleService = container.resolve(
        Modules.NOTIFICATION
    )

    const customerModuleService = container.resolve(
        Modules.CUSTOMER
    )

    const customer = await customerModuleService.retrieveCustomer(data.id)

    if (!customer) {
        console.warn(`[CustomerCreatedSubscriber] Customer ${data.id} not found.`)
        return
    }

    console.log(`[CustomerCreatedSubscriber] Sending welcome email to ${customer.email}`)

    try {
        await notificationModuleService.createNotifications({
            to: customer.email,
            channel: "email",
            template: "customer_created",
            data: {
                first_name: customer.first_name,
                last_name: customer.last_name,
                email: customer.email,
            },
        })
        console.log(`[CustomerCreatedSubscriber] Welcome email triggered successfully.`)
    } catch (error) {
        console.error(`[CustomerCreatedSubscriber] Failed to trigger welcome email:`, error)
    }
}

export const config: SubscriberConfig = {
    event: "customer.created",
}
