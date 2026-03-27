import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

export function createInboundRoutes(supabase) {
  const router = Router();
  router.use(authenticate);
  
  router.get('/', async (req, res) => {
    try {
      const { page = 1, limit = 50, status, supplier } = req.query;
      const offset = (page - 1) * limit;
      
      let query = supabase
        .from('inbound_orders')
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
      console.error('[Inbound GET]', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data: order, error } = await supabase
        .from('inbound_orders')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        return res.status(404).json({ success: false, error: 'Inbound order not found' });
      }
      
      const { data: items } = await supabase
        .from('inbound_items')
        .select('*')
        .eq('inbound_order_id', id);
      
      res.json({ success: true, data: { ...order, items } });
    } catch (error) {
      console.error('[Inbound GET/:id]', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  router.get('/appointments', async (req, res) => {
    try {
      const { page = 1, limit = 50, status } = req.query;
      const offset = (page - 1) * limit;
      
      let query = supabase
        .from('inbound_appointments')
        .select('*', { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('created_at', { ascending: false });
      
      if (status) query = query.eq('status', status);
      
      const { data, error, count } = await query;
      if (error) throw error;
      
      res.json({
        success: true,
        data,
        pagination: { page: parseInt(page), limit: parseInt(limit), total: count }
      });
    } catch (error) {
      console.error('[Inbound GET/appointments]', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  return router;
}

export function createOutboundRoutes(supabase) {
  const router = Router();
  router.use(authenticate);
  
  router.get('/', async (req, res) => {
    try {
      const { page = 1, limit = 50, status } = req.query;
      const offset = (page - 1) * limit;
      
      let query = supabase
        .from('outbound_orders')
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
      console.error('[Outbound GET]', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;
      
      const { data: order, error } = await supabase
        .from('outbound_orders')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        return res.status(404).json({ success: false, error: 'Outbound order not found' });
      }
      
      const { data: items } = await supabase
        .from('outbound_items')
        .select('*')
        .eq('outbound_order_id', id);
      
      res.json({ success: true, data: { ...order, items } });
    } catch (error) {
      console.error('[Outbound GET/:id]', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  return router;
}