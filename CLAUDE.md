# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Application Overview

**Autosell** - An intelligent multi-marketplace system that automates the entire process of selling items across Facebook Marketplace, FINN.no, and Amazon. Users upload a photo, and the AI agent handles advanced image analysis, cross-platform price research, intelligent platform selection, content optimization, and automated publishing.

### Enhanced Multi-Marketplace Workflow
1. **Advanced Image Analysis** → Enhanced brand/model detection with confidence scoring
2. **Multi-Platform Price Research** → FINN.no market analysis with AI-powered pricing
3. **Amazon Eligibility Analysis** → SP-API catalog matching and listing validation
4. **AI-Powered Platform Recommendations** → Intelligent platform selection based on item characteristics
5. **Optimized Price Range Calculation** → Cross-platform pricing strategy with profit analysis
6. **Platform-Specific Content Optimization** → Tailored content for FINN.no, Facebook, and Amazon
7. **Intelligent Multi-Marketplace Publishing** → Automated distribution with real-time status monitoring

## Development Commands

- `npm run dev` - Start development server with Turbopack (fast bundler)
- `npm run build` - Build the application for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint for code quality checks

## AI Agent Architecture

### Orchestrator-Worker Pattern
The application uses a sophisticated orchestrator-worker pattern instead of single AI calls:

- **Orchestrator** (`runMarketplaceAgent`): Manages workflow state and coordinates tools
- **Workers** (AI Tools): Specialized functions for each step
- **State Management**: Passes data between steps without context window issues

### Enhanced 7-Step Agent Workflow

1. **Advanced Image Analysis** (`analyzeImage`)
   - Uses GPT-4o vision model with enhanced brand/model detection
   - Specialized prompts for exact product identification
   - Confidence scoring for brand and model recognition
   - Generates structured Norwegian listing draft with technical specifications

2. **Multi-Platform Price Research** (`validatePriceOnFinn`) 
   - Comprehensive FINN.no market analysis
   - Enhanced search queries with specific brand/model terms
   - Market positioning and competitive analysis
   - AI-powered depreciation modeling with category-specific algorithms

3. **Amazon Eligibility Analysis** (`analyzeAmazonEligibility`)
   - Amazon SP-API catalog search and ASIN matching
   - Listing eligibility validation and restriction checking
   - Product type definition analysis
   - Suitability scoring based on condition, brand, and market factors

4. **AI-Powered Platform Recommendations** (`recommendOptimalPlatforms`)
   - Cross-platform analytics with comprehensive market intelligence
   - Platform suitability scoring based on item characteristics
   - Fee analysis and profit optimization
   - User preference integration (quick_sale, market_price, maximize_profit)

5. **Optimized Price Range Calculation** (`suggestPriceRange`)
   - Cross-platform price comparison and analysis
   - Market-based pricing with confidence weighting
   - Platform-specific fee considerations
   - Seasonal and trend factor integration

6. **Platform-Specific Content Optimization** (`createOptimizedListing`)
   - Tailored content for FINN.no, Facebook Marketplace, and Amazon
   - Platform-optimized descriptions and formatting
   - SEO and discoverability enhancements
   - Market insights integration

7. **Intelligent Multi-Marketplace Publishing** (`queueMarketplacePublishing`)
   - Automated publishing to selected platforms
   - Amazon SP-API integration for direct listing submission
   - Real-time status monitoring and error handling
   - Platform-specific scheduling and optimization

## Key AI Components

### Tech Stack
- **AI Framework**: Vercel AI SDK v5 with tool calling
- **Vision Model**: OpenAI GPT-4o for image analysis
- **Text Model**: OpenAI GPT-4o for content generation
- **Validation**: Zod schemas for structured data
- **UI Framework**: Next.js 15 with App Router
- **UI Library**: shadcn/ui components built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Package Manager**: Bun

### Core Files

#### AI Agent Core
- `lib/marketplace-agent.ts` - Main orchestrator with 7 AI tools and enhanced workflow
- `lib/createListingDraftFromImage.ts` - Advanced vision model integration with single/multi-image analysis
- `lib/finn-api.ts` - FINN.no price validation with AI-powered depreciation modeling
- `lib/amazon-api.ts` - Amazon SP-API integration with catalog matching and publishing
- `lib/cross-platform-analytics.ts` - Comprehensive market intelligence and platform optimization
- `lib/publishing-queue.ts` - Multi-marketplace publishing with Amazon support
- `lib/image-utils.ts` - Client-side compression with batch processing for multiple images

#### API Routes  
- `app/api/agent/create-listing/route.ts` - Main agent workflow endpoint
- `app/api/agent/analyze-image/route.ts` - Multi-image analysis with intelligent single/batch processing

#### Frontend
- `app/agent/page.tsx` - Agent UI with multi-image gallery, upload, and workflow display
- `app/page.tsx` - Main application page

### Multi-Image Analysis & Brand/Model Extraction

The system supports both single and multiple image uploads with intelligent analysis:

#### Single Image Analysis (Backward Compatible)
- Fast processing with lower token usage
- Optimized for single product photos
- Maintains all existing functionality

#### Multiple Image Analysis (Enhanced)
- **1-5 images supported** with comprehensive multi-angle analysis
- **All images analyzed together** by GPT-4o vision model for complete product understanding
- **Enhanced accuracy** through cross-image validation and confirmation
- **Better condition assessment** by viewing all angles and sides
- **Improved defect detection** from multiple perspectives
- **Higher confidence brand/model identification** with more visual evidence

#### Advanced Features
- **Intelligent image gallery** with primary image selection and thumbnail navigation
- **Batch image compression** and optimization for API efficiency
- **Dynamic AI prompts** that adapt based on single vs multiple images
- **Smart token management** to stay within API limits
- **Comprehensive logging** for debugging and optimization

The system uses specialized prompts and schemas to identify:
- **Exact brand and model** instead of generic categories
- **Series/product lines** (e.g., "Oakley Holbrook" vs "Oakley Unspecified")
- **Technical specifications** that affect pricing
- **Visible text and model numbers** on products
- **Confidence scoring** for brand/model identification
- **Multi-angle validation** when multiple images are provided

This enables precise FINN.no searches like "Oakley Holbrook polarisert" instead of "Oakley Unspecified", with higher accuracy when multiple product angles are analyzed.

### Project Structure
- `app/` - Next.js App Router pages and API routes
- `lib/` - AI agent logic, utilities, and integrations
- `components/ui/` - shadcn/ui component library
- `hooks/` - Custom React hooks

### Component System
- **Style**: "new-york" variant shadcn/ui
- **Base Color**: Slate
- **CSS Variables**: Enabled for theming
- **Path Aliases**: `@/components`, `@/lib`, `@/hooks`, `@/ui`

## Environment Configuration

### Required Environment Variables
```bash
# OpenAI for vision and text models (REQUIRED)
OPENAI_API_KEY=sk-...
```

### Amazon SP-API Integration (Optional)
Enable Amazon marketplace functionality by adding these credentials:
```bash
# Amazon Selling Partner API Credentials
AMAZON_REFRESH_TOKEN=your_refresh_token
AMAZON_CLIENT_ID=your_client_id  
AMAZON_CLIENT_SECRET=your_client_secret
AMAZON_ACCESS_KEY_ID=your_access_key_id
AMAZON_SECRET_ACCESS_KEY=your_secret_access_key

# Amazon Marketplace Configuration
AMAZON_REGION=eu-west-1                    # AWS region (eu-west-1, us-east-1, etc.)
AMAZON_MARKETPLACE_ID=A1PA6795UKMFR9       # Marketplace ID (EU: A1PA6795UKMFR9, US: ATVPDKIKX0DER)
```

### Optional Enhancements
```bash
# Database for storing listings/conversations
DATABASE_URL=postgresql://...

# Redis for job queues and caching
REDIS_URL=redis://...
```

### Amazon SP-API Setup Guide

1. **Register as Amazon Seller**
   - Sign up for Amazon Seller Central
   - Complete seller verification process

2. **Create SP-API Application**
   - Navigate to "Apps & Services" → "Develop apps"
   - Create new app with required permissions:
     - `Listings Items API`
     - `Catalog Items API`
     - `Product Type Definitions API`

3. **Generate Credentials**
   - Obtain Client ID and Client Secret
   - Create IAM user with SP-API permissions
   - Generate refresh token through OAuth flow

4. **Configure Marketplace**
   - EU: `A1PA6795UKMFR9` (Germany), `A13V1IB3VIYZZH` (France), `APJ6JRA9NG5V4` (Italy)
   - US: `ATVPDKIKX0DER`
   - UK: `A1F83G8C2ARO7P`

**Note**: Without Amazon credentials, the agent functions normally with FINN.no and Facebook Marketplace only.

## Key Dependencies
- **AI/ML**: `ai`, `@ai-sdk/openai`, `zod`
- **UI**: Comprehensive Radix UI component suite
- **Forms**: React Hook Form with Zod validation
- **Utils**: Date handling with date-fns, charts with Recharts
- **Notifications**: Toast notifications with Sonner

## Debugging & Common Issues

### Context Window Issues
- **Fixed**: Orchestrator pattern prevents context overflow
- **Previous issue**: Including large image URLs in prompts exceeded limits
- **Solution**: Direct tool calling with state management

### Schema Validation Errors
- **Common**: AI generating more items than schema allows
- **Solution**: Adjust max limits in Zod schemas (e.g., selling_points max increased to 7)

### FINN.no API Limitations  
- **Issue**: API returns 400 Bad Request for some searches
- **Fallback**: System uses conservative pricing estimates when API fails
- **Enhancement**: Smart search query generation with brand-specific terms

### Brand/Model Extraction
- **Enhancement**: Specialized vision prompts for accurate identification
- **Impact**: Better price validation through specific model searches
- **Schema**: Extended with model_number, series, technical_specs fields

## Configuration Notes
- TypeScript configured with strict mode
- ESLint extends Next.js recommended configs  
- Tailwind CSS v4 with PostCSS integration
- Path mapping configured for `@/*` imports
- Runtime: nodejs (required for AI SDK)
- Max duration: 60s for image analysis, 300s for full workflow