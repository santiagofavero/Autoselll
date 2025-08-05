import { NextRequest, NextResponse } from 'next/server'
import { marketplaceScanner } from '@/lib/marketplace-scanner'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productAnalysis, platforms, maxResults, basePrice } = body

    // Validate required fields
    if (!productAnalysis || !productAnalysis.title) {
      return NextResponse.json(
        { error: 'Product analysis with title is required' },
        { status: 400 }
      )
    }

    console.log('🔍 Marketplace scan request:', {
      title: productAnalysis.title,
      platforms: platforms || ['finn', 'facebook', 'amazon'],
      basePrice,
    })

    // Scan marketplaces with mock data
    const scanResult = await marketplaceScanner.scanMarketplaces(
      productAnalysis,
      platforms || ['finn', 'facebook', 'amazon'],
      maxResults || 50,
      basePrice
    )

    return NextResponse.json(scanResult)
  } catch (error) {
    console.error('❌ Marketplace scan failed:', error)
    return NextResponse.json(
      { 
        error: 'Failed to scan marketplaces',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Use POST to scan marketplaces' },
    { status: 405 }
  )
}