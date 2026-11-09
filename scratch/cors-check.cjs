const { S3Client, GetBucketCorsCommand, PutBucketCorsCommand } = require('@aws-sdk/client-s3');
const client = new S3Client({
  region: 'auto',
  endpoint: 'https://1de2c446943ed08e0c9ddf857b2d4ab2.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: 'af0216991a930efce80f0a866cb47fde',
    secretAccessKey: '2b683a2fb7d172096d1af92f03beffdd0905a1ec757a71da44aab49c99750a79',
  },
});

async function checkAndSetCors() {
  try {
    const cors = await client.send(new GetBucketCorsCommand({ Bucket: 'crosdiari' }));
    console.log('CURRENT CORS:', JSON.stringify(cors.CORSRules));
  } catch (err) {
    console.log('NO CORS OR ERROR:', err.name, err.message);
  }

  // Set permissive CORS for web/mobile apps
  try {
    console.log('Setting CORS rules for crosdiari...');
    await client.send(
      new PutBucketCorsCommand({
        Bucket: 'crosdiari',
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ['*'],
              AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD', 'DELETE'],
              AllowedOrigins: ['*'],
              ExposeHeaders: ['ETag'],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      })
    );
    console.log('SUCCESSFULLY CONFIGURED CORS ON R2 BUCKET!');
  } catch (putErr) {
    console.error('FAILED TO PUT CORS:', putErr);
  }
}

checkAndSetCors();
