import { Storage, type Bucket } from '@google-cloud/storage';
import { getGcsCredentials } from './gcs-credentials';

interface CorsRule {
  origin?: string[];
  method?: string[];
  responseHeader?: string[];
  maxAgeSeconds?: number;
}

export interface GoogleCloudStorageConfig {
  projectId: string;
  bucketName: string;
  keyFilename?: string;
}

export interface UploadOptions {
  destination?: string;
  metadata?: {
    contentType?: string;
    cacheControl?: string;
    customMetadata?: Record<string, string>;
  };
  public?: boolean;
  resumable?: boolean;
  validation?: 'crc32c' | 'md5' | false;
}

export interface FileInfo {
  name: string;
  size: number;
  contentType: string;
  timeCreated: Date;
  updated: Date;
  md5Hash: string;
  publicUrl?: string;
}

export interface StorageStats {
  totalFiles: number;
  totalSize: number;
  bucketName: string;
  location: string;
  storageClass: string;
}

class GoogleCloudStorageService {
  private storage: Storage | null = null;
  private bucketName: string;
  private isInitialized = false;

  constructor() {
    this.bucketName =
      process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'zew-app-storage';

    try {
      this.storage = new Storage({
        projectId:
          process.env.VERTEX_AI_PROJECT_ID ||
          process.env.GOOGLE_CLOUD_PROJECT_ID,
        ...getGcsCredentials(),
      });
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize Google Cloud Storage:', error);
      this.isInitialized = false;
    }
  }

  private ensureStorage(): Storage {
    if (!this.storage) {
      throw new Error('Storage not initialized');
    }
    return this.storage;
  }

  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      this.ensureStorage();

      // Zakładamy że bucket istnieje - sprawdzanie bucket.exists() wymaga uprawnień storage.buckets.get
      // które nie są dostępne dla roli Storage Object Admin
      console.log(`✅ GCS initialized for bucket: ${this.bucketName}`);

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Google Cloud Storage:', error);
      return false;
    }
  }

  /**
   * Konfiguruje CORS dla bucketa, aby umożliwić bezpośrednie uploady z przeglądarki
   */
  private async ensureCorsConfiguration(bucket: Bucket): Promise<void> {
    try {
      const [metadata] = await bucket.getMetadata();
      const currentCors: CorsRule[] = (metadata.cors as CorsRule[]) || [];

      // Sprawdź czy CORS jest już skonfigurowany
      const hasCors = currentCors.some(
        (cors) =>
          cors.origin &&
          cors.origin.includes('*') &&
          cors.method &&
          cors.method.includes('PUT')
      );

      if (hasCors) {
        console.log('✅ CORS already configured for bucket');
        return;
      }

      // Dodaj konfigurację CORS
      const corsConfig = [
        {
          origin: ['*'],
          method: ['GET', 'PUT', 'POST', 'HEAD', 'DELETE'],
          responseHeader: [
            'Content-Type',
            'Content-Length',
            'ETag',
            'x-goog-resumable',
            'x-goog-hash',
          ],
          maxAgeSeconds: 3600,
        },
      ];

      await bucket.setCorsConfiguration(corsConfig);
      console.log('✅ CORS configuration set for bucket');
    } catch (error) {
      console.warn(
        '⚠️ Could not configure CORS (may need manual configuration):',
        error
      );
      // Nie rzucaj błędu - CORS może być skonfigurowany ręcznie
    }
  }

  private async createBucket(): Promise<void> {
    try {
      const storage = this.ensureStorage();

      const [bucket] = await storage.createBucket(this.bucketName, {
        location: 'US-CENTRAL1',
        storageClass: 'STANDARD',
        uniformBucketLevelAccess: true,
        publicAccessPrevention: 'inherited',
      });

      console.log(`✅ Created bucket: ${bucket.name}`);
    } catch (error) {
      console.error('Failed to create bucket:', error);
      throw error;
    }
  }

  async uploadFile(
    file: Buffer | Uint8Array | string,
    fileName: string,
    options: UploadOptions = {}
  ): Promise<{ url: string; fileName: string; size: number }> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized)
        throw new Error('Failed to initialize Google Cloud Storage');
    }

    try {
      const storage = this.ensureStorage();
      const bucket = storage.bucket(this.bucketName);
      const fileRef = bucket.file(fileName);

      const uploadOptions = {
        metadata: {
          contentType:
            options.metadata?.contentType || 'application/octet-stream',
          cacheControl:
            options.metadata?.cacheControl || 'public, max-age=3600',
          ...options.metadata?.customMetadata,
        },
        resumable: options.resumable !== false,
        validation: options.validation || 'crc32c',
      };

      await fileRef.save(file, uploadOptions);

      // Make file public if requested
      if (options.public) {
        await fileRef.makePublic();
      }

      const [metadata] = await fileRef.getMetadata();
      const publicUrl = options.public
        ? `https://storage.googleapis.com/${this.bucketName}/${fileName}`
        : undefined;

      return {
        url: publicUrl || `gs://${this.bucketName}/${fileName}`,
        fileName,
        size: parseInt(String(metadata.size || '0')),
      };
    } catch (error) {
      console.error('Failed to upload file:', error);
      throw error;
    }
  }

  async downloadFile(fileName: string): Promise<Buffer> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized)
        throw new Error('Failed to initialize Google Cloud Storage');
    }

    try {
      const storage = this.ensureStorage();
      const bucket = storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      const [data] = await file.download();
      return data;
    } catch (error) {
      console.error('Failed to download file:', error);
      throw error;
    }
  }

  async deleteFile(fileName: string): Promise<void> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized)
        throw new Error('Failed to initialize Google Cloud Storage');
    }

    try {
      const storage = this.ensureStorage();
      const bucket = storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      await file.delete();
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }

  async listFiles(prefix?: string, maxResults?: number): Promise<FileInfo[]> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized)
        throw new Error('Failed to initialize Google Cloud Storage');
    }

    try {
      const storage = this.ensureStorage();
      const bucket = storage.bucket(this.bucketName);
      const [files] = await bucket.getFiles({
        prefix,
        maxResults,
      });

      return files.map((file) => ({
        name: file.name,
        size: parseInt(String(file.metadata.size || '0')),
        contentType: file.metadata.contentType || 'application/octet-stream',
        timeCreated: new Date(file.metadata.timeCreated || ''),
        updated: new Date(file.metadata.updated || ''),
        md5Hash: file.metadata.md5Hash || '',
        publicUrl: `https://storage.googleapis.com/${this.bucketName}/${file.name}`,
      }));
    } catch (error) {
      console.error('Failed to list files:', error);
      throw error;
    }
  }

  async getFileInfo(fileName: string): Promise<FileInfo | null> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized)
        throw new Error('Failed to initialize Google Cloud Storage');
    }

    try {
      const storage = this.ensureStorage();
      const bucket = storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      const [metadata] = await file.getMetadata();

      return {
        name: file.name,
        size: parseInt(String(metadata.size || '0')),
        contentType: metadata.contentType || 'application/octet-stream',
        timeCreated: new Date(metadata.timeCreated || ''),
        updated: new Date(metadata.updated || ''),
        md5Hash: metadata.md5Hash || '',
        publicUrl: `https://storage.googleapis.com/${this.bucketName}/${fileName}`,
      };
    } catch (error) {
      console.error('Failed to get file info:', error);
      return null;
    }
  }

  async generateSignedUrl(
    fileName: string,
    expirationHours: number = 24
  ): Promise<string> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized)
        throw new Error('Failed to initialize Google Cloud Storage');
    }

    try {
      const storage = this.ensureStorage();
      const bucket = storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      const [signedUrl] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + expirationHours * 60 * 60 * 1000,
      });

      return signedUrl;
    } catch (error) {
      console.error('Failed to generate signed URL:', error);
      throw error;
    }
  }

  /**
   * Generuje presigned URL do uploadu pliku (PUT request)
   * Maksymalny czas wygaśnięcia: 7 dni (604800 sekund)
   */
  async generateUploadSignedUrl(
    fileName: string,
    contentType: string = 'application/pdf',
    expirationHours: number = 168 // 7 dni (maksimum)
  ): Promise<string> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized)
        throw new Error('Failed to initialize Google Cloud Storage');
    }

    // Ograniczenie do maksymalnie 7 dni (604800 sekund)
    const maxExpirationHours = 168; // 7 dni
    const actualExpirationHours = Math.min(expirationHours, maxExpirationHours);
    const expirationMs = actualExpirationHours * 60 * 60 * 1000;

    try {
      const storage = this.ensureStorage();
      const bucket = storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + expirationMs,
        contentType: contentType,
      });

      console.log(
        `✅ Generated upload signed URL for ${fileName}, expires in ${actualExpirationHours} hours`
      );
      return signedUrl;
    } catch (error) {
      console.error('Failed to generate upload signed URL:', error);
      throw error;
    }
  }

  /**
   * Ustawia plik jako publiczny w Google Cloud Storage
   */
  async makeFilePublic(fileName: string): Promise<void> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized)
        throw new Error('Failed to initialize Google Cloud Storage');
    }

    try {
      const storage = this.ensureStorage();
      const bucket = storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      await file.makePublic();
      console.log(`✅ File ${fileName} is now public`);
    } catch (error) {
      console.error('Failed to make file public:', error);
      throw error;
    }
  }

  async getStorageStats(): Promise<StorageStats> {
    if (!this.isInitialized) {
      const initialized = await this.initialize();
      if (!initialized)
        throw new Error('Failed to initialize Google Cloud Storage');
    }

    try {
      const storage = this.ensureStorage();
      const bucket = storage.bucket(this.bucketName);
      const [metadata] = await bucket.getMetadata();

      const files = await this.listFiles();
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);

      return {
        totalFiles: files.length,
        totalSize,
        bucketName: this.bucketName,
        location: metadata.location || 'US-CENTRAL1',
        storageClass: metadata.storageClass || 'STANDARD',
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      throw error;
    }
  }

  // Helper methods for specific file types
  async uploadImage(
    imageBuffer: Buffer,
    fileName: string,
    contentType: string = 'image/jpeg'
  ): Promise<string> {
    // Upload bez public:true (uniform bucket-level access nie pozwala na makePublic per file)
    const result = await this.uploadFile(imageBuffer, fileName, {
      metadata: { contentType },
      public: false, // Nie używamy makePublic - bucket ma uniform access
      resumable: false, // Szybszy upload dla małych plików
    });

    // Generuj signed URL z 7-dniowym czasem życia (maksimum dla v4)
    // Dla obrazów sesji to wystarczy - po 7 dniach mogą być ponownie wygenerowane
    try {
      const signedUrl = await this.generateSignedUrl(fileName, 168); // 7 dni
      console.log(`✅ Image uploaded with signed URL: ${fileName}`);
      return signedUrl;
    } catch (error) {
      console.warn(
        '⚠️ Could not generate signed URL, returning gs:// path:',
        error
      );
      return result.url;
    }
  }

  async uploadAudio(
    audioBuffer: Buffer,
    fileName: string,
    contentType: string = 'audio/mpeg'
  ): Promise<string> {
    const result = await this.uploadFile(audioBuffer, fileName, {
      metadata: { contentType },
      public: true,
    });
    return result.url;
  }

  async uploadPDF(pdfBuffer: Buffer, fileName: string): Promise<string> {
    const result = await this.uploadFile(pdfBuffer, fileName, {
      metadata: { contentType: 'application/pdf' },
      public: true,
    });
    return result.url;
  }

  async uploadJSON(data: unknown, fileName: string): Promise<string> {
    const jsonString = JSON.stringify(data, null, 2);
    const result = await this.uploadFile(jsonString, fileName, {
      metadata: { contentType: 'application/json' },
      public: false,
    });
    return result.url;
  }

  // Migration helper from Vercel Blob
  async migrateFromVercelBlob(
    blobUrl: string,
    newFileName: string
  ): Promise<string> {
    try {
      // Download from Vercel Blob
      const response = await fetch(blobUrl);
      if (!response.ok)
        throw new Error(
          `Failed to fetch from Vercel Blob: ${response.statusText}`
        );

      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType =
        response.headers.get('content-type') || 'application/octet-stream';

      // Upload to Google Cloud Storage
      const result = await this.uploadFile(buffer, newFileName, {
        metadata: { contentType },
        public: true,
      });

      return result.url;
    } catch (error) {
      console.error('Failed to migrate from Vercel Blob:', error);
      throw error;
    }
  }
}

export const googleCloudStorageService = new GoogleCloudStorageService();
