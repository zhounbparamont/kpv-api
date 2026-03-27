import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const SERVER_DIR = join(__dirname, '..');

const API_KEYS = new Map();

export function loadApiKeys() {
  try {
    const keysPath = join(SERVER_DIR, 'api-keys.json');
    const data = JSON.parse(readFileSync(keysPath, 'utf-8'));
    data.keys.forEach(k => {
      API_KEYS.set(k.key, { 
        name: k.name, 
        permissions: k.permissions,
        created_at: k.created_at 
      });
    });
    console.log(`[Auth] Loaded ${API_KEYS.size} API keys from ${keysPath}`);
  } catch (error) {
    console.warn('[Auth] No api-keys.json found, using environment API_KEY');
    const defaultKey = process.env.API_KEY || 'kpv-default-key';
    API_KEYS.set(defaultKey, { name: 'default', permissions: ['read', 'write'] });
  }
}

export function authenticate(req, res, next) {
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

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.apiKey?.permissions.includes(permission)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
        required: permission
      });
    }
    next();
  };
}

loadApiKeys();