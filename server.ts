
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { UserModel, InventoryModel, RequestModel, LogModel } from './models';

dotenv.config();

const SUPER_ADMIN_EMAIL = 'tanujr91@gmail.com';
const SUPER_ADMIN_PASSWORD = 'NTR@2006';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://Tanuj:NTR2006@studio.skx74ai.mongodb.net/?appName=Studio';
  
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');
    
    // Seed Super Admin
    const superAdmin = await UserModel.findOne({ email: SUPER_ADMIN_EMAIL.toLowerCase() });
    if (!superAdmin) {
      await UserModel.create({
        id: 'super-admin-001',
        name: 'System Admin',
        email: SUPER_ADMIN_EMAIL,
        password: SUPER_ADMIN_PASSWORD,
        isEmailConfirmed: true,
        isApproved: true,
        role: 'admin',
        createdAt: new Date().toISOString()
      });
      console.log('Super admin seeded');
    } else {
        // Ensure super admin properties are correct
        if (superAdmin.password !== SUPER_ADMIN_PASSWORD || !superAdmin.isApproved || superAdmin.role !== 'admin') {
            superAdmin.password = SUPER_ADMIN_PASSWORD;
            superAdmin.isApproved = true;
            superAdmin.role = 'admin';
            await superAdmin.save();
            console.log('Super admin updated');
        }
    }
  } catch (err) {
    console.error('MongoDB connection error:', err);
  }

  // --- API Routes ---

  // Health check
  app.get('/api/health', (req, res) => {
    const status = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({ 
      status: 'ok', 
      mongodb: status,
      dbName: mongoose.connection.name
    });
  });

  // Users
  app.get('/api/users', async (req, res) => {
    try {
      const users = await UserModel.find();
      res.json(users);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.post('/api/users', async (req, res) => {
    try {
      const { email } = req.body;
      const existingUser = await UserModel.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        Object.assign(existingUser, req.body);
        await existingUser.save();
        res.json(existingUser);
      } else {
        const newUser = await UserModel.create(req.body);
        res.json(newUser);
      }
    } catch (err) {
      res.status(500).json({ error: 'Failed to save user' });
    }
  });

  // Inventory
  app.get('/api/inventory', async (req, res) => {
    try {
      const items = await InventoryModel.find();
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch inventory' });
    }
  });

  app.post('/api/inventory', async (req, res) => {
    try {
      const items = req.body;
      // Bulk update/insert for inventory
      for (const item of items) {
        await InventoryModel.findOneAndUpdate(
          { batchNo: item.batchNo },
          item,
          { upsert: true, new: true }
        );
      }
      res.json({ status: 'success' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save inventory' });
    }
  });

  app.post('/api/inventory/single', async (req, res) => {
    try {
      const item = req.body;
      const updated = await InventoryModel.findOneAndUpdate(
        { batchNo: item.batchNo },
        item,
        { upsert: true, new: true }
      );
      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: 'Failed to save item' });
    }
  });

  // Requests
  app.get('/api/requests', async (req, res) => {
    try {
      const requests = await RequestModel.find();
      res.json(requests);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch requests' });
    }
  });

  app.post('/api/requests', async (req, res) => {
    try {
      const reqs = req.body;
      for (const r of reqs) {
        await RequestModel.findOneAndUpdate(
          { id: r.id },
          r,
          { upsert: true, new: true }
        );
      }
      res.json({ status: 'success' });
    } catch (err) {
      res.status(500).json({ error: 'Failed to save requests' });
    }
  });

  // Logs
  app.get('/api/logs', async (req, res) => {
    try {
      const logs = await LogModel.find().sort({ timestamp: -1 });
      res.json(logs);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch logs' });
    }
  });

  app.post('/api/logs', async (req, res) => {
    try {
      const log = await LogModel.create(req.body);
      res.json(log);
    } catch (err) {
      res.status(500).json({ error: 'Failed to save log' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
