import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
// Use require for fs to avoid ESM issues if mixed
import * as fs from "fs"

export default async function listKeys({ container }) {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: keys } = await query.graph({
        entity: "api_key",
        fields: ["id", "token", "title", "type"],
        filters: {
            type: "publishable",
        },
    })

    fs.writeFileSync("keys.json", JSON.stringify(keys, null, 2))
    console.log("Keys written to keys.json in " + process.cwd())
}
