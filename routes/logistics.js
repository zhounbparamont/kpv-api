import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

export function createLogisticsRoutes(supabase) {
  const router = Router();
  router.use(authenticate);
  
  router.get('/', async (req, res) => {
    try {
      const { page = 1, limit = 50, status, brand } = req.query;
      const offset = (page - 1) * limit;
      
      let query = supabase
        .from('logistics_records')
        .select('*', { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });
      
      if (status) query = query.eq('status', status);
      if (brand) query = query.eq('brand', brand);
      
      const { data, error, count } = await query;
      if (error) throw error;
      
      res.json({
        success: true,
        data,
        pagination: { 
          page: parseInt(page), 
          limit: parseInt(limit), 
          total: count 
        }
      });
    } catch (error) {
      console.error('[Logistics GET]', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data: dispatch, error } = await supabase
        .from('logistics_records')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        return res.status(404).json({ success: false, error: 'Logistics record not found' });
      }
      
      res.json({ success: true, data: dispatch });
    } catch (error) {
      console.error('[Logistics GET/:id]', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  router.get('/track/:trackingNumber', async (req, res) => {
    try {
      const { trackingNumber } = req.params;
      
      const { data, error } = await supabase
        .from('logistics_records')
        .select('*')
        .eq('tracking_number', trackingNumber)
        .single();
      
      if (error) {
        return res.status(404).json({ success: false, error: 'Tracking number not found' });
      }
      
      res.json({ success: true, data });
    } catch (error) {
      console.error('[Logistics GET/track/:trackingNumber]', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  return router;
}

export function createPurchaseRoutes(supabase) {
  const router = Router();
  router.use(authenticate);
  
  router.get('/', async (req, res) => {
    try {
      const { page = 1, limit = 50, status, supplier } = req.query;
      const offset = (page - 1) * limit;
      
      let query = supabase
        .from('purchase_orders')
        .select('*', { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });
      
      if (status) query = query.eq('status', status);
      if (supplier) query = query.ilike('supplier', `%${supplier}%`);
      
      const { data, error, count } = await query;
      if (error) throw error;
      
      res.json({
        success: true,
        data,
        pagination: { 
          page: parseInt(page), 
          limit: parseInt(limit), 
          total: count 
        }
      });
    } catch (error) {
      console.error('[Purchase GET]', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data: order, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        return res.status(404).json({ success: false, error: 'Purchase order not found' });
      }
      
      res.json({ success: true, data: order });
    } catch (error) {
      console.error('[Purchase GET/:id]', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  return router;
}

export function createShootingRoutes(supabase) {
  const router = Router();
  router.use(authenticate);
  
  router.get('/', async (req, res) => {
    try {
      const { page = 1, limit = 50, status } = req.query;
      const offset = (page - 1) * limit;
      
      let query = supabase
        .from('shooting_requests')
        .select('*', { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });
      
      if (status) query = query.eq('status', status);
      
      const { data, error, count } = await query;
      if (error) throw error;
      
      res.json({
        success: true,
        data,
        pagination: { 
          page: parseInt(page), 
          limit: parseInt(limit), 
          total: count 
        }
      });
    } catch (error) {
      console.error('[Shooting GET]', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data: request, error } = await supabase
        .from('shooting_requests')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        return res.status(404).json({ success: false, error: 'Shooting request not found' });
      }
      
      res.json({ success: true, data: request });
    } catch (error) {
      console.error('[Shooting GET/:id]', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  return router;
}