const fetch = require('node-fetch');

const PK = 'pk_4c567b5cd395c4947001c58e74da8d70918c9076d6f1b9474a95e947ed2cf91f';

async function test() {
    try {
        console.log('Using PK:', PK);
        console.log('Target Email: kjhghuj@gmail.com');

        const res = await fetch('http://localhost:9000/store/customers', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-publishable-api-key': PK
            },
            body: JSON.stringify({
                email: 'kjhghuj@gmail.com',
                password: 'password123',
                first_name: 'Test',
                last_name: 'Recipient',
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
