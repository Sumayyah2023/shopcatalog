const express = require('express');
const pool = require('../config/db');
const redisClient = require('../config/redis');
const { authenticate, isAdmin } = require('../middleware/auth');
const router = express.Router();

const CACHE_TTL = 60; // seconds

// GET /api/products
router.get('/', async (req, res, next) => {
  try {
    const { category, search, min_price, max_price, page = 1, limit = 12 } = req.query;
    const offset = (page - 1) * limit;
    const cacheKey = `products:${JSON.stringify(req.query)}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    let query = `
      SELECT p.*, c.name AS category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      params.push(category);
      query += ` AND c.slug = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
    }
    if (min_price) {
      params.push(min_price);
      query += ` AND p.price >= $${params.length}`;
    }
    if (max_price) {
      params.push(max_price);
      query += ` AND p.price <= $${params.length}`;
    }

    const countResult = await pool.query(`SELECT COUNT(*) FROM (${query}) AS t`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    query += ` ORDER BY p.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(query, params);
    const response = {
      products: result.rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / limit) }
    };

    await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(response));
    res.json(response);
  } catch (err) { next(err); }
});

// GET /api/products/:id
router.get('/:id', async (req, res, next) => {
  try {
    const cacheKey = `product:${req.params.id}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const result = await pool.query(
      'SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id=$1',
      [req.params.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Product not found' });

    await redisClient.setEx(cacheKey, CACHE_TTL, JSON.stringify(result.rows[0]));
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// POST /api/products (admin)
router.post('/', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { name, description, price, stock, image_url, category_id } = req.body;
    if (!name || !price) return res.status(400).json({ error: 'Name and price are required' });

    const result = await pool.query(
      'INSERT INTO products (name, description, price, stock, image_url, category_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [name, description, price, stock || 0, image_url, category_id]
    );
    await redisClient.flushDb(); // clear cache on write
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// PUT /api/products/:id (admin)
router.put('/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    const { name, description, price, stock, image_url, category_id } = req.body;
    const result = await pool.query(
      `UPDATE products SET name=$1, description=$2, price=$3, stock=$4, image_url=$5, category_id=$6
       WHERE id=$7 RETURNING *`,
      [name, description, price, stock, image_url, category_id, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    await redisClient.flushDb();
    res.json(result.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/products/:id (admin)
router.delete('/:id', authenticate, isAdmin, async (req, res, next) => {
  try {
    const result = await pool.query('DELETE FROM products WHERE id=$1 RETURNING id', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    await redisClient.flushDb();
    res.json({ message: 'Product deleted', id: req.params.id });
  } catch (err) { next(err); }
});

module.exports = router;
