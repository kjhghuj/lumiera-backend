const fetch = require('node-fetch'); // Assuming node-fetch is available, or use native fetch if Node 18+

// Native fetch is available in Node 18+
async function checkProduct() {
    // Test 3: Check 'The Wand' with corrected fields
    const url = "http://localhost:9000/store/products?handle=the-wand&fields=*variants";
    const apiKey = "pk_4c567b5cd395c4947001c58e74da8d70918c9076d6f1b9474a95e947ed2cf91f";

    console.log(`Fetching from: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                "x-publishable-api-key": apiKey
            }
        });

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error(text);
            return;
        }

        const data = await response.json();
        const product = data.products[0];

        if (!product) {
            console.error("Product not found");
            return;
        }

        console.log("Product found:", product.title);
        console.log("Variants:");
        product.variants.forEach(v => {
            console.log(`- ${v.title} (ID: ${v.id})`);
            console.log(`  Manage Inventory: ${v.manage_inventory}`);
            console.log(`  Allow Backorder: ${v.allow_backorder}`);
            console.log(`  Inventory Quantity: ${v.inventory_quantity}`);
            console.log(`  Raw Variant Keys: ${Object.keys(v).join(", ")}`);
        });

    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

checkProduct();
