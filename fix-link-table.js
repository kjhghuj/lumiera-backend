const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgres://postgres:postgres@localhost:5432/medusa-lumiera',
});

async function fixLink() {
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Get latest auth identity for emailpass
    const authResult = await client.query(`
      SELECT id, app_metadata 
      FROM auth_identity 
      WHERE id LIKE '%01KEMCYZQB2%'
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (authResult.rows.length === 0) {
      console.log('❌ Auth identity not found');
      await client.end();
      return;
    }
    
    const authId = authResult.rows[0].id;
    console.log('✓ Found auth identity:', authId);
    
    // Get user
    const userId = 'user_01KEMD335TQJ7ZMHVDH40AAHGC';
    const userResult = await client.query('SELECT id FROM "user" WHERE id = $1', [userId]);
    
    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      await client.end();
      return;
    }
    
    console.log('✓ Found user:', userId);
    
    // Create link table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "user_auth_identity" (
        "user_id" text NOT NULL,
        "auth_identity_id" text NOT NULL,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
        "deleted_at" timestamp with time zone
      )
    `);
    console.log('✓ Created user_auth_identity table');
    
    // Insert link
    await client.query(`
      INSERT INTO "user_auth_identity" ("user_id", "auth_identity_id")
      VALUES ($1, $2)
      ON CONFLICT ("user_id", "auth_identity_id") DO NOTHING
    `, [userId, authId]);
    console.log('✓ Created link!');
    
    // Verify
    const links = await client.query('SELECT * FROM "user_auth_identity"');
    console.log('\nLinks in table:', links.rows.length);
    links.rows.forEach(l => {
      console.log('  User:', l.user_id);
      console.log('  Auth:', l.auth_identity_id);
    });
    
    await client.end();
    console.log('\n✓✓✓ Fix complete! Try logging in now.');
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
    await client.end();
    process.exit(1);
  }
}

fixLink();
