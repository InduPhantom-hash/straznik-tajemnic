'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Button } from './button';
import { Character } from '@/lib/types';
import { EnhancedCharacterTemplate } from '@/lib/enhanced-character-templates';
import {
  characterPortraitGenerator,
  PortraitConfig,
  PortraitResult,
} from '@/lib/character-portrait-generator';

interface PortraitGeneratorProps {
  character: Character;
  template?: EnhancedCharacterTemplate;
  onPortraitSelected: (imageUrl: string) => void;
  onClose: () => void;
}

export function PortraitGeneratorModal({
  character,
  template,
  onPortraitSelected,
  onClose,
}: PortraitGeneratorProps) {
  const t = useTranslations('PortraitGenerator');
  const [isGenerating, setIsGenerating] = useState(false);
  const [portraits, setPortraits] = useState<PortraitResult[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<PortraitConfig>({
    character,
    template,
    style: 'realistic',
    mood: 'serious',
    setting: 'studio',
  });

  // Generate portraits with current config
  const generatePortraits = async () => {
    setIsGenerating(true);
    setPortraits([]);

    try {
      const variants =
        await characterPortraitGenerator.generatePortraitVariants(
          selectedConfig
        );
      setPortraits(variants);
    } catch (error) {
      console.error('Error generating portraits:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Generate quick portrait
  const generateQuickPortrait = async () => {
    setIsGenerating(true);

    try {
      const result = await characterPortraitGenerator.generateQuickPortrait(
        character,
        template
      );
      if (result) {
        setPortraits([result]);
      }
    } catch (error) {
      console.error('Error generating quick portrait:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle portrait selection
  const handlePortraitSelect = (imageUrl: string) => {
    onPortraitSelected(imageUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-[90vw] max-w-[1440px] mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {t('title', { name: character.name })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {character.occupation} •{' '}
              {character.age ? t('ageYears', { age: character.age }) : t('ageUnknown')}
            </p>
          </div>
          <Button onClick={onClose} variant="outline" size="sm">
            ✕
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4 mb-6">
          <Button
            onClick={generateQuickPortrait}
            disabled={isGenerating}
            className="bg-primary hover:bg-primary/90"
          >
            {t('quickPortrait')}
          </Button>
          <Button
            onClick={generatePortraits}
            disabled={isGenerating}
            variant="outline"
          >
            {t('manyVariants')}
          </Button>
        </div>

        {/* Configuration Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
          {/* Style Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('styleLabel')}
            </label>
            <select
              value={selectedConfig.style}
              onChange={(e) =>
                setSelectedConfig({
                  ...selectedConfig,
                  style: e.target.value as PortraitConfig['style'],
                })
              }
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="realistic">{t('styleRealistic')}</option>
              <option value="artistic">{t('styleArtistic')}</option>
              <option value="noir">{t('styleNoir')}</option>
              <option value="vintage">{t('styleVintage')}</option>
            </select>
          </div>

          {/* Mood Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('moodLabel')}
            </label>
            <select
              value={selectedConfig.mood}
              onChange={(e) =>
                setSelectedConfig({
                  ...selectedConfig,
                  mood: e.target.value as PortraitConfig['mood'],
                })
              }
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="serious">{t('moodSerious')}</option>
              <option value="mysterious">{t('moodMysterious')}</option>
              <option value="confident">{t('moodConfident')}</option>
              <option value="haunted">{t('moodHaunted')}</option>
              <option value="scholarly">{t('moodScholarly')}</option>
            </select>
          </div>

          {/* Setting Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('settingLabel')}
            </label>
            <select
              value={selectedConfig.setting}
              onChange={(e) =>
                setSelectedConfig({
                  ...selectedConfig,
                  setting: e.target.value as PortraitConfig['setting'],
                })
              }
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
            >
              <option value="studio">{t('settingStudio')}</option>
              <option value="office">{t('settingOffice')}</option>
              <option value="library">{t('settingLibrary')}</option>
              <option value="street">{t('settingStreet')}</option>
              <option value="home">{t('settingHome')}</option>
            </select>
          </div>
        </div>

        {/* Character Preview */}
        <div className="bg-muted/30 p-4 rounded-lg mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-2">
            {t('previewHeading')}
          </h3>
          <div className="text-xs text-muted-foreground">
            {characterPortraitGenerator
              .generatePortraitPrompt(selectedConfig)
              .substring(0, 200)}
            ...
          </div>
        </div>

        {/* Loading State */}
        {isGenerating && (
          <div className="text-center py-12">
            <div className="animate-spin text-6xl mb-4">🎨</div>
            <p className="text-lg font-semibold text-foreground">
              {t('loadingTitle')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('loadingHint')}
            </p>
          </div>
        )}

        {/* Portrait Gallery */}
        {portraits.length > 0 && !isGenerating && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-foreground">
              {t('galleryHeading')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {portraits.map((portrait, index) => (
                <div
                  key={index}
                  className="bg-muted/30 border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => handlePortraitSelect(portrait.imageUrl)}
                >
                  <div className="aspect-square bg-muted rounded-lg mb-3 overflow-hidden relative">
                    <Image
                      src={portrait.imageUrl}
                      alt={t('portraitAlt', { name: character.name, variant: index + 1 })}
                      width={300}
                      height={300}
                      className="w-full h-full object-cover hover:scale-105 transition-transform"
                      unoptimized
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src =
                          '/api/placeholder-image?text=B%C5%82%C4%85d+%C5%82adowania+portretu&width=300&height=300';
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">
                        {t('variantLabel', { variant: index + 1 })}
                      </span>
                      <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                        {portrait.style}
                      </span>
                    </div>

                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePortraitSelect(portrait.imageUrl);
                      }}
                      className="w-full text-xs"
                      size="sm"
                    >
                      {t('chooseThisPortrait')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {portraits.length === 0 && !isGenerating && (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
            <div className="text-4xl mb-4">🎭</div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('readyTitle')}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {t('readyHint')}
            </p>

            {/* Suggested Configs */}
            <div className="flex flex-wrap justify-center gap-2">
              {characterPortraitGenerator
                .getSuggestedPortraitConfigs(character, template)
                .map((config, index) => (
                  <Button
                    key={index}
                    onClick={() => {
                      setSelectedConfig(config);
                      generatePortraits();
                    }}
                    variant="outline"
                    size="sm"
                    disabled={isGenerating}
                    className="text-xs"
                  >
                    {config.style} • {config.mood} • {config.setting}
                  </Button>
                ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between pt-6 border-t border-border">
          <Button onClick={onClose} variant="outline">
            {t('cancel')}
          </Button>

          {portraits.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {t('clickToSelectHint')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
