import { put } from '@vercel/blob'
import { NextResponse, type NextRequest } from 'next/server'

// Use edge runtime to handle larger files (streaming body, no 4.5MB limit)
export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''

    let fileName: string
    let fileBody: ReadableStream | Blob
    let fileSize: number
    let fileType: string

    if (contentType.includes('multipart/form-data')) {
      // FormData upload (small files)
      const formData = await request.formData()
      const file = formData.get('file') as File
      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }
      fileName = file.name
      fileBody = file
      fileSize = file.size
      fileType = file.type
    } else {
      // Direct body upload (large files)
      fileName = decodeURIComponent(request.headers.get('x-file-name') || 'unknown')
      fileType = request.headers.get('x-file-type') || 'application/octet-stream'
      fileSize = parseInt(request.headers.get('x-file-size') || '0')

      if (!request.body) {
        return NextResponse.json({ error: 'No file body' }, { status: 400 })
      }
      fileBody = request.body
    }

    // Upload to Vercel Blob
    const blob = await put(`uploads/${fileName}`, fileBody, {
      access: 'private',
      addRandomSuffix: true,
    })

    return NextResponse.json({
      pathname: blob.pathname,
      url: blob.url,
      file_name: fileName,
      file_size: fileSize,
      file_type: fileType,
    })
  } catch (error) {
    console.error('Upload error:', error)
    const message = error instanceof Error ? error.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
