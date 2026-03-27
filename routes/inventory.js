import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';

export function createInventoryRoutes(supabase) {
  const router = Router();
  router.use(authenticate);
  
  router.get('/', async (req, res) => {
    try {
      const { page = 1, limit = 100, low_stock } = req.query;
      const offset = (page - 1) * limit;
      
      let query = supabase
        .from('StockItem')
        .select('sku, quantity, location, country', { count: 'exact' })
        .range(offset, offset + limit - 1)
        .order('sku');
      
      const { data, error, count } = await query;
      if (error) throw error;
      
      let inventoryData = data;
      if (low_stock === 'true') {
        inventoryData = data.filter(item => item.quantity < 10);
      }
      
      res.json({
        success: true,
        data: inventoryData,
        pagination: { 
          page: parseInt(page), 
          limit: parseInt(limit), 
          total: count 
        }
      });
    } catch (error) {
      console.error('[Inventory GET]', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  router.get('/summary', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('StockItem')
        .select('quantity');
      
      if (error) throw error;
      
      const totalProducts = data.length;
      const totalStock = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
      const lowStockItems = data.filter(item => item.quantity < 10).length;
      
      res.json({
        success: true,
        data: {
          total_products: totalProducts,
          total_stock: totalStock,
          low_stock_items: lowStockItems
        }
      });
    } catch (error) {
      console.error('[Inventory GET/summary]', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  router.get('/by-location', async (req, res) => {
    try {
      const { location } = req.query;
      
      let query = supabase
        .from('StockItem')
        .select('sku, quantity, location, country')
        .not('location', 'is', null)
        .order('location');
      
      if (location) {
        query = query.eq('location', location);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      res.json({ success: true, data });
    } catch (error) {
      console.error('[Inventory GET/by-location]', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });
  
  return router;
}