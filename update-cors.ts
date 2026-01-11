import * as fs from "fs";
import * as path from "path";

const envPath = path.join(process.cwd(), ".env");
let envContent = fs.readFileSync(envPath, "utf-8");

const lines = envContent.split("\n");
const newLines = [];

for (const line of lines) {
  if (line.startsWith("STORE_CORS=")) {
    newLines.push("STORE_CORS=http://localhost:3000,http://localhost:8000,https://docs.medusajs.com");
  } else if (line.startsWith("AUTH_CORS=")) {
    newLines.push("AUTH_CORS=http://localhost:3000,http://localhost:5173,http://localhost:9000,https://docs.medusajs.com");
  } else {
    newLines.push(line);
  }
}

fs.writeFileSync(envPath, newLines.join("\n"));
console.log("CORS configuration updated!");
