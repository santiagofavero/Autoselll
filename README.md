# AI Marketplace Listing Agent 🤖

An intelligent system that automates the entire process of selling items online. Simply upload a photo, and the AI agent handles image analysis, pricing validation, content creation, and marketplace publishing.

## 🎯 What It Does

Transform this workflow:
1. **Take photo** → AI analyzes item details (brand, model, condition)
2. **Get pricing** → Validates prices against Norwegian market data (FINN.no)
3. **Create listing** → Generates optimized Norwegian descriptions for platforms
4. **Publish** → Prepares for automated posting to FINN.no & Facebook Marketplace

**Before**: Hours of manual listing creation  
**After**: Professional listings in minutes with market-validated pricing

## ✨ Key Features

- **Universal Item Support**: Works with electronics, furniture, fashion, vehicles, sports equipment, and more
- **Enhanced Brand Detection**: Identifies specific models (e.g., "iPhone 14 Pro" not just "phone")
- **Norwegian Market Integration**: Real price validation using FINN.no data
- **Platform Optimization**: Tailored content for FINN.no vs Facebook Marketplace
- **Professional Previews**: See exactly how your listing will appear to buyers

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- pnpm package manager
- OpenAI API key

### Installation
```bash
# Clone the repository
git clone https://github.com/Codehagen/autosell.git
cd autosell

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local and add your OpenAI API key

# Start development server
pnpm dev
```

### Usage

#### 1. Upload Your Item Photo
- Take a clear photo with good lighting
- Include any visible brand logos, model numbers, or labels
- Multiple angles help but one good photo is sufficient

#### 2. Configure Your Preferences
- **Pricing Strategy**: Quick sale, market price, or maximize profit
- **Target Platforms**: FINN.no, Facebook Marketplace, or both
- **Additional Info**: Add any details the AI might miss

#### 3. Review & Publish
- Check the generated listing preview
- Verify extracted brand/model information
- Confirm pricing recommendations
- Publish to your chosen platforms

## 📱 Supported Item Categories

### Electronics & Tech
- **Smartphones & Tablets**: iPhone, Samsung, iPad
- **Computers**: MacBook, ThinkPad, gaming laptops
- **Audio**: AirPods, headphones, speakers
- **Cameras**: DSLR, mirrorless, action cameras
- **Gaming**: PlayStation, Xbox, Nintendo Switch

### Fashion & Accessories
- **Clothing**: Designer brands, vintage items, sportswear
- **Shoes**: Sneakers, boots, heels
- **Watches**: Apple Watch, luxury brands, vintage
- **Sunglasses**: Ray-Ban, Oakley, designer frames
- **Bags**: Handbags, backpacks, luggage

### Sports & Outdoor
- **Bikes**: Mountain bikes, road bikes, e-bikes
- **Fitness**: Gym equipment, yoga gear
- **Winter Sports**: Skis, snowboards, boots
- **Water Sports**: Surfboards, kayaks, gear

### Home & Furniture
- **Furniture**: Chairs, tables, sofas, storage
- **Appliances**: Kitchen gadgets, vacuum cleaners
- **Decor**: Art, lamps, plants, mirrors
- **Tools**: Power tools, hand tools, workshop equipment

### Vehicles
- **Cars**: All makes and models
- **Motorcycles**: Street bikes, scooters, vintage
- **Boats**: Sailboats, motorboats, kayaks

## 🎯 What to Expect

### Excellent Results
- **Clear brand/model visibility**: "MacBook Pro 14-inch M2" 
- **Good lighting and focus**: Professional-quality extractions
- **Popular items**: Better market data and pricing accuracy
- **Norwegian brands**: Strong local market knowledge

### Good Results  
- **Partial brand visibility**: "Samsung phone" (may need model hints)
- **Vintage/unique items**: Creative descriptions with conservative pricing
- **Less common brands**: Accurate analysis with limited market data

### Challenging Items
- **No visible branding**: Generic descriptions based on visual features
- **Handmade/custom items**: Descriptive analysis without brand specifics
- **Poor photo quality**: May require retaking photos

## 💰 Pricing Intelligence

The AI agent provides sophisticated pricing analysis:

### Market Validation
- **FINN.no Integration**: Real-time price comparison
- **Market Position**: Above, below, or within market range
- **Confidence Scoring**: How reliable the price estimate is

### Pricing Strategies
- **Quick Sale**: 15% below market for fast turnover
- **Market Price**: Balanced approach using average market data  
- **Maximize Profit**: Premium pricing with negotiation room

### Norwegian Market Focus
- **Local Currency**: All prices in NOK
- **Regional Preferences**: Norwegian marketplace conventions
- **Seasonal Adjustments**: Market timing considerations

## 🎨 Smart Content Generation

### Platform Optimization
- **FINN.no Style**: Professional, detailed, condition-focused
- **Facebook Marketplace**: Casual, friendly, quick pickup emphasis
- **Universal Content**: Works across both platforms

### Norwegian Language
- **Native Descriptions**: Proper Norwegian grammar and terminology
- **Local Terminology**: Uses Norwegian product naming conventions
- **Cultural Adaptation**: Appeals to Norwegian buyers

## 🔧 Architecture

### AI Technologies
- **Vision Model**: OpenAI GPT-4o for image analysis
- **Language Model**: GPT-4o for content generation
- **Framework**: Vercel AI SDK v5 with tool calling
- **Orchestrator Pattern**: Multi-step workflow management

### 5-Step Workflow
1. **Image Analysis** (`analyzeImage`) - Extract item details with enhanced brand/model detection
2. **Price Validation** (`validatePriceOnFinn`) - Search FINN.no for market comparisons
3. **Price Optimization** (`suggestPriceRange`) - Combine AI and market data
4. **Content Creation** (`createOptimizedListing`) - Generate platform-specific descriptions
5. **Publishing Queue** (`queueMarketplacePublishing`) - Prepare for marketplace posting

### File Structure
```
├── app/
│   ├── agent/page.tsx              # Main AI agent interface
│   ├── api/
│   │   ├── agent/                  # AI agent endpoints
│   │   │   ├── analyze-image/      # Image analysis endpoint
│   │   │   ├── create-listing/     # Main workflow orchestrator
│   │   │   └── publish-listing/    # Publishing endpoint
│   │   └── marketplace/            # Marketplace integrations
│   ├── chat/page.tsx               # Chat interface
│   └── layout.tsx                  # Root layout
├── components/
│   ├── agent/                      # Agent UI components
│   │   ├── AgentUploadStep.tsx     # Image upload interface
│   │   ├── AgentAnalysisStep.tsx   # Analysis results display
│   │   └── shared/                 # Shared agent components
│   └── ui/                         # shadcn/ui components
├── lib/
│   ├── agent-core/                 # Core agent logic
│   │   └── workflow-orchestrator.ts # Main orchestration engine
│   ├── agent-tools/                # AI tool implementations
│   │   ├── image-analyzer.ts       # Vision model integration
│   │   ├── price-validator.ts      # FINN.no price validation
│   │   ├── content-optimizer.ts    # Listing content generation
│   │   └── amazon-analyzer.ts      # Amazon integration
│   ├── agent-utils/                # Agent utilities
│   ├── marketplace-agent.ts        # 7-step orchestrator
│   ├── finn-api.ts                 # FINN.no API integration
│   ├── amazon-api.ts               # Amazon SP-API integration
│   └── image-utils.ts              # Client-side compression
├── hooks/                          # Custom React hooks
├── prisma/
│   └── schema.prisma               # Database schema
├── .env.example                    # Environment variables template
├── CLAUDE.md                       # Technical documentation
└── package.json                    # Dependencies and scripts
```

## 📊 Quality Indicators

The system provides transparency into its analysis:

### Confidence Scores
- **Brand Detection**: How certain the AI is about brand identification
- **Model Recognition**: Confidence in specific model/series
- **Price Validation**: Market data reliability score
- **Category Classification**: Item type certainty

### Visual Feedback
- **Extraction Quality**: See what the AI identified in structured preview
- **Market Analysis**: Understand pricing recommendations with color coding
- **Content Preview**: Review Norwegian listing before publishing

## 🚨 Best Practices

### Photography Tips
- **Natural lighting** works better than artificial
- **Include labels/stickers** with model information
- **Multiple angles** for complex items
- **Clean backgrounds** help AI focus on the item

### Information Input
- **Add hints** for items with hidden model numbers
- **Specify condition** accurately (new, like new, used good, etc.)
- **Include accessories** in the photo (cases, cables, manuals)

### Platform Selection
- **FINN.no**: Better for higher-value items, cars, electronics
- **Facebook Marketplace**: Great for furniture, quick local sales
- **Both Platforms**: Maximize exposure for valuable items

## 🆘 Troubleshooting

### Common Issues

**AI can't identify brand/model**
```bash
Solution: Add hints with known information
Check: Are brand logos visible in photo?
Try: Different photo angles or better lighting
```

**Price seems incorrect**
```bash
Check: Market position indicator and confidence scores
Consider: Seasonal/regional factors in Norwegian market
Review: FINN.no search results manually for comparison
```

**Description needs adjustment**
```bash
Use: Preview as a starting point for manual editing
Remember: AI excels at structure, you add personal touches
Best: Combine AI efficiency with human insight
```

**Schema validation errors**
```bash
Check: Zod schema limits in marketplace-agent.ts
Common: selling_points array exceeding max limit
Fix: Adjust schema constraints or prompt guidance
```

## 🔐 Privacy & Security

- **No Data Storage**: Images processed temporarily, not stored
- **API Security**: Encrypted connections to AI services
- **Local Processing**: Image compression happens client-side
- **User Control**: You control all publishing decisions

## 🔄 Development Status

This is an active development project focused on Norwegian marketplace automation:

- ✅ **Universal item analysis** with high accuracy
- ✅ **Enhanced brand/model extraction** for better pricing
- ✅ **FINN.no price validation** with market positioning
- ✅ **Professional Norwegian listing generation**
- ✅ **Visual listing previews** with confidence indicators
- 🚧 **Publishing automation** (in development)
- 🚧 **Buyer communication handling** (planned)

## 🛠️ Technical Commands

```bash
# Development
pnpm dev             # Start with Turbopack (fast bundler)
pnpm build           # Production build
pnpm start           # Start production server
pnpm lint            # Code quality checks

# Key endpoints
GET  /agent          # Main interface
POST /api/agent/create-listing  # 5-step workflow
POST /api/agent/analyze-image   # Image-only analysis
```

## 📞 Support

For technical issues:
- Check confidence scores for extraction quality
- Review CLAUDE.md for architecture details
- Monitor console logs for debugging information
- Consider photo quality and lighting improvements

---

**Built with**: Next.js 15, OpenAI GPT-4o, Vercel AI SDK v5, TypeScript, Tailwind CSS, shadcn/ui
