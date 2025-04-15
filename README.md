# KDP Formatter Pro

A professional book formatting tool for Kindle Direct Publishing (KDP) that helps authors format their books according to KDP guidelines.

## Features

- DOCX to PDF conversion with proper formatting
- Multiple template support
- Version control for book files
- Secure file storage
- Preview functionality
- Custom formatting rules

## Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 12
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/kdp-formatter.git
cd kdp-formatter
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
- Create a PostgreSQL database
- Update the `.env` file with your database credentials

4. Start the server:
```bash
npm start
```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_USER=your_db_user
DB_HOST=localhost
DB_NAME=kdp_formatter
DB_PASSWORD=your_db_password
DB_PORT=5432

# Security
JWT_SECRET=your_jwt_secret
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs
```

## API Endpoints

- `POST /api/books` - Create a new book
- `POST /api/books/:bookId/upload` - Upload a new version
- `GET /api/books/:bookId` - Get book details and versions
- `GET /api/books/:bookId/versions/:versionId/download` - Download a specific version
- `DELETE /api/books/:bookId` - Delete a book and all its versions
- `POST /api/books/:bookId/format` - Format a book using a template

## Development

To run the development server:
```bash
npm run dev
```

To run tests:
```bash
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 