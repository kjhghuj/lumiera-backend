import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
// Use require for fs to avoid ESM issues if mixed
import * as fs from "fs"

export default async function listKeys({ container }) {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    const { data: keys } = await query.graph({
        entity: "api_key",
        fields: ["id", "token", "title", "type", "revoked_at"],
    })

    fs.writeFileSync("keys.json", JSON.stringify(keys, null, 2))
    console.log("Keys written to keys.json in " + process.cwd())
    console.log("\nKey Summary:")
    keys.forEach((key: any) => {
        const status = key.revoked_at ? "REVOKED" : "ACTIVE"
        console.log(`  - ${key.title} (${key.type}): ${key.token.substring(0, 20)}... [${status}]`)
    })
}
