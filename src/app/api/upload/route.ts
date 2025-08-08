import { put } from '@vercel/blob';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Upload API called');
    
    const body = await request.formData();
    const file = body.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    console.log(`Uploading file: ${file.name}, size: ${(file.size / (1024 * 1024)).toFixed(2)}MB, type: ${file.type}`);

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      return NextResponse.json(
        { error: 'File must be an audio file' },
        { status: 400 }
      );
    }

    // Validate file size (1GB limit = 1024 * 1024 * 1024 bytes)
    const maxSizeGB = 1;
    const maxSizeBytes = maxSizeGB * 1024 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return NextResponse.json(
        { error: `File size must be less than ${maxSizeGB}GB. Current size: ${(file.size / (1024 * 1024 * 1024)).toFixed(2)}GB` },
        { status: 400 }
      );
    }

    // Generate a unique filename
    const timestamp = Date.now();
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `jazz-recordings/${timestamp}-${cleanFileName}`;

    console.log(`Uploading to blob with filename: ${fileName}`);

    // Upload to Vercel Blob - since your store is connected, this should work automatically
    const blob = await put(fileName, file, {
      access: 'public',
      addRandomSuffix: false
    });

    console.log(`Upload successful: ${blob.url}`);

    return NextResponse.json({
      url: blob.url,
      fileName: file.name,
      size: file.size,
      type: file.type,
      success: true
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: `Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// Add GET method for testing
export async function GET() {
  return NextResponse.json({ message: 'Upload API is running' });
}
