import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sql from 'mssql';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// SQL Server config
const sqlConfig = {
  server: process.env.SQLSERVER_HOST || 'localhost',
  port: parseInt(process.env.SQLSERVER_PORT || '1433', 10),
  user: process.env.SQLSERVER_USER,
  password: process.env.SQLSERVER_PASSWORD,
  database: process.env.SQLSERVER_DB,
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let poolPromise = null;
async function getPool() {
  if (!poolPromise) {
    try {
      poolPromise = sql.connect(sqlConfig);
      await poolPromise; // trigger connection
      console.log('Connected to SQL Server.');
    } catch (err) {
      console.warn('SQL Server connection failed; continuing with in-memory fallback.\n', err.message);
      poolPromise = Promise.resolve(null);
    }
  }
  return poolPromise;
}

// Fallback in-memory products for development when DB is unavailable
const fallbackProducts = [
  {
    id: 1,
    name: 'Wireless Earbuds',
    description: 'Compact earbuds with noise isolation and long battery life.',
    price: 39.99,
    image_url: 'https://picsum.photos/seed/earbuds/600/400',
  },
  {
    id: 2,
    name: 'Smartphone Case',
    description: 'Shock-absorbing case with raised edges for screen protection.',
    price: 14.99,
    image_url: 'https://picsum.photos/seed/case/600/400',
  },
  {
    id: 3,
    name: 'USB-C Fast Charger',
    description: '20W USB-C power adapter for rapid charging.',
    price: 19.99,
    image_url: 'https://picsum.photos/seed/charger/600/400',
  },
  {
    id: 4,
    name: 'Bluetooth Speaker',
    description: 'Portable speaker with deep bass and 10h playtime.',
    price: 49.99,
    image_url: 'https://picsum.photos/seed/speaker/600/400',
  },
  {
    id: 5,
    name: 'Screen Protector (2-Pack)',
    description: 'Tempered glass with easy alignment tray.',
    price: 12.99,
    image_url: 'https://picsum.photos/seed/protector/600/400',
  },
  {
    id: 6,
    name: 'MagSafe Power Bank',
    description: 'Magnetic wireless power bank, 5000mAh.',
    price: 34.99,
    image_url: 'https://picsum.photos/seed/powerbank/600/400',
  },
  {
    id: 7,
    name: 'Car Phone Mount',
    description: 'Stable air-vent mount with one-hand operation.',
    price: 16.99,
    image_url: 'https://picsum.photos/seed/mount/600/400',
  },
  {
    id: 8,
    name: 'Silicone Watch Band',
    description: 'Sweat-resistant band compatible with popular smartwatches.',
    price: 9.99,
    image_url: 'https://picsum.photos/seed/band/600/400',
  },
];

async function getProducts() {
  const pool = await getPool();
  if (!pool) return fallbackProducts;
  const result = await pool
    .request()
    .query('SELECT id, name, description, price, image_url FROM dbo.Products ORDER BY id');
  return result.recordset;
}

async function getProductById(id) {
  const pool = await getPool();
  if (!pool) return fallbackProducts.find((p) => p.id === id) || null;
  const result = await pool
    .request()
    .input('id', sql.Int, id)
    .query('SELECT id, name, description, price, image_url FROM dbo.Products WHERE id = @id');
  return result.recordset[0] || null;
}

app.get('/api/health', async (_req, res) => {
  try {
    const pool = await getPool();
    res.json({ ok: true, dbConnected: !!pool });
  } catch {
    res.json({ ok: true, dbConnected: false });
  }
});

app.get('/api/products', async (_req, res) => {
  try {
    const products = await getProducts();
    res.json(products);
  } catch (err) {
    console.error('Failed to list products', err);
    res.status(500).json({ error: 'Failed to list products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    const product = await getProductById(id);
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (err) {
    console.error('Failed to get product', err);
    res.status(500).json({ error: 'Failed to get product' });
  }
});

app.post('/api/checkout', async (req, res) => {
  const { customer, items } = req.body || {};
  if (!customer || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Missing customer or items' });
  }

  try {
    const pool = await getPool();

    // Build a lookup of product prices
    let productPriceById = new Map();
    if (pool) {
      for (const { productId } of items) {
        const r = await pool
          .request()
          .input('id', sql.Int, productId)
          .query('SELECT price FROM dbo.Products WHERE id = @id');
        if (!r.recordset[0]) return res.status(400).json({ error: `Product ${productId} not found` });
        productPriceById.set(productId, Number(r.recordset[0].price));
      }
    } else {
      for (const { productId } of items) {
        const p = fallbackProducts.find((fp) => fp.id === productId);
        if (!p) return res.status(400).json({ error: `Product ${productId} not found` });
        productPriceById.set(productId, Number(p.price));
      }
    }

    const total = items.reduce((sum, it) => sum + (productPriceById.get(it.productId) || 0) * it.quantity, 0);

    if (!pool) {
      // Simulate success in fallback mode
      return res.status(201).json({ orderId: Math.floor(Math.random() * 1_000_000), total });
    }

    const tx = new sql.Transaction(pool);
    await tx.begin();
    try {
      const orderReq = new sql.Request(tx);
      const orderInsert = await orderReq
        .input('customer_name', sql.NVarChar(200), customer.name || 'Guest')
        .input('email', sql.NVarChar(300), customer.email || null)
        .input('address', sql.NVarChar(500), customer.address || null)
        .input('total_amount', sql.Decimal(10, 2), total)
        .query(
          'INSERT INTO dbo.Orders (customer_name, email, address, total_amount) OUTPUT INSERTED.id VALUES (@customer_name, @email, @address, @total_amount)'
        );

      const orderId = orderInsert.recordset[0].id;

      for (const it of items) {
        const unitPrice = productPriceById.get(it.productId);
        await new sql.Request(tx)
          .input('order_id', sql.Int, orderId)
          .input('product_id', sql.Int, it.productId)
          .input('quantity', sql.Int, it.quantity)
          .input('unit_price', sql.Decimal(10, 2), unitPrice)
          .query(
            'INSERT INTO dbo.OrderItems (order_id, product_id, quantity, unit_price) VALUES (@order_id, @product_id, @quantity, @unit_price)'
          );
      }

      await tx.commit();
      res.status(201).json({ orderId, total });
    } catch (err) {
      await tx.rollback();
      console.error('Checkout failed', err);
      res.status(500).json({ error: 'Checkout failed' });
    }
  } catch (err) {
    console.error('Checkout error', err);
    res.status(500).json({ error: 'Checkout error' });
  }
});

// Fallback route to serve index.html
app.get('/', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
