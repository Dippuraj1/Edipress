const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const database = require('./database');

class FileService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../uploads');
    this.ensureUploadDir();
  }

  async ensureUploadDir() {
    try {
      await fs.mkdir(this.uploadDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directory:', error);
      throw error;
    }
  }

  configureMulter() {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    });

    return multer({
      storage: storage,
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only DOCX and PDF files are allowed.'));
        }
      },
      limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
      }
    });
  }

  async saveFile(file, bookId, versionNumber) {
    try {
      const filePath = path.join(this.uploadDir, file.filename);
      const format = path.extname(file.originalname).toLowerCase().slice(1);
      
      // Save file information to database
      await database.saveBookVersion(bookId, versionNumber, filePath, format);
      
      return {
        path: filePath,
        format: format,
        originalName: file.originalname
      };
    } catch (error) {
      // Clean up file if database operation fails
      await this.deleteFile(file.path);
      throw error;
    }
  }

  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error(`Failed to delete file ${filePath}:`, error);
    }
  }

  async getFileStream(filePath) {
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) {
        throw new Error('Path is not a file');
      }
      return fs.createReadStream(filePath);
    } catch (error) {
      throw new Error(`File not found: ${error.message}`);
    }
  }

  async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        lastModified: stats.mtime,
        created: stats.birthtime
      };
    } catch (error) {
      throw new Error(`Failed to get file info: ${error.message}`);
    }
  }
}

module.exports = new FileService(); 