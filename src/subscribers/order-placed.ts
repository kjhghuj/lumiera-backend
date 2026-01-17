import { SubscriberArgs, type SubscriberConfig } from "@medusajs/medusa"
import { Modules } from "@medusajs/framework/utils"
// import { INotificationModuleService } from "@medusajs/types" // Types might not be directly available if not installed, we can infer or use any if needed to avoid build error, but let's try.

export default async function orderPlacedHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    const notificationModuleService = container.resolve(
        Modules.NOTIFICATION
    )

    const query = container.resolve("query")

    const { data: orders } = await query.graph({
        entity: "order",
        fields: ["id", "total", "email", "display_id", "currency_code"],
        filters: { id: data.id }
    })

    const order = orders[0]

    if (!order) {
        console.warn(`[OrderPlacedSubscriber] Order ${data.id} not found.`)
        return
    }

    console.log(`[OrderPlacedSubscriber] Sending email for order ${order.id} to ${order.email}`)

    try {
        await notificationModuleService.createNotifications({
            to: order.email,
            channel: "email",
            template: "order_placed",
            data: {
                id: order.id,
                total: `${order.total / 100} ${order.currency_code.toUpperCase()}`, // Assuming total is in cents
            },
        })
        console.log(`[OrderPlacedSubscriber] Notification triggered successfully.`)
    } catch (error) {
        console.error(`[OrderPlacedSubscriber] Failed to trigger notification:`, error)
    }
}

export const config: SubscriberConfig = {
    event: "order.placed",
}
