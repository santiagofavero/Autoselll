/**
 * Platform Card Component
 * Displays platform recommendation information with advantages/disadvantages
 */

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';

export interface PlatformRecommendation {
  platform: string;
  score: number;
  reasons: string[];
  estimatedTimeToSale: string;
  advantages: string[];
  disadvantages: string[];
  expectedPrice?: number;
  fees?: { total: number };
  netProfit?: number;
  successRate?: number;
}

interface PlatformCardProps {
  platform: PlatformRecommendation;
  isSelected?: boolean;
  isRecommended?: boolean;
  onSelect?: (platform: string) => void;
  className?: string;
}

const PLATFORM_CONFIG = {
  finn: {
    name: 'FINN.no',
    color: 'bg-blue-500',
    description: 'Norway\'s leading marketplace',
    icon: '🇳🇴'
  },
  facebook: {
    name: 'Facebook Marketplace',
    color: 'bg-blue-600',
    description: 'Social marketplace platform',
    icon: '📘'
  },
  amazon: {
    name: 'Amazon',
    color: 'bg-orange-500',
    description: 'Global e-commerce platform',
    icon: '📦'
  }
};

export function PlatformCard({ 
  platform, 
  isSelected = false, 
  isRecommended = false,
  onSelect,
  className = ""
}: PlatformCardProps) {
  const config = PLATFORM_CONFIG[platform.platform as keyof typeof PLATFORM_CONFIG] || {
    name: platform.platform,
    color: 'bg-gray-500',
    description: 'Marketplace platform',
    icon: '🏪'
  };

  const scoreColor = platform.score >= 0.8 ? 'text-green-600' :
                    platform.score >= 0.6 ? 'text-yellow-600' : 'text-red-600';

  const scoreLabel = platform.score >= 0.8 ? 'Excellent' :
                     platform.score >= 0.6 ? 'Good' : 'Fair';

  const handleClick = () => {
    if (onSelect) {
      onSelect(platform.platform);
    }
  };

  return (
    <Card 
      className={`relative transition-all duration-200 hover:shadow-md ${
        isSelected ? 'ring-2 ring-blue-500 border-blue-200' : ''
      } ${onSelect ? 'cursor-pointer' : ''} ${className}`}
      onClick={handleClick}
    >
      {/* Recommended Badge */}
      {isRecommended && (
        <div className="absolute -top-2 -right-2 z-10">
          <Badge className="bg-green-500 text-white">
            <TrendingUp className="w-3 h-3 mr-1" />
            Recommended
          </Badge>
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 ${config.color} rounded-lg flex items-center justify-center text-white text-lg`}>
              {config.icon}
            </div>
            <div>
              <CardTitle className="text-lg">{config.name}</CardTitle>
              <CardDescription className="text-sm">{config.description}</CardDescription>
            </div>
          </div>
          
          {/* Score */}
          <div className="text-right">
            <div className={`text-lg font-bold ${scoreColor}`}>
              {Math.round(platform.score * 100)}%
            </div>
            <div className="text-xs text-gray-500">{scoreLabel}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price Display */}
        {platform.expectedPrice && (
          <div className="mb-6">
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Recommended Price</p>
                <p className="text-2xl font-bold">
                  {platform.expectedPrice.toLocaleString('nb-NO')} 
                  <span className="text-sm font-normal text-slate-600"> NOK</span>
                </p>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <div>
                  <p className="text-xs text-slate-500">Platform Fee</p>
                  <p className="text-sm font-medium text-slate-700">-{platform.fees?.total || 0} NOK</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Net Profit</p>
                  <p className="text-sm font-semibold text-green-600">+{platform.netProfit?.toLocaleString('nb-NO') || 0} NOK</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-1 text-gray-600">
            <Clock className="w-4 h-4" />
            <span>{platform.estimatedTimeToSale}</span>
          </div>
          {platform.successRate && (
            <div className="flex items-center space-x-1 text-gray-600">
              <TrendingUp className="w-4 h-4" />
              <span>{Math.round(platform.successRate * 100)}% success rate</span>
            </div>
          )}
          {isSelected && (
            <Badge variant="secondary" className="text-xs">
              <CheckCircle className="w-3 h-3 mr-1" />
              Selected
            </Badge>
          )}
        </div>

        {/* Advantages */}
        {platform.advantages.length > 0 && (
          <div>
            <div className="text-sm font-medium text-green-700 mb-2 flex items-center">
              <CheckCircle className="w-4 h-4 mr-1" />
              Advantages
            </div>
            <div className="space-y-1">
              {platform.advantages.slice(0, 3).map((advantage, index) => (
                <div key={index} className="text-xs text-green-600 flex items-start">
                  <span className="text-green-400 mr-1">•</span>
                  <span>{advantage}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disadvantages */}
        {platform.disadvantages.length > 0 && (
          <div>
            <div className="text-sm font-medium text-red-700 mb-2 flex items-center">
              <XCircle className="w-4 h-4 mr-1" />
              Considerations
            </div>
            <div className="space-y-1">
              {platform.disadvantages.slice(0, 2).map((disadvantage, index) => (
                <div key={index} className="text-xs text-red-600 flex items-start">
                  <span className="text-red-400 mr-1">•</span>
                  <span>{disadvantage}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reasons */}
        {platform.reasons.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">Key Features</div>
            <div className="flex flex-wrap gap-1">
              {platform.reasons.slice(0, 3).map((reason, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {reason}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PlatformCard;