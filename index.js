require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const winston = require('winston');
const fileService = require('./services/fileService');
const database = require('./services/database');
const kdpFormatter = require('./services/kdpFormatter');

const app = express();
const port = process.env.PORT || 3000;

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// File upload middleware
const upload = fileService.configureMulter();

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Routes
app.post('/api/books', async (req, res) => {
  try {
    const { title, author } = req.body;
    const book = await database.createBook(title, author);
    res.json(book);
  } catch (error) {
    logger.error('Error creating book:', error);
    res.status(500).json({ error: 'Failed to create book' });
  }
});

app.post('/api/books/:bookId/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const bookId = req.params.bookId;
    const versions = await database.getBookVersions(bookId);
    const versionNumber = versions.length + 1;

    const fileInfo = await fileService.saveFile(req.file, bookId, versionNumber);
    res.json(fileInfo);
  } catch (error) {
    logger.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

app.get('/api/books/:bookId', async (req, res) => {
  try {
    const bookId = req.params.bookId;
    const book = await database.getBook(bookId);
    const versions = await database.getBookVersions(bookId);
    const metadata = await database.getBookMetadata(bookId);

    res.json({
      ...book,
      versions,
      metadata
    });
  } catch (error) {
    logger.error('Error getting book:', error);
    res.status(500).json({ error: 'Failed to get book' });
  }
});

app.get('/api/books/:bookId/versions/:versionId/download', async (req, res) => {
  try {
    const { bookId, versionId } = req.params;
    const versions = await database.getBookVersions(bookId);
    const version = versions.find(v => v.id === parseInt(versionId));

    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    const fileStream = await fileService.getFileStream(version.file_path);
    res.setHeader('Content-Type', `application/${version.format}`);
    res.setHeader('Content-Disposition', `attachment; filename=book-${bookId}-v${version.version_number}.${version.format}`);
    fileStream.pipe(res);
  } catch (error) {
    logger.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

app.delete('/api/books/:bookId', async (req, res) => {
  try {
    const bookId = req.params.bookId;
    await database.deleteBook(bookId);
    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    logger.error('Error deleting book:', error);
    res.status(500).json({ error: 'Failed to delete book' });
  }
});

app.post('/api/books/:bookId/format', async (req, res) => {
  try {
    const bookId = req.params.bookId;
    const { template } = req.body;
    
    const versions = await database.getBookVersions(bookId);
    const latestVersion = versions[0];
    
    if (!latestVersion || latestVersion.format !== 'docx') {
      return res.status(400).json({ error: 'No DOCX file found for formatting' });
    }

    const fileStream = await fileService.getFileStream(latestVersion.file_path);
    const formattedFiles = await kdpFormatter.formatDocument(fileStream, template);

    // Save formatted versions
    const newVersionNumber = versions.length + 1;
    await fileService.saveFile(formattedFiles.docx, bookId, newVersionNumber);
    await fileService.saveFile(formattedFiles.pdf, bookId, newVersionNumber + 1);

    res.json({
      message: 'Book formatted successfully',
      versions: await database.getBookVersions(bookId)
    });
  } catch (error) {
    logger.error('Error formatting book:', error);
    res.status(500).json({ error: 'Failed to format book' });
  }
});

// Start server
app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
}); 