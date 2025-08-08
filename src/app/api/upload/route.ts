import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData();
    const file = body.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      return NextResponse.json(
        { error: 'File must be an audio file' },
        { status: 400 }
      );
    }

    // Validate file size (100MB limit)
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 100MB' },
        { status: 400 }
      );
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `jazz-recordings/${timestamp}-${cleanFileName}`;

    // Upload to Vercel Blob
    const blob = await put(fileName, file, {
      access: 'public',
      addRandomSuffix: false
    });

    return NextResponse.json({
      url: blob.url,
      fileName: file.name,
      size: file.size,
      type: file.type
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
