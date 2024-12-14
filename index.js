// Import required modules
import express from 'express';
import bodyParser from 'body-parser';
import pg from 'pg';
import env from 'dotenv';

env.config();


// Check if environment variables are set
['DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASSWORD', 'DB_PORT'].forEach((key) => {
    if (!process.env[key]) {
      console.error(`Missing environment variable: ${key}`);
      process.exit(1);
    }
  });
  

// Initialize Express app and middleware
const app = express();
app.use(bodyParser.json());
const PORT = process.env.PORT || 3000;

// Initialize PostgreSQL connection using environment variables
const pool = new pg.Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Routes

// Create a new blog post
app.post('/posts', async (req, res) => {
  const { title, content, category, tags } = req.body;
  if (!title || !content || !category) {
    return res.status(400).json({ error: 'Title, content, and category are required.' });
  }
  if (!Array.isArray(tags)){
    return res.status(400).json({error: 'Tags must be an array.'})
  }
  try {
    const result = await pool.query(
      'INSERT INTO posts (title, content, category, tags, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING *',
      [title, content, category, JSON.stringify(tags)]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating blog post:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
});

// Update an existing blog post
app.put('/posts/:id', async (req, res) => {
  const { id } = req.params;
  const { title, content, category, tags } = req.body;
  if (!title || !content || !category) {
    return res.status(400).json({ error: 'Title, content, and category are required.' });
  }
  try {
    const result = await pool.query(
      'UPDATE posts SET title = $1, content = $2, category = $3, tags = $4, updated_at = NOW() WHERE id = $5 RETURNING *',
      [title, content, category, JSON.stringify(tags), id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blog post not found.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating blog post:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
});

// Delete a blog post
app.delete('/posts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM posts WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blog post not found.' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting blog post:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
});

// Get a single blog post
app.get('/posts/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Blog post not found.' });
    }
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error retrieving blog post:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
});

// Get all blog posts with optional search term
app.get('/posts', async (req, res) => {
  const { term } = req.query;
  try {
    // const query = term
    //   ? `SELECT * FROM posts WHERE LOWER(title) LIKE $1 OR LOWER(content) LIKE $1 OR LOWER(category) LIKE $1`
    //   : 'SELECT * FROM posts';
    const query = term
      ? `SELECT * FROM posts WHERE title ILIKE $1 OR content ILIKE $1 OR category ILIKE $1`
      : 'SELECT * FROM posts';
    const values = term ? [`%${term}%`] : [];
    const result = await pool.query(query, values);
    res.status(200).json(result.rows);
  } catch (error) {
    console.error('Error retrieving blog posts:', error.message);
    res.status(500).json({ error: 'Internal Server Error.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
