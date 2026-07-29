const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function run() {
  try 
    const serviceAccountJson = process.env.GCP_SA_KEY;
    if (!serviceAccountJson) {
      throw new Error("GCP_SA_KEY environment variable is missing!");
    }

    const credentials = JSON.parse(serviceAccountJson);

    // Google API Auth
    const jwtClient = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/indexing'],
      null
    );

    await jwtClient.authorize();
    console.log('🔒 Authentication successful with Google Indexing API!');

    const urlsFile = path.join(__dirname, '../sitemap.txt');
    if (!fs.existsSync(urlsFile)) {
      console.log('⚠️ sitemap.txt file not found. Skipping indexing.');
      return;
    }

    const urls = fs.readFileSync(urlsFile, 'utf8')
      .split('\n')
      .map(u => u.trim())
      .filter(u => u.length > 0 && u.startsWith('http'));

    if (urls.length === 0) {
      console.log('⚠️ No valid URLs found in urls.txt.');
      return;
    }

    console.log(`🚀 Sending ${urls.length} URL(s) to Google Indexing API...\n`);

    const indexing = google.indexing({ version: 'v3', auth: jwtClient });

    for (const url of urls) {
      try {
        const res = await indexing.urlNotifications.publish({
          requestBody: {
            url: url,
            type: 'URL_UPDATED'
          }
        });
        console.log(`✅ Indexed: ${url} (Status: ${res.status})`);
      } catch (err) {
        console.error(`❌ Failed: ${url} ->`, err.response ? err.response.data.error.message : err.message);
      }
    }
  } catch (err) {
    console.error('❌ Action failed:', err.message);
    process.exit(1);
  }
}

run();
