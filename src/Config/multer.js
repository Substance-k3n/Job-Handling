const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const minioClient = require('../utils/s3Client');
// --- YOUR ORIGINAL LOCAL STORAGE CODE (KEEPING IT) ---
const uploadDir = 'uploads/cvs';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `cv-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (extname && mimetype) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF and DOC/DOCX files are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});

// --- NEW: THE MINIO COPY MIDDLEWARE ---
const uploadToMinio = async (req, res, next) => {
  if (!req.file) return next();

  const bucketName = 'job-uploads'; // Make sure this bucket exists in MinIO!
  const fileName = req.file.filename;
  const filePath = req.file.path; // This is the path to the file on your local PC

  try {
    // Promisify callback-style MinIO methods for safe async/await usage
    const bucketExists = promisify(minioClient.bucketExists).bind(minioClient);
    const makeBucket = promisify(minioClient.makeBucket).bind(minioClient);
    const fPutObject = promisify(minioClient.fPutObject).bind(minioClient);

    console.log('MinIO: checking bucket existence', { bucketName });
    const exists = await bucketExists(bucketName);
    console.log('MinIO: bucket exists?', { bucketName, exists });
    if (!exists) {
      console.log('MinIO: creating bucket', { bucketName });
      await makeBucket(bucketName, 'us-east-1');
      console.log('MinIO: bucket created', { bucketName });
    }

    console.log('MinIO: uploading file', { bucketName, fileName, filePath });
    await fPutObject(bucketName, fileName, filePath);

    // Build public URL using environment variables (fall back to localhost)
    const publicEndpoint = process.env.MINIO_PUBLIC_ENDPOINT || process.env.MINIO_ENDPOINT || 'localhost';
    const publicPort = process.env.MINIO_PORT || 9000;
    req.file.minioUrl = `http://${publicEndpoint}:${publicPort}/${bucketName}/${fileName}`;

    console.log(`File successfully copied to MinIO: ${fileName}`);
    next();
  } catch (err) {
    console.error('MinIO Upload Error:', err && err.message ? err.message : err);
    // Attach error to request for inspection
    req.file.minioError = err;
    // If configured, fail the request so the client sees the error
    if (process.env.MINIO_FAIL_FAST === 'true') {
      return next(err);
    }
    // Otherwise continue but keep verbose logs
    next();
  }
};

module.exports = { upload, uploadToMinio };