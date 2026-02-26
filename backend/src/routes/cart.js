const express = require('express');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// GET /api/cart
router.get('/', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT ci.id, ci.quantity, p.name, p.price, p.image_url,
              (ci.quantity * p.price) AS subtotal
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1`,
      [req.user.id]
    );
    const total = result.rows.reduce((sum, item) => sum + parseFloat(item.subtotal), 0);
    res.json({ items: result.rows, total: total.toFixed(2) });
  } catch (err) { next(err); }
});

// POST /api/cart
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { product_id, quantity = 1 } = req.body;
    if (!product_id) return res.status(400).json({ error: 'product_id is required' });

    const product = await pool.query('SELECT stock FROM products WHERE id=$1', [product_id]);
    if (product.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    if (product.rows[0].stock < quantity) return res.status(400).json({ error: 'Insufficient stock' });

    const result = await pool.query(
      `INSERT INTO cart_items (user_id, product_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET quantity = cart_items.quantity + $3
       RETURNING *`,
      [req.user.id, product_id, quantity]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /api/cart/:itemId
router.delete('/:itemId', authenticate, async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM cart_items WHERE id=$1 AND user_id=$2 RETURNING id',
      [req.params.itemId, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Cart item not found' });
    res.json({ message: 'Item removed', id: req.params.itemId });
  } catch (err) { next(err); }
});

module.exports = router;
