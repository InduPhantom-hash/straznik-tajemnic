/**
 * API endpoint for configuring CORS on Google Cloud Storage bucket
 * This allows direct uploads from browser to GCS
 */

import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import { getGcsCredentials } from '@/lib/gcs-credentials';

export async function POST(_request: NextRequest) {
  try {
    const bucketName =
      process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'zew-app-storage';

    const storage = new Storage({
      projectId:
        process.env.VERTEX_AI_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID,
      ...getGcsCredentials(),
    });

    const bucket = storage.bucket(bucketName);

    // Sprawdź czy bucket istnieje
    const [exists] = await bucket.exists();
    if (!exists) {
      return NextResponse.json(
        { error: `Bucket ${bucketName} nie istnieje` },
        { status: 404 }
      );
    }

    // Konfiguracja CORS dla bezpośrednich uploadów z przeglądarki
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

    console.log(`✅ CORS configuration set for bucket: ${bucketName}`);

    return NextResponse.json({
      success: true,
      message: `CORS skonfigurowany dla bucketa ${bucketName}`,
      corsConfig,
    });
  } catch (error) {
    console.error('❌ Error configuring CORS:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Wystąpił błąd podczas konfiguracji CORS',
        details: error instanceof Error ? error.message : 'Nieznany błąd',
        manualInstructions:
          'Możesz skonfigurować CORS ręcznie w Google Cloud Console: Storage > Buckets > [nazwa bucketa] > Permissions > CORS',
      },
      { status: 500 }
    );
  }
}
