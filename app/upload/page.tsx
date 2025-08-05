"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { Upload, FileImage, Loader2, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface ListingDraft {
  version: string;
  language: string;
  title: string;
  description: string;
  category: {
    primary: string;
    secondary?: string;
    confidence: number;
  };
  attributes: {
    condition: string;
    brand?: string;
    model?: string;
    color?: string;
    material?: string;
    size?: string;
    defects?: string[];
    included_items?: string[];
  };
  pricing: {
    suggested_price_nok: number;
    confidence: number;
    basis: string[];
  };
  media: {
    image_count: number;
    main_image_summary: string;
    quality_score: number;
    issues?: string[];
  };
  moderation: {
    flags: string[];
    uncertainties: string[];
  };
  tags: string[];
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ListingDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setFile(selectedFile);
    setError(null);
    setResult(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const analyzeImage = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/listings/draft", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to analyze image");
      }

      const draft = await response.json();
      setResult(draft);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!result) return;
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(result, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const conditionLabels = {
    new: "Ny",
    like_new: "Som ny",
    used_good: "Brukt - god",
    used_fair: "Brukt - ok",
    for_parts: "Til deler"
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">AI Listing Generator</h1>
          <p className="text-muted-foreground mt-2">
            Upload an image and get an AI-generated listing automatically
          </p>
        </div>

        {/* Upload Area */}
        <Card>
          <CardHeader>
            <CardTitle>Upload Image</CardTitle>
            <CardDescription>
              Supports JPEG, PNG, WebP. Maximum 10MB.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              {preview ? (
                <div className="space-y-4">
                  <div className="relative w-full max-w-md mx-auto h-64">
                    <Image 
                      src={preview} 
                      alt="Preview" 
                      fill
                      className="object-contain rounded-lg shadow-sm"
                    />
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button
                      onClick={analyzeImage}
                      disabled={loading}
                      className="min-w-32"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <FileImage className="mr-2 h-4 w-4" />
                          Analyze Image
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setFile(null);
                        setPreview(null);
                        setResult(null);
                        setError(null);
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-medium">Drag and drop an image here</p>
                    <p className="text-sm text-muted-foreground">or</p>
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload">
                      <Button variant="outline" className="cursor-pointer">
                        Choose File
                      </Button>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Generated Listing Draft</CardTitle>
                  <CardDescription>
                    AI-generert innhold basert på bildeanalyse
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="shrink-0"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Kopiert!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Kopier JSON
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Title & Description */}
                <div>
                  <h3 className="text-xl font-semibold mb-2">{result.title}</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {result.description}
                  </p>
                </div>

                <Separator />

                {/* Key Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Detaljer</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Kategori:</span>
                        <span>{result.category.primary}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tilstand:</span>
                        <Badge variant="secondary">
                          {conditionLabels[result.attributes.condition as keyof typeof conditionLabels]}
                        </Badge>
                      </div>
                      {result.attributes.brand && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Merke:</span>
                          <span>{result.attributes.brand}</span>
                        </div>
                      )}
                      {result.attributes.color && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Farge:</span>
                          <span>{result.attributes.color}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-3">Pris & Vurdering</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Foreslått pris:</span>
                        <span className="font-medium">{result.pricing.suggested_price_nok.toLocaleString()} kr</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sikkerhet:</span>
                        <span>{Math.round(result.pricing.confidence * 100)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bildekvalitet:</span>
                        <span>{Math.round(result.media.quality_score * 100)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {result.tags.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.tags.map((tag, index) => (
                        <Badge key={index} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {(result.moderation.uncertainties.length > 0 || result.media.issues?.length) && (
                  <div>
                    <h4 className="font-medium mb-2">Merknader</h4>
                    <div className="space-y-2">
                      {result.moderation.uncertainties.map((uncertainty, index) => (
                        <Alert key={index}>
                          <AlertDescription className="text-sm">
                            Usikkerhet: {uncertainty}
                          </AlertDescription>
                        </Alert>
                      ))}
                      {result.media.issues?.map((issue, index) => (
                        <Alert key={index}>
                          <AlertDescription className="text-sm">
                            Bildeproblem: {issue}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw JSON */}
                <details className="mt-6">
                  <summary className="cursor-pointer font-medium mb-2">
                    Vis komplett JSON
                  </summary>
                  <pre className="bg-muted p-4 rounded text-xs overflow-auto">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}