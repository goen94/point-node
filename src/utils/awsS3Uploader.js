const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const config = require('@src/config/config');

module.exports = async function awsS3Uploader({ file, imagePath }) {
  const fileType = file.mimetype.split('/')[1];
  const filePath = `${imagePath}.${fileType}`;

  const client = new S3Client({
    region: config.aws.region,
    credentials: {
      accessKeyId: config.aws.accessKeyId,
      secretAccessKey: config.aws.secretAccessKey,
    },
  });

  const command = new PutObjectCommand({
    Bucket: config.aws.s3BucketName,
    Key: filePath,
    Body: file.buffer,
    ACL: 'public-read',
  });

  await client.send(command);

  return { publicUrl: `${config.aws.s3BaseUrl}/${filePath}` };
};
