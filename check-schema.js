const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres:postgres@localhost:5432/medusa-lumiera',
});

async function checkSchema() {
  try {
    await client.connect();
    
    console.log('\n=== Promotion Table Schema ===');
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'promotion'
      ORDER BY ordinal_position
    `);
    
    columns.rows.forEach(c => {
      console.log(`${c.column_name} (${c.data_type})${c.is_nullable ? '' : ' NOT NULL'}`);
    });
    
    console.log('\n=== Promotion Rule Table Schema ===');
    const ruleColumns = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'promotion_rule'
      ORDER BY ordinal_position
    `);
    
    ruleColumns.rows.forEach(c => {
      console.log(`${c.column_name} (${c.data_type})${c.is_nullable ? '' : ' NOT NULL'}`);
    });
    
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    await client.end();
  }
}

checkSchema();
