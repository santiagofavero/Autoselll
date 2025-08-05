import { NextRequest, NextResponse } from 'next/server'
import { platformRecommender } from '@/lib/platform-recommender'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { scanResult, userPreferences } = body

    // Validate required fields
    if (!scanResult || !scanResult.platforms) {
      return NextResponse.json(
        { error: 'Marketplace scan result is required' },
        { status: 400 }
      )
    }

    // Default user preferences if not provided
    const preferences = {
      strategy: userPreferences?.strategy || 'market_price',
      timeframe: userPreferences?.timeframe || 'normal',
      experience_level: userPreferences?.experience_level || 'intermediate',
      risk_tolerance: userPreferences?.risk_tolerance || 'medium',
      ...userPreferences,
    }

    console.log('🎯 Platform recommendation request:', {
      platforms: Object.keys(scanResult.platforms),
      strategy: preferences.strategy,
    })

    // Generate AI-powered platform recommendations
    const recommendations = await platformRecommender.recommendPlatforms(
      scanResult,
      preferences
    )

    return NextResponse.json(recommendations)
  } catch (error) {
    console.error('❌ Platform recommendation failed:', error)
    return NextResponse.json(
      { 
        error: 'Failed to generate platform recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'Use POST to get platform recommendations' },
    { status: 405 }
  )
}