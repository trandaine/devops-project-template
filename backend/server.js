const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const helmet = require('helmet');

// require('dotenv').config();
const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

const pool = new Pool({
   user: 'postgres',
   host: 'devops_postgres',
   database: 'tododb',
   password: 'postgres',
   port: 5432,
});

app.get('/health', (req, res) => {
   res.json({ status: 'healthy', version: '1.0.0' });
});

// GET todos
app.get('/api/todos', async (req, res) => {
   console.log('Received GET /api/todos request');
   try {
      const result = await pool.query('SELECT * FROM todos ORDER BY id');
      res.json(result.rows);
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

// POST todos
app.post('/api/todos', async (req, res) => {
   try {
      const { title, completed = false } = req.body;

      if (!title || title.trim() === '') {
         return res.status(400).json({ error: 'Title is required' });
      }

      const result = await pool.query(
         'INSERT INTO todos(title, completed) VALUES($1, $2) RETURNING *',
         [title, completed]
      );
      res.status(201).json(result.rows[0]);
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

app.delete('/api/todos/:id', async (req, res) => {
   try {
      const { id } = req.params;

      const result = await pool.query(
         'DELETE FROM todos WHERE id = $1 RETURNING *',
         [id]
      );

      if (result.rows.length === 0) {
         return res.status(404).json({ error: 'Todo not found' });
      }

      res.json({ message: 'Deleted successfully' });
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

app.put('/api/todos/:id', async (req, res) => {
   try {
      const { id } = req.params;
      const { title, completed } = req.body;

      const checkExist = await pool.query('SELECT * FROM todos WHERE id = $1', [id]);
      if (checkExist.rows.length === 0) {
         return res.status(404).json({ error: 'Todo not found' });
      }

      const currentTodo = checkExist.rows[0];

      const updatedTitle = title !== undefined ? title : currentTodo.title;
      const updatedCompleted = completed !== undefined ? completed : currentTodo.completed;

      if (title !== undefined && title.trim() === '') {
         return res.status(400).json({ error: 'Title cannot be empty' });
      }

      const result = await pool.query(
         'UPDATE todos SET title = $1, completed = $2 WHERE id = $3 RETURNING *',
         [updatedTitle, updatedCompleted, id]
      );

      res.json(result.rows[0]);
   } catch (err) {
      res.status(500).json({ error: err.message });
   }
});

const port = 8080;

// BUG #5 & DB CONNECTION FIX: Chỉ chạy server và connect DB khi không phải môi trường test
if (process.env.NODE_ENV !== 'test') {
   pool.connect()
      .then(client => {
         console.log('Connected to PostgreSQL database successfully!');
         client.release();
         
         app.listen(port, () => {
            console.log(`Backend running on port ${port}`);
         });
      })
      .catch(err => {
         console.error('Failed to connect to PostgreSQL database:', err.message);
         process.exit(1); // Exit with failure code
      });
}

module.exports = { app, pool };