import * as fs from 'fs';
import * as path from 'path';
import { StorageAdapter } from './StorageAdapter';

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads');

export class LocalStorageAdapter implements StorageAdapter {
  private uploadDir: string;

  constructor(uploadDir?: string) {
    this.uploadDir = uploadDir ?? UPLOAD_DIR;
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async save(key: string, buffer: Buffer, _contentType: string): Promise<void> {
    const filePath = this.keyToPath(key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, buffer);
  }

  async getUrl(key: string): Promise<string> {
    // Serve via /api/files/:key endpoint; never expose raw path
    return `/api/files/${encodeURIComponent(key)}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = this.keyToPath(key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  async exists(key: string): Promise<boolean> {
    return fs.existsSync(this.keyToPath(key));
  }

  getFilePath(key: string): string {
    return this.keyToPath(key);
  }

  private keyToPath(key: string): string {
    // Security: prevent path traversal
    const safe = key.replace(/\.\./g, '_').replace(/[\\:*?"<>|]/g, '_');
    return path.join(this.uploadDir, safe);
  }
}
