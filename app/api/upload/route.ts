import { put } from '@vercel/blob'
import { NextResponse, type NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
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
    const message = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
