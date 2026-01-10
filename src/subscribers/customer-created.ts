import { SubscriberArgs, type SubscriberConfig } from "@medusajs/medusa"
import { Modules } from "@medusajs/framework/utils"
import { randomBytes } from "crypto"

// 生成唯一优惠码
function generateDiscountCode(): string {
    const randomPart = randomBytes(3).toString("hex").toUpperCase()
    return `WELCOME-${randomPart}`
}

// 计算30天后的日期
function getExpiryDate(): Date {
    const now = new Date()
    return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
}

// 格式化日期为可读字符串
function formatDate(date: Date): string {
    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric"
    })
}

export default async function customerCreatedHandler({
    event: { data },
    container,
}: SubscriberArgs<{ id: string }>) {
    const notificationModuleService = container.resolve(Modules.NOTIFICATION)
    const customerModuleService = container.resolve(Modules.CUSTOMER)
    const promotionModuleService = container.resolve(Modules.PROMOTION)
    const logger = container.resolve("logger")

    const customer = await customerModuleService.retrieveCustomer(data.id)

    if (!customer) {
        logger.warn(`[CustomerCreatedSubscriber] Customer ${data.id} not found.`)
        return
    }

    logger.info(`[CustomerCreatedSubscriber] Processing new customer: ${customer.email}`)

    let discountCode: string | undefined
    let validUntil: string | undefined

    // 尝试创建优惠码
    try {
        const code = generateDiscountCode()
        const expiryDate = getExpiryDate()

        logger.info(`[CustomerCreatedSubscriber] Creating promotion with code: ${code}`)

        // 创建促销活动 - createPromotions 返回数组
        const promotions = await promotionModuleService.createPromotions({
            code: code,
            type: "standard",
            status: "active", // 启用状态（非草稿）
            is_automatic: true, // 自动应用方式
            application_method: {
                type: "percentage", // 百分比类型
                value: 15, // 15%
                target_type: "order",
                allocation: "across", // 跨商品分配
            },
        })

        // createPromotions 返回数组，取第一个元素
        const promotion = Array.isArray(promotions) ? promotions[0] : promotions
        logger.info(`[CustomerCreatedSubscriber] Promotion created with ID: ${promotion?.id}`)

        discountCode = code
        validUntil = formatDate(expiryDate)

        logger.info(`[CustomerCreatedSubscriber] ✅ Promotion created: ${code} (valid until ${validUntil})`)

    } catch (error) {
        logger.error(`[CustomerCreatedSubscriber] Failed to create promotion:`, error)
        // 即使优惠码创建失败，仍然发送欢迎邮件（不含优惠码）
    }

    // 发送欢迎邮件
    try {
        await notificationModuleService.createNotifications({
            to: customer.email,
            channel: "email",
            template: "customer_created",
            data: {
                first_name: customer.first_name,
                last_name: customer.last_name,
                email: customer.email,
                discountCode: discountCode,
                validUntil: validUntil,
            },
        })
        logger.info(`[CustomerCreatedSubscriber] ✅ Welcome email sent to ${customer.email}`)
    } catch (error) {
        logger.error(`[CustomerCreatedSubscriber] Failed to send welcome email:`, error)
    }
}

export const config: SubscriberConfig = {
    event: "customer.created",
}
