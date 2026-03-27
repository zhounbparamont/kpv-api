import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT || 3001;

const CORS_ORIGINS = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',') 
  : ['*'];

app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true
}));
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL || 'https://wjwlyzmorawqfpihrowk.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('[API] Error: SUPABASE_SERVICE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

const API_KEYS = new Map();
const DEFAULT_API_KEY = process.env.API_KEY || 'kpv-default-api-key';

function loadApiKeys() {
  const envKeys = process.env.API_KEYS;
  if (envKeys) {
    try {
      const keys = JSON.parse(envKeys);
      keys.forEach(k => API_KEYS.set(k.key, { name: k.name, permissions: k.permissions }));
    } catch {
      API_KEYS.set(DEFAULT_API_KEY, { name: 'default', permissions: ['read', 'write'] });
    }
  } else {
    API_KEYS.set(DEFAULT_API_KEY, { name: 'default', permissions: ['read', 'write'] });
  }
  console.log(`[API] Loaded ${API_KEYS.size} API keys`);
}

function authenticate(req, res, next) {
  const apiKey = req.headers['x-api-key'] || 
                 req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({ 
      error: 'API key required',
      code: 'MISSING_API_KEY',
      hint: 'Send X-API-Key header or Authorization: Bearer <key>'
    });
  }
  
  const keyData = API_KEYS.get(apiKey);
  if (!keyData) {
    return res.status(401).json({ 
      error: 'Invalid API key',
      code: 'INVALID_API_KEY'
    });
  }
  
  req.apiKey = keyData;
  next();
}

async function handleSupabaseError(error, res) {
  console.error('[Supabase Error]', error);
  return res.status(500).json({ 
    success: false,
    error: 'Database error', 
    code: 'DB_ERROR',
    details: error.message 
  });
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/feishu/webhook', authenticate, async (req, res) => {
  try {
    const { type, data } = req.body;
    let responseData = { received: true };
    
    switch (type) {
      case 'query_stock': {
        const { sku } = data || {};
        if (sku) {
          const { data: stock, error } = await supabase
            .from('StockItem')
            .select('sku, quantity, location, country')
            .eq('sku', sku)
            .single();
          if (error) throw error;
          responseData = { stock };
        }
        break;
      }
      case 'query_product': {
        const { product_sku } = data || {};
        if (product_sku) {
          const { data: product, error } = await supabase
            .from('ProductProfile')
            .select('*')
            .eq('sku', product_sku)
            .single();
          if (error) throw error;
          responseData = { product };
        }
        break;
      }
      case 'list_inbound': {
        const { status, limit } = data || {};
        let query = supabase.from('inbound_orders').select('*').order('created_at', { ascending: false }).limit(limit || 20);
        if (status) query = query.eq('status', status);
        const { data: inbound, error: ibErr } = await query;
        if (ibErr) throw ibErr;
        responseData = { inbound };
        break;
      }
      case 'list_outbound': {
        const { outbound_status, outbound_limit } = data || {};
        let outQuery = supabase.from('outbound_requests_v2').select('*').order('created_at', { ascending: false }).limit(outbound_limit || 20);
        if (outbound_status) outQuery = outQuery.eq('status', outbound_status);
        const { data: outbound, error: obErr } = await outQuery;
        if (obErr) throw obErr;
        responseData = { outbound };
        break;
      }
      case 'list_products': {
        const { limit } = data || {};
        const { data: products, error: pErr } = await supabase
          .from('ProductProfile')
          .select('sku, productName, category')
          .limit(limit || 20);
        if (pErr) throw pErr;
        responseData = { products };
        break;
      }
      case 'summary': {
        const { data: stockData } = await supabase.from('StockItem').select('quantity');
        const totalStock = stockData.reduce((sum, p) => sum + (p.quantity || 0), 0);
        responseData = { total_products: stockData.length, total_stock: totalStock };
        break;
      }
      default:
        responseData = { 
          received: true,
          available_types: ['query_stock', 'query_product', 'list_inbound', 'list_outbound', 'list_products', 'summary']
        };
    }
    res.json(responseData);
  } catch (error) {
    return handleSupabaseError(error, res);
  }
});

app.get('/api/v1/products', authenticate, async (req, res) => {
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
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count }
    });
  } catch (error) {
    return handleSupabaseError(error, res);
  }
});

app.get('/api/v1/products/:sku', authenticate, async (req, res) => {
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
    return handleSupabaseError(error, res);
  }
});

app.get('/api/v1/inventory', authenticate, async (req, res) => {
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
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count }
    });
  } catch (error) {
    return handleSupabaseError(error, res);
  }
});

app.get('/api/v1/inbound', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('inbound_orders')
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
    return handleSupabaseError(error, res);
  }
});

app.get('/api/v1/outbound', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('outbound_requests_v2')
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
    return handleSupabaseError(error, res);
  }
});

app.get('/api/v1/logistics', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('logistics_records')
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
    return handleSupabaseError(error, res);
  }
});

app.get('/api/v1/purchases', authenticate, async (req, res) => {
  try {
    const { page = 1, limit = 50, status } = req.query;
    const offset = (page - 1) * limit;
    
    let query = supabase
      .from('purchase_requests')
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
    return handleSupabaseError(error, res);
  }
});

app.use((err, req, res, next) => {
  console.error('[Error]', err);
  res.status(500).json({ success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' });
});

loadApiKeys();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[API] KPV API Server running on port ${PORT}`);
});

export default app;