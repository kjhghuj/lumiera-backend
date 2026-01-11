const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres:postgres@localhost:5432/medusa-lumiera',
});

async function checkPromoRules() {
  try {
    await client.connect();
    
    const promoId = 'promo_01KEMCVYB1QXFSQFP93T75GY4X';
    
    console.log('\n=== Checking Promotion Rules ===');
    console.log('Promotion ID:', promoId);
    
    const promo = await client.query('SELECT * FROM promotion WHERE id = $1', [promoId]);
    if (promo.rows.length === 0) {
      console.log('❌ Promotion not found');
      await client.end();
      return;
    }
    
    const p = promo.rows[0];
    console.log('Promotion Code:', p.code);
    console.log('Type:', p.type);
    console.log('Is Disabled:', p.is_disabled);
    
    const rules = await client.query('SELECT * FROM promotion_rule WHERE promotion_id = $1', [promoId]);
    console.log('\nNumber of rules:', rules.rows.length);
    if (rules.rows.length > 0) {
      rules.rows.forEach((r, i) => {
        console.log(`\n--- Rule ${i + 1} ---`);
        console.log('Type:', r.type);
        console.log('Attribute:', r.attribute);
        console.log('Operator:', r.operator);
        console.log('Values:', r.values);
      });
    }
    
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    await client.end();
  }
}

checkPromoRules();
