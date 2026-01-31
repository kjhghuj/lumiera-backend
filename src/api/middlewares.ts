import { defineMiddlewares } from "@medusajs/medusa"
import cors from "cors"
import { productImageCleanupMiddleware } from "./middlewares/product-image-cleanup"

const STORE_CORS = process.env.STORE_CORS || "http://localhost:3030"

const corsOptions = {
    origin: STORE_CORS.split(",").map(o => o.trim()),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-publishable-api-key", "x-medusa-access-token"],
}

export default defineMiddlewares({
    routes: [
        {
            matcher: "/admin/products/:id",
            method: "POST",
            middlewares: [productImageCleanupMiddleware],
        },
    ],
})


