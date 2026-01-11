const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres:postgres@localhost:5432/medusa-lumiera',
});

async function fixMetadata() {
  try {
    await client.connect();
    
    // Get auth identity ID
    const authResult = await client.query(`
      SELECT id FROM auth_identity 
      WHERE id LIKE '%CYZQB2%'
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (authResult.rows.length === 0) {
      console.log('❌ Auth identity not found');
      await client.end();
      return;
    }
    
    const authId = authResult.rows[0].id;
    const userId = 'user_01KEMD335TQJ7ZMHVDH40AAHGC';
    
    console.log('Auth ID:', authId);
    console.log('User ID:', userId);
    console.log('\nUpdating app_metadata...');
    
    // Update app_metadata
    const metadata = JSON.stringify({ user_id: userId });
    await client.query(
      'UPDATE auth_identity SET app_metadata = $1::jsonb WHERE id = $2',
      [metadata, authId]
    );
    
    console.log('✓ Updated app_metadata');
    
    // Check link
    const links = await client.query('SELECT * FROM "user_auth_identity" WHERE "auth_identity_id" = $1', [authId]);
    console.log('\nLinks:', links.rows.length);
    if (links.rows.length > 0) {
      console.log('  User ID:', links.rows[0].user_id);
      console.log('  Auth ID:', links.rows[0].auth_identity_id);
    }
    
    // Verify
    const result = await client.query('SELECT id, app_metadata FROM auth_identity WHERE id = $1', [authId]);
    console.log('\nAuth identity metadata:', JSON.stringify(result.rows[0]?.app_metadata, null, 2));
    
    await client.end();
    console.log('\n✓✓✓ Fix complete! Try logging in now.');
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
    await client.end();
    process.exit(1);
  }
}

fixMetadata();
