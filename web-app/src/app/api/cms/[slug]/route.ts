// API Route: CMS Pages — Read and Update
import { NextRequest, NextResponse } from 'next/server';
import { getMongoDb } from '@/lib/db/mongodb';

// GET /api/cms/[slug] — Get a CMS page by slug
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const mongodb = await getMongoDb();

    const page = await mongodb.collection('cms_pages').findOne({ slug });

    if (!page) {
      return NextResponse.json({ error: 'דף לא נמצא' }, { status: 404 });
    }

    return NextResponse.json({ page });
  } catch (err) {
    console.error('GET /api/cms/[slug] error:', err);
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 });
  }
}

// PUT /api/cms/[slug] — Update a CMS page (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await req.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'כותרת ותוכן נדרשים' }, { status: 400 });
    }

    const mongodb = await getMongoDb();

    const result = await mongodb.collection('cms_pages').findOneAndUpdate(
      { slug },
      {
        $set: {
          title,
          content,
          updatedAt: new Date(),
          updatedBy: 'admin',
        },
      },
      { returnDocument: 'after', upsert: true }
    );

    return NextResponse.json({ page: result });
  } catch (err) {
    console.error('PUT /api/cms/[slug] error:', err);
    return NextResponse.json({ error: 'שגיאת שרת פנימית' }, { status: 500 });
  }
}
