import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET - Fetch all recordings
export async function GET() {
  try {
    console.log('API: Fetching recordings from Supabase...');
    
    const { data, error } = await supabase
      .from('recordings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('API: Found recordings:', data?.length || 0);
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Failed to fetch recordings' }, { status: 500 });
  }
}

// POST - Create new recording
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, date, duration, url } = body;

    if (!title || !url) {
      return NextResponse.json(
        { error: 'Title and URL are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('recordings')
      .insert([{
        title: title.trim(),
        description: description?.trim() || '',
        date: date?.trim() || new Date().toLocaleDateString(),
        duration: duration?.trim() || 'Unknown',
        url: url.trim()
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Failed to create recording' }, { status: 500 });
  }
}
