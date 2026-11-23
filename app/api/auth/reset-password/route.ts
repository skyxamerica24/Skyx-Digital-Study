import { NextResponse } from 'next/server'
import { resetPasswordAction } from '../../../../lib/auth/server-actions'

export async function POST() {
  return NextResponse.json(await resetPasswordAction(), { status: 503 })
}
