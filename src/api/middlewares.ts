import { defineMiddlewares } from "@medusajs/medusa"
import cors from "cors"

const STORE_CORS = process.env.STORE_CORS || "http://localhost:3030"

const corsOptions = {
    origin: STORE_CORS.split(",").map(o => o.trim()),
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-publishable-api-key", "x-medusa-access-token"],
}

export default defineMiddlewares({
    routes: [
        // Static files are served via /api/static/[[...path]]/route.ts
    ],
})

