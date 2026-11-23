import { NextRequest, NextResponse } from 'next/server'
import { registerAction } from '../../../../lib/auth/server-actions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await registerAction(body)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
