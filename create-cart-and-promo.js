const MEDUSA_BACKEND_URL = 'http://localhost:9000';
const PUBLISHABLE_API_KEY = 'pk_e7a96225f2b3cb0f9362f8391a9aa4d922e4d599076a08028f3b4bb3bf69fb0b';

async function createCartAndPromo() {
  try {
    console.log('Step 1: Testing backend connection...');
    const testResponse = await fetch(MEDUSA_BACKEND_URL + '/store/carts', {
      method: 'GET',
      headers: {
        'x-publishable-api-key': PUBLISHABLE_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    console.log('Test response status:', testResponse.status);
    console.log('Test response body:', await testResponse.text());

    console.log('Step 2: Login to get auth token...');
    const loginResponse = await fetch(MEDUSA_BACKEND_URL + '/auth/user/emailpass', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@lumiera.com',
        password: 'AdminPassword123'
      }),
    });

    if (!loginResponse.ok) {
      console.error('Login failed:', await loginResponse.text());
      throw new Error('Login failed');
    }

    const loginData = await loginResponse.json();
    console.log('Login success, got token type:', typeof loginData.token);

    if (!loginData.token) {
      console.error('No token in login response:', JSON.stringify(loginData));
      throw new Error('No token received');
    }

    console.log('Token length:', loginData.token ? loginData.token.length : 0);

    console.log('Step 3: Get or create cart...');
    let cartResponse = await fetch(MEDUSA_BACKEND_URL + '/store/carts', {
      method: 'GET',
      headers: {
        'x-publishable-api-key': PUBLISHABLE_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    console.log('Cart get status:', cartResponse.status);

    if (!cartResponse.ok) {
      const cartError = await cartResponse.text();
      console.error('Cart get failed:', cartError);
      const cartData = await cartResponse.json();
      throw new Error('Cart get failed: ' + cartError);
    }

    const cartData = await cartResponse.json();
    console.log('Cart data type:', typeof cartData);
    console.log('Has carts:', Array.isArray(cartData.carts));
    console.log('Carts count:', cartData.carts ? cartData.carts.length : 0);

    let cart;
    if (cartData.carts && cartData.carts.length > 0) {
      cart = cartData.carts[0];
      console.log('Using existing cart:', cart.id);
    } else {
      console.log('Creating new cart...');
      const createResponse = await fetch(MEDUSA_BACKEND_URL + '/store/carts', {
        method: 'POST',
        headers: {
          'x-publishable-api-key': PUBLISHABLE_API_KEY,
          'Content-Type': 'application/json',
        },
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create cart');
      }

      cart = await createResponse.json().cart;
      console.log('Created new cart:', cart.id);
    }

    console.log('Step 4: Create code-type promotion...');
    const promoResponse = await fetch(MEDUSA_BACKEND_URL + '/admin/promotions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + loginData.token,
      },
      body: JSON.stringify({
        code: 'TEST10',
        type: 'code',
        application_method: {
          type: 'percentage',
          value: 15,
          target_type: 'order',
        },
        campaign_identifier: 'test-promo',
        is_automatic: false,
      }),
    });

    console.log('Promo response status:', promoResponse.status);

    if (!promoResponse.ok) {
      const promoError = await promoResponse.text();
      console.error('Promo creation failed:', promoError);
      throw new Error('Failed to create promotion: ' + promoError);
    }

    const promoData = await promoResponse.json();
    console.log('✓ Promotion created!');
    console.log('  Promotion ID:', promoData.promotion.id);
    console.log('  Code:', promoData.promotion.code);
    console.log('  Type:', promoData.promotion.type);
    console.log('');

    console.log('You can now use promo code: TEST10 in cart ' + cart.id);
    
    // Verify cart
    console.log('Step 5: Verify cart has promotion...');
    const verifyResponse = await fetch(MEDUSA_BACKEND_URL + '/store/carts/' + cart.id, {
      method: 'GET',
      headers: {
        'x-publishable-api-key': PUBLISHABLE_API_KEY,
        'Authorization': 'Bearer ' + loginData.token,
      },
    });

    if (!verifyResponse.ok) {
      console.error('Verify failed');
      throw new Error('Verification failed');
    }

    const verifyData = await verifyResponse.json();
    console.log('✓ Cart verified!');
    console.log('  Cart ID:', verifyData.cart.id);
    console.log('  Has promotions:', verifyData.cart.promotions ? verifyData.cart.promotions.length : 0);
    
    if (verifyData.cart.promotions && verifyData.cart.promotions.length > 0) {
      verifyData.cart.promotions.forEach((p, i) => {
        console.log(`  Promotion ${i}:`, {
          id: p.id,
          code: p.code,
          type: p.type,
        });
      });
    }
    
    console.log('');
    console.log('🎉 SUCCESS! You can now apply promo code: TEST10 in the cart!');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

createCartAndPromo();
