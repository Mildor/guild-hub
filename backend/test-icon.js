const axios = require('axios');
require('dotenv').config();

async function run() {
  const clientId = process.env.BNET_CLIENT_ID;
  const clientSecret = process.env.BNET_CLIENT_SECRET;
  const authHeader = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  console.log('Client ID:', clientId ? 'Found' : 'Missing');

  try {
    const tokenResponse = await axios.post(
      'https://oauth.battle.net/token',
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${authHeader}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    const token = tokenResponse.data.access_token;
    console.log('Got token');

    const itemId = 256986;
    const mediaRes = await axios.get(
      `https://eu.api.blizzard.com/data/wow/media/item/${itemId}`,
      {
        params: {
          namespace: 'static-eu',
          locale: 'fr_FR',
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log(JSON.stringify(mediaRes.data, null, 2));

  } catch (err) {
    if (err.response) {
      console.error(err.response.status, err.response.data);
    } else {
      console.error(err.message);
    }
  }
}

run();
