const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const client = new S3Client({
  region: 'auto',
  endpoint: 'https://1de2c446943ed08e0c9ddf857b2d4ab2.r2.cloudflarestorage.com',
  credentials: {
    accessKeyId: 'af0216991a930efce80f0a866cb47fde',
    secretAccessKey: '2b683a2fb7d172096d1af92f03beffdd0905a1ec757a71da44aab49c99750a79',
  },
});

async function run() {
  try {
    const res = await client.send(new ListObjectsV2Command({ Bucket: 'crosdiari' }));
    console.log('R2 OBJECTS COUNT:', res.Contents ? res.Contents.length : 0);
    if (res.Contents) {
      res.Contents.forEach((c) => {
        console.log(`- ${c.Key} (${c.Size} bytes, modified: ${c.LastModified})`);
      });
    }
  } catch (err) {
    console.error('ERROR LISTING R2:', err);
  }
}
run();
