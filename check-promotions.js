const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres:postgres@localhost:5432/medusa-lumiera',
});

async function checkPromotions() {
  try {
    await client.connect();
    
    // Check all promotion tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE '%promotion%'
    `);
    
    console.log('\nPromotion tables:');
    tables.rows.forEach(t => console.log('  ', t.table_name));
    
    // Check promotion codes
    const promoCodes = await client.query('SELECT * FROM promotion ORDER BY created_at DESC LIMIT 10');
    console.log('\nPromotion codes:');
    if (promoCodes.rows.length === 0) {
      console.log('  No promotion codes found');
    } else {
      promoCodes.rows.forEach(p => {
        console.log('  ID:', p.id);
        console.log('    Code:', p.code);
        console.log('    Type:', p.type);
        console.log('    Status:', p.is_disabled);
      });
    }
    
    // Check campaign
    const campaigns = await client.query('SELECT * FROM promotion_campaign LIMIT 5');
    console.log('\nPromotion campaigns:');
    if (campaigns.rows.length === 0) {
      console.log('  No campaigns found');
    } else {
      campaigns.rows.forEach(c => {
        console.log('  ID:', c.id);
        console.log('    Name:', c.name);
        console.log('    Code:', c.promotion_identifier);
      });
    }
    
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    await client.end();
  }
}

checkPromotions();
