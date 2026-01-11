const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres:postgres@localhost:5432/medusa-lumiera',
});

async function checkDB() {
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Check users
    const users = await client.query('SELECT id, email FROM "user"');
    console.log('\nUsers:');
    users.rows.forEach(u => console.log('  ID:', u.id, 'Email:', u.email));
    
    // Check auth identities structure
    const authIdentities = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'auth_identity'
    `);
    console.log('\nAuth Identity Columns:');
    authIdentities.rows.forEach(c => console.log('  ', c.column_name, '(', c.data_type, ')'));
    
    // Get all auth identities
    const auths = await client.query('SELECT * FROM auth_identity');
    console.log('\nAuth Identities:');
    auths.rows.forEach(a => console.log('  ID:', a.id, 'Data:', JSON.stringify(a)));
    
    // Check user_auth_identity table
    const linkExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'user_auth_identity'
      )
    `);
    console.log('\nUser-Auth-Identity table exists:', linkExists.rows[0].exists);
    
    if (linkExists.rows[0].exists) {
      const links = await client.query('SELECT * FROM "user_auth_identity"');
      console.log('\nUser-Auth Links:');
      links.rows.forEach(l => console.log('  ', JSON.stringify(l)));
      if (links.rows.length === 0) {
        console.log('  NO LINKS FOUND!');
      }
    }
    
    await client.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkDB();
