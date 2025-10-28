import fs from 'fs';
import path from 'path';
import https from 'https';

export interface HttpsConfig {
  enabled: boolean;
  options?: https.ServerOptions;
}

export function getHttpsConfig(): HttpsConfig {
  const enableHttps = process.env.ENABLE_HTTPS !== 'false'; // Default: true
  const certPath = process.env.CERT_PATH || '/app/certs';

  if (!enableHttps) {
    return { enabled: false };
  }

  try {
    const keyPath = path.join(certPath, 'server.key');
    const certFilePath = path.join(certPath, 'server.crt');

    // Check if certificates exist
    if (!fs.existsSync(keyPath) || !fs.existsSync(certFilePath)) {
      console.warn(`⚠️  HTTPS certificates not found at ${certPath}`);
      console.warn('   Falling back to HTTP mode');
      console.warn('   To enable HTTPS:');
      console.warn('     1. Generate certificates: cd Backend/certs && ./generate-certs.sh');
      console.warn('     2. Mount certificates in docker-compose.yml');
      return { enabled: false };
    }

    const httpsOptions: https.ServerOptions = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certFilePath),
    };

    return { enabled: true, options: httpsOptions };
  } catch (error) {
    console.error('❌ Error loading HTTPS certificates:', error);
    console.warn('   Falling back to HTTP mode');
    return { enabled: false };
  }
}

