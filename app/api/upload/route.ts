import { put } from '@vercel/blob'
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Use edge runtime to bypass the 4.5MB body limit of serverless functions
export const runtime = 'edge'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Upload to Vercel Blob
    const blob = await put(`uploads/${file.name}`, file, {
      access: 'public',
    })

    return NextResponse.json({
      pathname: blob.pathname,
      url: blob.url,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
