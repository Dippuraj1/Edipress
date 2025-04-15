const { Pool } = require('pg');
const path = require('path');
const fs = require('fs').promises;

class DatabaseService {
  constructor() {
    this.pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'kdp_formatter',
      password: process.env.DB_PASSWORD || 'postgres',
      port: process.env.DB_PORT || 5432,
    });

    this.init();
  }

  async init() {
    try {
      // Create necessary tables if they don't exist
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS books (
          id SERIAL PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          author VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status VARCHAR(50) DEFAULT 'draft'
        );

        CREATE TABLE IF NOT EXISTS book_versions (
          id SERIAL PRIMARY KEY,
          book_id INTEGER REFERENCES books(id),
          version_number INTEGER NOT NULL,
          file_path VARCHAR(255) NOT NULL,
          format VARCHAR(50) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(book_id, version_number)
        );

        CREATE TABLE IF NOT EXISTS book_metadata (
          id SERIAL PRIMARY KEY,
          book_id INTEGER REFERENCES books(id),
          key VARCHAR(255) NOT NULL,
          value TEXT,
          UNIQUE(book_id, key)
        );
      `);
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  async createBook(title, author) {
    const result = await this.pool.query(
      'INSERT INTO books (title, author) VALUES ($1, $2) RETURNING *',
      [title, author]
    );
    return result.rows[0];
  }

  async saveBookVersion(bookId, versionNumber, filePath, format) {
    const result = await this.pool.query(
      'INSERT INTO book_versions (book_id, version_number, file_path, format) VALUES ($1, $2, $3, $4) RETURNING *',
      [bookId, versionNumber, filePath, format]
    );
    return result.rows[0];
  }

  async getBook(bookId) {
    const result = await this.pool.query(
      'SELECT * FROM books WHERE id = $1',
      [bookId]
    );
    return result.rows[0];
  }

  async getBookVersions(bookId) {
    const result = await this.pool.query(
      'SELECT * FROM book_versions WHERE book_id = $1 ORDER BY version_number DESC',
      [bookId]
    );
    return result.rows;
  }

  async updateBookMetadata(bookId, key, value) {
    const result = await this.pool.query(
      `INSERT INTO book_metadata (book_id, key, value)
       VALUES ($1, $2, $3)
       ON CONFLICT (book_id, key) DO UPDATE
       SET value = $3
       RETURNING *`,
      [bookId, key, value]
    );
    return result.rows[0];
  }

  async getBookMetadata(bookId) {
    const result = await this.pool.query(
      'SELECT key, value FROM book_metadata WHERE book_id = $1',
      [bookId]
    );
    return result.rows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});
  }

  async deleteBook(bookId) {
    // First get all file paths
    const versions = await this.getBookVersions(bookId);
    
    // Delete from database
    await this.pool.query('DELETE FROM book_metadata WHERE book_id = $1', [bookId]);
    await this.pool.query('DELETE FROM book_versions WHERE book_id = $1', [bookId]);
    await this.pool.query('DELETE FROM books WHERE id = $1', [bookId]);

    // Delete files
    for (const version of versions) {
      try {
        await fs.unlink(version.file_path);
      } catch (error) {
        console.error(`Failed to delete file ${version.file_path}:`, error);
      }
    }
  }
}

module.exports = new DatabaseService(); 