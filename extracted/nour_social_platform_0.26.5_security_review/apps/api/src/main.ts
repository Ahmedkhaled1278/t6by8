import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const cookieParser = require('cookie-parser') as (secret?: string) => import('express').RequestHandler;

function parseOrigins(): string[] {
  const production = process.env.NODE_ENV === 'production';
  if (production && process.env.CORS_REFLECT === '1') {
    throw new Error('CORS_REFLECT=1 is forbidden in production; configure WEB_ORIGIN explicitly.');
  }

  const raw = process.env.WEB_ORIGIN?.trim();
  if (production && !raw) {
    throw new Error('WEB_ORIGIN must be configured explicitly in production.');
  }
  const configured = (raw || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (production) {
    const nativeOrigins = new Set(['https://localhost', 'capacitor://localhost', 'ionic://localhost']);
    for (const origin of configured) {
      if (nativeOrigins.has(origin)) continue;
      let parsed: URL;
      try {
        parsed = new URL(origin);
      } catch {
        throw new Error(`Invalid WEB_ORIGIN entry: ${origin}`);
      }
      if (parsed.protocol !== 'https:' || parsed.origin !== origin) {
        throw new Error(`Production WEB_ORIGIN entries must be HTTPS origins without paths: ${origin}`);
      }
    }
  }
  // Capacitor origins are needed by the native WebView. Plain HTTP development
  // origins are added only outside production.
  const mobileOrigins = ['https://localhost', 'capacitor://localhost', 'ionic://localhost'];
  const developmentOrigins = production
    ? []
    : ['http://localhost', 'http://localhost:3000', 'https://localhost:3000'];
  return [...new Set([...configured, ...mobileOrigins, ...developmentOrigins])];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.setGlobalPrefix('api');
  app.use(cookieParser());
  app.enableShutdownHooks();
  app.enableCors({
    origin: parseOrigins(),
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
