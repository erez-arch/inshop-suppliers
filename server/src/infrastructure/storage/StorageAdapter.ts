// Storage port interface — abstracts local disk vs S3/compatible object storage

export interface StorageAdapter {
  save(key: string, buffer: Buffer, contentType: string): Promise<void>;
  getUrl(key: string): Promise<string>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
