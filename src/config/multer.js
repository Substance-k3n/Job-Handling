const multer = require('multer');
const path = require('path');
const { promisify } = require('util');
const minioClient = require('../utils/s3Client');

// Memory Storage (Does NOT save to PC disk)
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

/**
 * Upload to MinIO and generate proper download/preview URL
 */
const uploadToMinio = async (req, res, next) => {
  if (!req.file) return next();

  const bucketName = 'job-uploads';
  const timestamp = Date.now();
  const sanitizedFileName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `cv-${timestamp}-${sanitizedFileName}`;

  try {
    const bucketExists = promisify(minioClient.bucketExists).bind(minioClient);
    const makeBucket = promisify(minioClient.makeBucket).bind(minioClient);
    const putObject = promisify(minioClient.putObject).bind(minioClient);
    const setBucketPolicy = promisify(minioClient.setBucketPolicy).bind(minioClient);

    // Create bucket if doesn't exist
    const exists = await bucketExists(bucketName);
    if (!exists) {
      await makeBucket(bucketName, 'us-east-1');
      
      // Set public read policy
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

    // Set proper content type for browser preview/download
    const metadata = {
      'Content-Type': req.file.mimetype,
      'Content-Disposition': `inline; filename="${req.file.originalname}"` // 'inline' for preview, 'attachment' for force download
    };

    // Upload file to MinIO
    await putObject(bucketName, fileName, req.file.buffer, metadata);

    // Generate proper MinIO URL
    const minioEndpoint = process.env.MINIO_ENDPOINT || 'localhost';
    const minioPort = process.env.MINIO_PORT || '9000';
    const minioUseSSL = process.env.MINIO_USE_SSL === 'true';
    const protocol = minioUseSSL ? 'https' : 'http';
    
    // Build URL
    const minioUrl = `${protocol}://${minioEndpoint}:${minioPort}/${bucketName}/${fileName}`;
    
    // Attach to request
    req.file.minioUrl = minioUrl;
    req.file.minioFileName = fileName;
    req.file.minioBucket = bucketName;
    
    console.log('✅ File uploaded to MinIO:', minioUrl);
    console.log('📄 Original filename:', req.file.originalname);
    console.log('📦 Bucket:', bucketName);
    console.log('🔗 Accessible at:', minioUrl);
    
    next();
  } catch (err) {
    console.error('❌ MinIO Upload Error:', err.message);
    // Continue even if upload fails, but file won't be available
    next();
  }
};

/**
 * Generate presigned URL for temporary access (alternative method)
 * Useful if you want expiring links
 */
const generatePresignedUrl = async (bucketName, fileName, expirySeconds = 7 * 24 * 60 * 60) => {
  try {
    const presignedUrl = promisify(minioClient.presignedGetObject).bind(minioClient);
    const url = await presignedUrl(bucketName, fileName, expirySeconds);
    return url;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    return null;
  }
};

module.exports = { 
  upload, 
  uploadToMinio,
  generatePresignedUrl 
};