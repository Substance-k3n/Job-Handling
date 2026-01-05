const multer = require('multer');
const path = require('path');
const { promisify } = require('util');
const minioClient = require('../utils/s3Client');

// --- 1. Memory Storage (Does NOT save to PC disk) ---
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) cb(null, true);
    else cb(new Error('Only PDF and DOC/DOCX files are allowed'), false);
  }
});

// --- 2. Direct Cloud Streaming Middleware ---
const uploadToMinio = async (req, res, next) => {
  if (!req.file) return next();

  const bucketName = 'job-uploads';
  const fileName = `cv-${Date.now()}-${req.file.originalname}`;

  try {
    const bucketExists = promisify(minioClient.bucketExists).bind(minioClient);
    const makeBucket = promisify(minioClient.makeBucket).bind(minioClient);
    const putObject = promisify(minioClient.putObject).bind(minioClient);
    const setBucketPolicy = promisify(minioClient.setBucketPolicy).bind(minioClient);

    const exists = await bucketExists(bucketName);
    if (!exists) {
      await makeBucket(bucketName, 'us-east-1');
      
      const policy = {
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetBucketLocation", "s3:ListBucket"],
            Resource: [`arn:aws:s3:::${bucketName}`],
          },
          {
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      };
      await setBucketPolicy(bucketName, JSON.stringify(policy));
    }

    // --- 3. Stream from Memory (Buffer) to MinIO ---
    await putObject(bucketName, fileName, req.file.buffer);

    // Build the URL for the Admin (Browser accessible)
    req.file.minioUrl = `http://localhost:9001/${bucketName}/${fileName}`;
    
    console.log('Upload Success: File streamed directly to Cloud. No local disk trace.');
    next();
  } catch (err) {
    console.error('MinIO Streaming Error:', err.message);
    next();
  }
};

module.exports = { upload, uploadToMinio };