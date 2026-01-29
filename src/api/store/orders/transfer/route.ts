import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

type TransferOrderRequestBody = {
    order_id: string;
    customer_id: string;
    customer_email: string;
};

/**
 * POST /store/orders/transfer
 * 
 * Transfer a guest order to a customer.
 * This endpoint should be called after a user registers on the order confirmation page.
 * Security: The order's email must match the provided customer email.
 */
export async function POST(
    req: MedusaRequest<TransferOrderRequestBody>,
    res: MedusaResponse
) {
    const { order_id, customer_id, customer_email } = req.body;

    if (!order_id) {
        return res.status(400).json({
            type: "invalid_request",
            message: "order_id is required",
        });
    }

    if (!customer_id) {
        return res.status(400).json({
            type: "invalid_request",
            message: "customer_id is required",
        });
    }

    if (!customer_email) {
        return res.status(400).json({
            type: "invalid_request",
            message: "customer_email is required",
        });
    }

    try {
        // Resolve required modules
        const orderModule = req.scope.resolve(Modules.ORDER);

        // Step 2: Retrieve order details
        const order = await orderModule.retrieveOrder(order_id);

        if (!order) {
            return res.status(404).json({
                type: "not_found",
                message: "Order not found",
            });
        }

        // Step 3: Security Check - Verify order.email matches provided customer_email
        const orderEmail = order.email?.toLowerCase().trim();
        const providedEmail = customer_email?.toLowerCase().trim();

        if (!orderEmail || !providedEmail || orderEmail !== providedEmail) {
            console.warn(`[Transfer] Email mismatch! Order email: ${orderEmail}, Provided email: ${providedEmail}`);
            return res.status(403).json({
                type: "forbidden",
                message: "Order email does not match customer email. Cannot transfer order.",
            });
        }

        // Step 4: Update - If emails match, update the order's customer_id
        await orderModule.updateOrders(order_id, {
            customer_id: customer_id,
        });

        console.log(`[Transfer] Successfully transferred order ${order_id} to customer ${customer_id} (email verified: ${providedEmail})`);

        res.status(200).json({
            success: true,
            message: "Order transferred successfully",
            order_id: order_id,
            customer_id: customer_id,
        });
    } catch (error: any) {
        console.error("[Transfer] Failed to transfer order:", error);

        // Handle specific error cases
        if (error.message?.includes("not found")) {
            return res.status(404).json({
                type: "not_found",
                message: "Order not found",
            });
        }

        res.status(500).json({
            type: "internal_error",
            message: "Failed to transfer order",
        });
    }
}
