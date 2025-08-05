/**
 * Listing Preview Component
 * Shows a preview of the generated listing with edit capabilities
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit2, Check, X, Eye, DollarSign, Tag, Star } from 'lucide-react';

export interface ListingData {
  title: string;
  description: string;
  price: number;
  tags: string[];
  selling_points: string[];
  platform?: string;
  category?: string;
  condition?: string;
  brand?: string;
  model?: string;
}

interface ListingPreviewProps {
  listing: ListingData;
  onUpdate?: (updatedListing: ListingData) => void;
  isEditable?: boolean;
  showMetadata?: boolean;
  className?: string;
}

export function ListingPreview({ 
  listing, 
  onUpdate, 
  isEditable = true,
  showMetadata = true,
  className = ""
}: ListingPreviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedListing, setEditedListing] = useState<ListingData>(listing);

  const handleStartEdit = () => {
    setEditedListing(listing);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditedListing(listing);
    setIsEditing(false);
  };

  const handleSaveEdit = () => {
    if (onUpdate) {
      onUpdate(editedListing);
    }
    setIsEditing(false);
  };

  const handleFieldChange = (field: keyof ListingData, value: string | number | string[]) => {
    setEditedListing(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTagsChange = (tagsString: string) => {
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    handleFieldChange('tags', tags);
  };

  const handleSellingPointsChange = (pointsString: string) => {
    const points = pointsString.split('\n').map(point => point.trim()).filter(point => point.length > 0);
    handleFieldChange('selling_points', points);
  };

  const currentListing = isEditing ? editedListing : listing;

  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Eye className="w-5 h-5" />
              <span>Listing Preview</span>
            </CardTitle>
            <CardDescription>
              {isEditing ? 'Edit your listing details' : 'Review your generated listing'}
            </CardDescription>
          </div>
          
          {isEditable && (
            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSaveEdit}>
                    <Check className="w-4 h-4 mr-1" />
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                    <X className="w-4 h-4 mr-1" />
                    Cancel
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={handleStartEdit}>
                  <Edit2 className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Title */}
        <div>
          <Label className="text-sm font-medium text-gray-700">Title</Label>
          {isEditing ? (
            <Input
              value={editedListing.title}
              onChange={(e) => handleFieldChange('title', e.target.value)}
              className="mt-1"
              maxLength={120}
            />
          ) : (
            <h3 className="text-lg font-semibold mt-1">{currentListing.title}</h3>
          )}
        </div>

        {/* Price */}
        <div>
          <Label className="text-sm font-medium text-gray-700">Price</Label>
          <div className="flex items-center mt-1">
            {isEditing ? (
              <div className="flex items-center">
                <Input
                  type="number"
                  value={editedListing.price}
                  onChange={(e) => handleFieldChange('price', parseInt(e.target.value) || 0)}
                  className="w-32"
                  min="0"
                />
                <span className="ml-2 text-gray-500">NOK</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-xl font-bold text-green-600">
                  {currentListing.price.toLocaleString()} NOK
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <Label className="text-sm font-medium text-gray-700">Description</Label>
          {isEditing ? (
            <Textarea
              value={editedListing.description}
              onChange={(e) => handleFieldChange('description', e.target.value)}
              className="mt-1"
              rows={6}
              maxLength={2000}
            />
          ) : (
            <div className="mt-1 text-gray-800 whitespace-pre-wrap border rounded-md p-3 bg-gray-50">
              {currentListing.description}
            </div>
          )}
        </div>

        {/* Selling Points */}
        {currentListing.selling_points.length > 0 && (
          <div>
            <Label className="text-sm font-medium text-gray-700 flex items-center">
              <Star className="w-4 h-4 mr-1" />
              Key Selling Points
            </Label>
            {isEditing ? (
              <Textarea
                value={editedListing.selling_points.join('\n')}
                onChange={(e) => handleSellingPointsChange(e.target.value)}
                className="mt-1"
                rows={4}
                placeholder="One selling point per line"
              />
            ) : (
              <div className="mt-1 space-y-1">
                {currentListing.selling_points.map((point, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-green-500 mt-1">•</span>
                    <span className="text-gray-800">{point}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {currentListing.tags.length > 0 && (
          <div>
            <Label className="text-sm font-medium text-gray-700 flex items-center">
              <Tag className="w-4 h-4 mr-1" />
              Tags
            </Label>
            {isEditing ? (
              <Input
                value={editedListing.tags.join(', ')}
                onChange={(e) => handleTagsChange(e.target.value)}
                className="mt-1"
                placeholder="Separate tags with commas"
              />
            ) : (
              <div className="mt-1 flex flex-wrap gap-2">
                {currentListing.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Metadata */}
        {showMetadata && (
          <div className="pt-4 border-t">
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
              {currentListing.platform && (
                <div>
                  <span className="font-medium">Platform:</span> {currentListing.platform}
                </div>
              )}
              {currentListing.category && (
                <div>
                  <span className="font-medium">Category:</span> {currentListing.category}
                </div>
              )}
              {currentListing.condition && (
                <div>
                  <span className="font-medium">Condition:</span> {currentListing.condition}
                </div>
              )}
              {currentListing.brand && (
                <div>
                  <span className="font-medium">Brand:</span> {currentListing.brand}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Character Counts */}
        {isEditing && (
          <div className="pt-2 border-t text-xs text-gray-500 space-y-1">
            <div>Title: {editedListing.title.length}/120 characters</div>
            <div>Description: {editedListing.description.length}/2000 characters</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ListingPreview;