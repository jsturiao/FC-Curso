import { Request, Response, NextFunction } from 'express';

export default function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();
  
  // Log da requisição
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, {
    body: req.method !== 'GET' ? req.body : undefined,
    query: Object.keys(req.query).length > 0 ? req.query : undefined,
    params: Object.keys(req.params).length > 0 ? req.params : undefined,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  // Interceptar o response para logar o resultado
  const originalSend = res.send;
  res.send = function(body: any) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    
    return originalSend.call(this, body);
  };

  next();
}
