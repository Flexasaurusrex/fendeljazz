import { handleUpload, type HandleUploadBody } from '@vercel/blob/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname: string) => {
        // For now, allow all uploads - you can add authentication here later
        console.log('Generating token for:', pathname);
        
        return {
          allowedContentTypes: [
            'audio/mpeg',
            'audio/mp3', 
            'audio/wav',
            'audio/m4a',
            'audio/aac',
            'audio/ogg',
            'audio/flac'
          ],
          tokenPayload: JSON.stringify({
            uploadedAt: new Date().toISOString(),
          }),
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        console.log('Upload completed:', blob.url);
        console.log('Token payload:', tokenPayload);
        
        // The file is now uploaded to Vercel Blob
        // We don't need to save to database here since the component will handle it
        // Note: This function should not return anything (void)
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    );
  }
}
