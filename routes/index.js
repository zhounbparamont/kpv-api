import { createProductRoutes } from './products.js';
import { createInventoryRoutes } from './inventory.js';
import { createInboundRoutes, createOutboundRoutes } from './inbound.js';
import { createLogisticsRoutes, createPurchaseRoutes, createShootingRoutes } from './logistics.js';

export function setupRoutes(app, supabase) {
  app.use('/api/v1/products', createProductRoutes(supabase));
  app.use('/api/v1/inventory', createInventoryRoutes(supabase));
  app.use('/api/v1/inbound', createInboundRoutes(supabase));
  app.use('/api/v1/outbound', createOutboundRoutes(supabase));
  app.use('/api/v1/logistics', createLogisticsRoutes(supabase));
  app.use('/api/v1/purchases', createPurchaseRoutes(supabase));
  app.use('/api/v1/shooting-requests', createShootingRoutes(supabase));
}