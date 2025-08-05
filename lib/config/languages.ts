/**
 * Language Configuration System
 * Centralized configuration for supported languages, locales, and AI prompts
 */

export type SupportedLanguage = 'nb-NO' | 'en-US';

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  displayName: string;
  locale: string;
  currency: string;
  currencySymbol: string;
}

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageConfig> = {
  'nb-NO': {
    code: 'nb-NO',
    name: 'Norwegian',
    displayName: 'Norsk',
    locale: 'nb-NO',
    currency: 'NOK',
    currencySymbol: 'kr',
  },
  'en-US': {
    code: 'en-US',
    name: 'English',
    displayName: 'English',
    locale: 'en-US',
    currency: 'NOK', // Still using NOK for Norwegian marketplaces
    currencySymbol: 'NOK',
  },
};

export const DEFAULT_LANGUAGE: SupportedLanguage = 'en-US';

/**
 * AI Prompts by Language
 */
export const AI_PROMPTS = {
  'nb-NO': {
    imageAnalysis: {
      single: `Du er en norsk ekspert på merkevaregjenstandsanalyse for bruktmarkedet.

VIKTIG: Fokuser spesielt på å identifisere NØYAKTIG merke og modell, da dette er kritisk for prissetting.

Analyseprioritet:
1. MERKE/BRAND: Se etter logoer, tekst, merkelapper, gravering
2. MODELL/SERIE: Se etter modellnummer, produktnavn, seriekode  
3. TEKNISKE DETALJER: Spesifikasjoner som påvirker verdi
4. TILSTAND: Objektiv vurdering av slitasje/skader

For solbriller/klokker/elektronikk: Søk intenst etter synlig tekst på produkt.
For klær/sko: Se etter merkelapper og størrelsesangivelser.
For møbler/utstyr: Identifiser materiale og konstruksjonstype.

Ikke hallusiner merker eller modeller. Hvis usikker: marker som "uncertain" og beskriv hva du faktisk ser.

Returner kun JSON etter skjema - ingen annen tekst.`,
      multiple: (imageCount: number) => `Du er en norsk ekspert på merkevaregjenstandsanalyse for bruktmarkedet.

VIKTIG: Du får ${imageCount} bilder av samme produkt fra forskjellige vinkler. Analyser ALLE bildene sammen for å få komplett forståelse.

Analyseprioritet:
1. MERKE/BRAND: Se etter logoer, tekst, merkelapper, gravering på ALLE bilder
2. MODELL/SERIE: Se etter modellnummer, produktnavn, seriekode på ALLE bilder
3. TEKNISKE DETALJER: Spesifikasjoner som påvirker verdi fra alle vinkler
4. TILSTAND: Komplett vurdering av slitasje/skader fra alle bilder

Fordeler med flere bilder:
- Mer nøyaktig identifikasjon av merke/modell
- Bedre tilstandsvurdering (se alle sider/vinkler)
- Oppdage skader/slitasje som ikke er synlig fra én vinkel
- Bekrefte autentisitet og komplethet

For solbriller/klokker/elektronikk: Søk intenst etter synlig tekst på alle bilder.
For klær/sko: Se etter merkelapper og størrelsesangivelser på alle bilder.
For møbler/utstyr: Identifiser materiale og konstruksjonstype fra alle vinkler.

Ikke hallusiner merker eller modeller. Hvis usikker: marker som "uncertain" og beskriv hva du faktisk ser på bildene.

Returner kun JSON etter skjema - ingen annen tekst.`
    },
    userMessage: {
      single: "Analyser bildet grundig og lag annonseutkast på norsk (NB-NO). KRITISK: Identifiser eksakt merke og modell hvis synlig - dette påvirker prissetting dramatisk. Søk etter synlig tekst, logoer, modellnummer. Fyll kun felt du kan støtte fra bildet. Sett language-feltet til 'nb-NO'. JSON-svar kun.",
      multiple: (imageCount: number) => `Analyser ALLE ${imageCount} bildene grundig og lag annonseutkast på norsk (NB-NO). KRITISK: Bruk informasjon fra alle bilder for å identifisere eksakt merke og modell - dette påvirker prissetting dramatisk. Se etter synlig tekst, logoer, modellnummer på alle bilder. Sammenlign informasjon mellom bildene for beste analyse. Fyll kun felt du kan støtte fra bildene. Sett language-feltet til 'nb-NO'. JSON-svar kun.`
    },
    contentOptimization: {
      system: (finalPrice: number, marketInsights: string[], platformPrompts: string) => 
        `Du er en norsk markedsplass-annonse optimerer. 
        Ta den opprinnelige annonsen og forbedre den med:
        - Endelig validert pris: ${finalPrice} NOK
        - Markedsinnsikt: ${marketInsights.join(', ')}
        - Plattform optimering: ${platformPrompts}
        
        Returner KUN et JSON-objekt med: title, description, tags (maks 10), selling_points (maks 5-6).`,
      platformPrompts: {
        finn: "Optimaliser for FINN.no: Bruk norske nøkkelord, nevn tilstand tydelig, inkluder leveringsalternativer.",
        facebook: "Optimaliser for Facebook Marketplace: Uformell tone, emoji-vennlig, fremhev rask henting/levering.",
        amazon: "Optimaliser for Amazon Marketplace: Profesjonell tone, fokuser på merke/modell, fremhev nøkkelfunksjoner og tilstand. Bruk kulepunkter for spesifikasjoner.",
        both: "Lag universelt innhold egnet for flere markedsplasser (FINN.no, Facebook, Amazon)."
      }
    }
  },
  'en-US': {
    imageAnalysis: {
      single: `You are an English expert in brand item analysis for the used goods market.

IMPORTANT: Focus especially on identifying EXACT brand and model, as this is critical for pricing.

Analysis priority:
1. BRAND: Look for logos, text, labels, engraving
2. MODEL/SERIES: Look for model number, product name, series code  
3. TECHNICAL DETAILS: Specifications that affect value
4. CONDITION: Objective assessment of wear/damage

For sunglasses/watches/electronics: Search intensively for visible text on product.
For clothing/shoes: Look for labels and size markings.
For furniture/equipment: Identify material and construction type.

Do not hallucinate brands or models. If uncertain: mark as "uncertain" and describe what you actually see.

Return only JSON according to schema - no other text.`,
      multiple: (imageCount: number) => `You are an English expert in brand item analysis for the used goods market.

IMPORTANT: You receive ${imageCount} images of the same product from different angles. Analyze ALL images together for complete understanding.

Analysis priority:
1. BRAND: Look for logos, text, labels, engraving on ALL images
2. MODEL/SERIES: Look for model number, product name, series code on ALL images
3. TECHNICAL DETAILS: Specifications that affect value from all angles
4. CONDITION: Complete assessment of wear/damage from all images

Benefits of multiple images:
- More accurate brand/model identification
- Better condition assessment (see all sides/angles)
- Detect damage/wear not visible from one angle
- Confirm authenticity and completeness

For sunglasses/watches/electronics: Search intensively for visible text on all images.
For clothing/shoes: Look for labels and size markings on all images.
For furniture/equipment: Identify material and construction type from all angles.

Do not hallucinate brands or models. If uncertain: mark as "uncertain" and describe what you actually see in the images.

Return only JSON according to schema - no other text.`
    },
    userMessage: {
      single: "Analyze the image thoroughly and create listing draft in English (EN-US). CRITICAL: Identify exact brand and model if visible - this dramatically affects pricing. Look for visible text, logos, model numbers. Only fill fields you can support from the image. Set language field to 'en-US'. JSON response only.",
      multiple: (imageCount: number) => `Analyze ALL ${imageCount} images thoroughly and create listing draft in English (EN-US). CRITICAL: Use information from all images to identify exact brand and model - this dramatically affects pricing. Look for visible text, logos, model numbers on all images. Compare information between images for best analysis. Only fill fields you can support from the images. Set language field to 'en-US'. JSON response only.`
    },
    contentOptimization: {
      system: (finalPrice: number, marketInsights: string[], platformPrompts: string) => 
        `You are an English marketplace listing optimizer. 
        Take the original listing and enhance it with:
        - Final validated price: ${finalPrice} NOK
        - Market insights: ${marketInsights.join(', ')}
        - Platform optimization: ${platformPrompts}
        
        Return ONLY a JSON object with: title, description, tags (max 10), selling_points (max 5-6).`,
      platformPrompts: {
        finn: "Optimize for FINN.no: Use English keywords, mention condition clearly, include delivery options.",
        facebook: "Optimize for Facebook Marketplace: Casual tone, emoji-friendly, highlight quick pickup/delivery.",
        amazon: "Optimize for Amazon Marketplace: Professional tone, focus on brand/model, highlight key features and condition. Use bullet points for specifications.",
        both: "Create universal content suitable for multiple marketplaces (FINN.no, Facebook, Amazon)."
      }
    }
  }
};

/**
 * Get language configuration by code
 */
export function getLanguageConfig(language: SupportedLanguage): LanguageConfig {
  return SUPPORTED_LANGUAGES[language];
}

/**
 * Get AI prompts for a specific language
 */
export function getAIPrompts(language: SupportedLanguage) {
  return AI_PROMPTS[language];
}

/**
 * Validate if a language code is supported
 */
export function isSupportedLanguage(language: string): language is SupportedLanguage {
  return language in SUPPORTED_LANGUAGES;
}

/**
 * Get list of all supported languages for UI
 */
export function getSupportedLanguagesList(): LanguageConfig[] {
  return Object.values(SUPPORTED_LANGUAGES);
}

/**
 * Format price according to language locale
 */
export function formatPrice(price: number, language: SupportedLanguage): string {
  const config = getLanguageConfig(language);
  
  if (language === 'nb-NO') {
    return `${price.toLocaleString('nb-NO')} ${config.currencySymbol}`;
  } else {
    return `${price.toLocaleString('en-US')} ${config.currencySymbol}`;
  }
}