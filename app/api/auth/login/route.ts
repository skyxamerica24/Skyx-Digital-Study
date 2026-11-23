import { NextRequest, NextResponse } from 'next/server'
import { loginAction } from '../../../../lib/auth/server-actions'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = await loginAction(body)

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 401 })
    }

    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
