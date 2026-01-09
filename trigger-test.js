const fetch = require('node-fetch');

const PK = 'pk_4c567b5cd395c4947001c58e74da8d70918c9076d6f1b9474a95e947ed2cf91f';

async function test() {
    try {
        console.log('Creating customer...');
        const res = await fetch('http://localhost:9000/store/customers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-publishable-api-key': PK,
                'x-publishable-key': PK
            },
            body: JSON.stringify({
                email: `valkyrie_${Date.now()}@resend.dev`,
                password: 'password123',
                first_name: 'Valkyrie',
                last_name: 'Test',
                phone: '+15555555555'
            })
        });

        const data = await res.json();
        console.log('Status:', res.status, res.statusText);
        console.log('Body:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(err);
    }
}

test();
