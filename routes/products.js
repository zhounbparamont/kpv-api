import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

export function createProductRoutes(supabase) {
  const router = Router();
  router.use(authenticate);
  
  router.get('/', async (req, res) => {
    try {
      const { page = 1, limit = 50, search, category } = req.query;
      const offset = (page - 1) * limit;
      
      let query = supabase
        .from('ProductProfile')
        .select('*', { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('createdAt', { ascending: false });
      
      if (search) {
        query = query.or(`productName.ilike.%${search}%,sku.ilike.%${search}%`);
      }
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error, count } = await query;
      if (error) throw error;
      
      res.json({
        success: true,
        data,
        pagination: { 
          page: parseInt(page), 
          limit: parseInt(limit), 
          total: count,
          pages: Math.ceil(count / limit)
        }
      });
    } catch (error) {
      console.error('[Products GET]', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  router.get('/:sku', async (req, res) => {
    try {
      const { sku } = req.params;
      
      const { data, error } = await supabase
        .from('ProductProfile')
        .select('*')
        .eq('sku', sku)
        .single();
      
      if (error) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }
      
      res.json({ success: true, data });
    } catch (error) {
      console.error('[Products GET/:sku]', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  router.get('/:sku/certificates', async (req, res) => {
    try {
      const { sku } = req.params;
      
      const { data, error } = await supabase
        .from('product_certificates')
        .select('*')
        .eq('sku', sku)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      res.json({ success: true, data });
    } catch (error) {
      console.error('[Products GET/:sku/certificates]', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  return router;
}