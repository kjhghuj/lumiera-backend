const http = require('http');
const MEDUSA_BACKEND_URL = 'http://localhost:9000';

async function createPromo() {
  try {
    console.log('Step 1: Login to get admin token...');
    const loginResponse = await http.post(MEDUSA_BACKEND_URL + '/auth/user/emailpass', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@lumiera.com',
        password: 'AdminPassword123'
      })
    });

    if (loginResponse.statusCode !== 200) {
      throw new Error('Login failed: ' + loginResponse.statusCode);
    }

    const loginData = JSON.parse(loginResponse.body);
    const token = loginData.token;
    console.log('Got token');

    console.log('Step 2: Create code-type promotion...');
    const promoResponse = await http.post(MEDUSA_BACKEND_URL + '/admin/promotions', {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({
        code: 'TEST10',
        type: 'code',
        application_method: {
          type: 'percentage',
          value: 15,
          target_type: 'order'
        },
        is_automatic: false
      })
    });

    if (promoResponse.statusCode !== 200) {
      throw new Error('Failed to create promotion: ' + await promoResponse.text());
    }

    const promoData = JSON.parse(promoResponse.body);
    console.log('');
    console.log('Promotion created successfully!');
    console.log('Promotion ID:', promoData.promotion.id);
    console.log('Promotion Code:', promoData.promotion.code);
    console.log('');
    console.log('You can now use promo code: TEST10 for 15% discount');
    console.log('Go to: http://localhost:3000/cart');
    console.log('Enter code: TEST10 and click Apply');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createPromo();
