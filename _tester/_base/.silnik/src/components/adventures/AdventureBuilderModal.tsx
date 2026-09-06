'use client';

import React, { useState, useRef, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Gamepad2,
  Scroll,
  Upload,
  Download,
  FileText,
  Music,
  Image as ImageIcon,
  Table,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Network,
  Users,
  Eye,
  EyeOff,
  ArrowRight,
  ChevronLeft,
} from 'lucide-react';
import { AdventureContext } from '@/lib/adventures-data';
import { generateSurpriseAdventure } from '@/lib/adventures/random-adventure-generator';
import { buildCampaignKitZip } from '@/lib/adventures/campaign-kit-builder';
import { processImportedFile, ImportedFileResult } from '@/lib/adventures/file-importer';

interface AdventureBuilderModalProps {
  open: boolean;
  onClose: () => void;
  onAdventureCreated: (adventure: AdventureContext) => void;
}

export function AdventureBuilderModal({
  open,
  onClose,
  onAdventureCreated,
}: AdventureBuilderModalProps) {
  const t = useTranslations('AdventureBuilder');
  const tSel = useTranslations('AdventureSelector');

  // Role: gracz (ukryte spoilery, Clue Web ukryty) vs keeper (Mistrz Gry: pełny wgląd i edycja)
  const [role, setRole] = useState<'player' | 'keeper' | null>(null);

  // Krok w kreatorze
  // Dla Gracza: 'input' -> 'ready' (bez pokazywania Krok 2 śledztwa!)
  // Dla Mistrza Gry: 'input' -> 'review' (edycja NPC, lokacji, grafu) -> 'ready'
  const [step, setStep] = useState<'role' | 'input' | 'review' | 'ready'>('role');

  // Dane przygody
  const [adventure, setAdventure] = useState<AdventureContext>(() =>
    generateSurpriseAdventure('classic')
  );

  // Zaimportowane pliki
  const [importedFiles, setImportedFiles] = useState<ImportedFileResult[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pobieranie ZIP
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [, startTransition] = useTransition();

  const handleReset = () => {
    setRole(null);
    setStep('role');
    setImportedFiles([]);
    setAdventure(generateSurpriseAdventure('classic'));
  };

  const handleSurpriseMe = () => {
    const fresh = generateSurpriseAdventure(adventure.era || 'classic');
    setAdventure(fresh);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingFiles(true);
    const results: ImportedFileResult[] = [];
    for (let i = 0; i < files.length; i++) {
      const res = await processImportedFile(files[i]);
      results.push(res);
    }
    setImportedFiles((prev) => [...prev, ...results]);
    setIsProcessingFiles(false);
  };

  const handleStartGame = () => {
    onAdventureCreated(adventure);
    onClose();
    handleReset();
  };

  const handleDownloadZip = async () => {
    setIsExportingZip(true);
    try {
      const blob = await buildCampaignKitZip(adventure);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeTitle = adventure.title.replace(/[^a-zA-Z0-9_\u00C0-\u017F-]/g, '_');
      a.download = `CampaignKit_${safeTitle}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Błąd eksportu Campaign Kit:', err);
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-4xl border-2 border-brass/50 bg-[#120f0d] text-[#e8dfcf] p-6 shadow-2xl font-serif max-h-[90vh] overflow-y-auto">
        {/* Dekoracyjne narożniki Art Déco */}
        <span className="pointer-events-none absolute left-1 top-1 h-3 w-3 border-l-2 border-t-2 border-brass/70" />
        <span className="pointer-events-none absolute right-1 top-1 h-3 w-3 border-r-2 border-t-2 border-brass/70" />
        <span className="pointer-events-none absolute bottom-1 left-1 h-3 w-3 border-b-2 border-l-2 border-brass/70" />
        <span className="pointer-events-none absolute bottom-1 right-1 h-3 w-3 border-b-2 border-r-2 border-brass/70" />

        <DialogHeader className="border-b border-brass/30 pb-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-display text-xl uppercase tracking-[0.2em] text-brass flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              {t('modalTitle')}
            </DialogTitle>
            {role && (
              <Badge
                variant="outline"
                className={`font-display uppercase tracking-wider text-xs border ${
                  role === 'player'
                    ? 'border-emerald-500/60 text-emerald-400 bg-emerald-950/30'
                    : 'border-amber-500/60 text-amber-400 bg-amber-950/30'
                }`}
              >
                {role === 'player' ? t('rolePlayerBadge') : t('roleKeeperBadge')}
              </Badge>
            )}
          </div>
          <p className="font-special-elite text-xs uppercase tracking-wider text-[#9b8f7e]">
            {t('modalSubtitle')}
          </p>
        </DialogHeader>

        {/* ============================================================ */}
        {/* EKRAN 0: WYBÓR ROLI (GRACZ vs MISTRZ GRY)                     */}
        {/* ============================================================ */}
        {step === 'role' && (
          <div className="py-6 space-y-6">
            <h3 className="text-center font-display text-base uppercase tracking-[0.18em] text-amber-200">
              {t('chooseRolePrompt')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* KAFEL 1: GRACZ */}
              <button
                type="button"
                onClick={() => {
                  setRole('player');
                  setStep('input');
                }}
                className="group relative flex flex-col items-start p-6 text-left rounded-md border-2 border-brass/40 bg-[#191512] hover:bg-[#221c17] hover:border-emerald-500/70 transition-all duration-200 shadow-md"
              >
                <span className="pointer-events-none absolute left-1 top-1 h-2 w-2 border-l border-t border-brass/40 group-hover:border-emerald-400" />
                <span className="pointer-events-none absolute bottom-1 right-1 h-2 w-2 border-b border-r border-brass/40 group-hover:border-emerald-400" />

                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-emerald-500/50 bg-emerald-950/40 text-emerald-400 group-hover:scale-110 transition-transform">
                  <Gamepad2 className="h-6 w-6" />
                </div>

                <h4 className="font-display text-lg uppercase tracking-[0.15em] text-brass group-hover:text-emerald-300">
                  {t('playerTileTitle')}
                </h4>
                <p className="mt-2 text-sm text-[#b8ab99] leading-relaxed">
                  {t('playerTileDesc')}
                </p>

                <div className="mt-4 flex items-center gap-2 text-xs font-special-elite text-emerald-400/90 tracking-wider uppercase">
                  <EyeOff className="h-4 w-4" />
                  {t('playerTileAntiSpoiler')}
                </div>
              </button>

              {/* KAFEL 2: MISTRZ GRY */}
              <button
                type="button"
                onClick={() => {
                  setRole('keeper');
                  setStep('input');
                }}
                className="group relative flex flex-col items-start p-6 text-left rounded-md border-2 border-brass/40 bg-[#191512] hover:bg-[#221c17] hover:border-amber-500/70 transition-all duration-200 shadow-md"
              >
                <span className="pointer-events-none absolute left-1 top-1 h-2 w-2 border-l border-t border-brass/40 group-hover:border-amber-400" />
                <span className="pointer-events-none absolute bottom-1 right-1 h-2 w-2 border-b border-r border-brass/40 group-hover:border-amber-400" />

                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-amber-500/50 bg-amber-950/40 text-amber-400 group-hover:scale-110 transition-transform">
                  <Scroll className="h-6 w-6" />
                </div>

                <h4 className="font-display text-lg uppercase tracking-[0.15em] text-brass group-hover:text-amber-300">
                  {t('keeperTileTitle')}
                </h4>
                <p className="mt-2 text-sm text-[#b8ab99] leading-relaxed">
                  {t('keeperTileDesc')}
                </p>

                <div className="mt-4 flex items-center gap-2 text-xs font-special-elite text-amber-400/90 tracking-wider uppercase">
                  <Eye className="h-4 w-4" />
                  {t('keeperTileFullControl')}
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* EKRAN 1: WPROWADZANIE DANYCH, MATERIAŁY, "ZASKOCZ MNIE"      */}
        {/* ============================================================ */}
        {step === 'input' && (
          <div className="py-4 space-y-6">
            {/* PRZYCISK ZASKOCZ MNIE (One-Click CoC 7e RAW Seed) */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border border-brass/40 bg-[#1c1713] rounded-md gap-3">
              <div>
                <h4 className="font-display text-sm uppercase tracking-wider text-brass flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  {t('surpriseMeTitle')}
                </h4>
                <p className="text-xs text-[#a89d8d]">
                  {t('surpriseMeHint')}
                </p>
              </div>
              <Button
                type="button"
                onClick={handleSurpriseMe}
                variant="outline"
                className="border-amber-500/50 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40 font-display uppercase tracking-wider text-xs whitespace-nowrap"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('surpriseMeButton')}
              </Button>
            </div>

            {/* FORMULARZ ZARYSU */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-display uppercase tracking-wider text-brass mb-1">
                  {tSel('adventureTitleLabel')}
                </label>
                <Input
                  value={adventure.title}
                  onChange={(e) => setAdventure({ ...adventure, title: e.target.value })}
                  className="border-brass/30 bg-[#16120e] text-[#f0e6d6]"
                  placeholder="Tytuł tajemnicy..."
                />
              </div>

              <div>
                <label className="block text-xs font-display uppercase tracking-wider text-brass mb-1">
                  {tSel('locationLabel')}
                </label>
                <Input
                  value={adventure.location}
                  onChange={(e) => setAdventure({ ...adventure, location: e.target.value })}
                  className="border-brass/30 bg-[#16120e] text-[#f0e6d6]"
                  placeholder="np. Arkham, Innsmouth, Londyn..."
                />
              </div>

              <div>
                <label className="block text-xs font-display uppercase tracking-wider text-brass mb-1">
                  {tSel('eraLabel')} & {tSel('exactYearLabel')}
                </label>
                <div className="flex gap-2">
                  <select
                    value={adventure.era}
                    onChange={(e) =>
                      setAdventure({
                        ...adventure,
                        era: e.target.value as AdventureContext['era'],
                      })
                    }
                    className="w-2/3 rounded-md border border-brass/30 bg-[#16120e] px-3 py-2 text-xs text-[#f0e6d6] focus:outline-none"
                  >
                    <option value="classic">{tSel('eraClassic')}</option>
                    <option value="gaslight">{tSel('eraGaslight')}</option>
                    <option value="noir">{tSel('eraNoir')}</option>
                    <option value="prl">{tSel('eraPrl')}</option>
                    <option value="modern">{tSel('eraModern')}</option>
                  </select>
                  <Input
                    value={adventure.yearRange}
                    onChange={(e) => setAdventure({ ...adventure, yearRange: e.target.value })}
                    className="w-1/3 border-brass/30 bg-[#16120e] text-[#f0e6d6]"
                    placeholder="np. 1925"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-display uppercase tracking-wider text-brass mb-1">
                  {tSel('countryLabel')}
                </label>
                <Input
                  value={adventure.country}
                  onChange={(e) => setAdventure({ ...adventure, country: e.target.value })}
                  className="border-brass/30 bg-[#16120e] text-[#f0e6d6]"
                  placeholder="Kraj..."
                />
              </div>
            </div>

            {/* ZAJAWKA (DLA GRACZA) LUB OPIS ZAŁOŻEŃ (DLA MG) */}
            <div>
              <label className="block text-xs font-display uppercase tracking-wider text-brass mb-1">
                {role === 'player' ? t('playerHookLabel') : t('keeperAssumptionsLabel')}
              </label>
              <Textarea
                rows={3}
                value={role === 'player' ? (adventure.hook || adventure.description) : (adventure.customDescription || adventure.description)}
                onChange={(e) => {
                  if (role === 'player') {
                    setAdventure({ ...adventure, hook: e.target.value, description: e.target.value });
                  } else {
                    setAdventure({ ...adventure, customDescription: e.target.value });
                  }
                }}
                className="border-brass/30 bg-[#16120e] text-[#f0e6d6] text-sm"
                placeholder={role === 'player' ? t('playerHookPlaceholder') : t('keeperAssumptionsPlaceholder')}
              />
            </div>

            {/* MULTI-FORMAT IMPORTER */}
            <div className="border border-brass/30 bg-[#16120f] p-4 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-display uppercase tracking-wider text-brass flex items-center gap-2">
                  <Upload className="h-4 w-4 text-primary" />
                  {t('importerHeader')}
                </span>
                <span className="text-[11px] font-special-elite text-[#998b7a]">
                  PDF, Word, Excel, MP3, PNG, TXT
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.txt,.md,.xlsx,.xls,.csv,.mp3,.wav,.png,.jpg,.jpeg"
                onChange={handleFileUpload}
                className="hidden"
              />

              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessingFiles}
                className="w-full border-dashed border-brass/40 py-4 font-display uppercase tracking-wider text-xs text-brass hover:bg-brass/10"
              >
                {t('importerDropButton')}
              </Button>

              {importedFiles.length > 0 && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {importedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 border border-brass/20 bg-[#1f1915] rounded text-xs truncate"
                    >
                      {file.fileType === 'document' && <FileText className="h-4 w-4 text-amber-400 shrink-0" />}
                      {file.fileType === 'spreadsheet' && <Table className="h-4 w-4 text-emerald-400 shrink-0" />}
                      {file.fileType === 'audio' && <Music className="h-4 w-4 text-purple-400 shrink-0" />}
                      {file.fileType === 'image' && <ImageIcon className="h-4 w-4 text-blue-400 shrink-0" />}
                      <span className="truncate">{file.fileName}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* NAWIGACJA KROKÓW */}
            <div className="flex items-center justify-between pt-3 border-t border-brass/20">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep('role')}
                className="text-xs font-display uppercase tracking-wider text-[#a89d8d]"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t('backToRole')}
              </Button>

              <Button
                type="button"
                onClick={() => {
                  if (role === 'player') {
                    // DLA GRACZA: Pomijamy Krok 2 (Clue Web) dla zachowania tajemnicy!
                    setStep('ready');
                  } else {
                    // DLA MG: Przechodzimy do inspekcji śledztwa CoC 7e
                    setStep('review');
                  }
                }}
                className="bg-brass text-[#120f0d] hover:bg-brass/90 font-display uppercase tracking-wider text-xs font-bold px-6"
              >
                {role === 'player' ? t('continueToPlayerReady') : t('continueToKeeperReview')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* EKRAN 2: INSPEKCJA I EDYCJA ŚLEDZTWA (TYLKO DLA MISTRZA GRY) */}
        {/* ============================================================ */}
        {step === 'review' && role === 'keeper' && (
          <div className="py-4 space-y-6">
            <div className="flex items-center justify-between border-b border-brass/20 pb-2">
              <div>
                <h3 className="font-display text-sm uppercase tracking-wider text-brass flex items-center gap-2">
                  <Network className="h-4 w-4 text-amber-400" />
                  {t('clueWebTitle')}
                </h3>
                <p className="text-xs text-[#a89d8d]">
                  {t('clueWebSubtitle')}
                </p>
              </div>
              <Badge variant="outline" className="border-amber-500/50 text-amber-300 text-[11px] font-special-elite">
                CoC 7e RAW &bull; MG ONLY
              </Badge>
            </div>

            {/* DRAMATIS PERSONAE */}
            <div>
              <h4 className="font-display text-xs uppercase tracking-wider text-brass mb-2 flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-primary" />
                {t('dramatisPersonae')} ({adventure.graph?.npcs.length || 0})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {adventure.graph?.npcs.map((npc) => (
                  <div key={npc.id} className="p-3 border border-brass/30 bg-[#16120e] rounded text-xs space-y-1">
                    <div className="font-display font-bold text-amber-200">{npc.name}</div>
                    <div className="text-[#b0a390]">{npc.description}</div>
                    {npc.secret && (
                      <div className="text-red-400/90 italic mt-1 text-[11px]">
                        ⚠️ Sekret MG: {npc.secret}
                      </div>
                    )}
                    {npc.statsSummary && (
                      <div className="text-[10px] font-mono text-[#8a7f70] pt-1">
                        {npc.statsSummary}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* CLUE WEB CONNECTIONS */}
            <div>
              <h4 className="font-display text-xs uppercase tracking-wider text-brass mb-2 flex items-center gap-2">
                <Network className="h-3.5 w-3.5 text-primary" />
                {t('clueWebConnections')} ({adventure.graph?.connections.length || 0})
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                {adventure.graph?.connections.map((conn, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 border border-brass/20 bg-[#181410] rounded text-xs">
                    <span className="font-mono text-amber-400 font-bold">{conn.fromId}</span>
                    <span className="text-[#887b6a]">&rarr;</span>
                    <span className="text-[#d8cdbc] flex-1">{conn.description}</span>
                    <span className="text-[#887b6a]">&rarr;</span>
                    <span className="font-mono text-amber-400 font-bold">{conn.toId}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* NAWIGACJA */}
            <div className="flex items-center justify-between pt-3 border-t border-brass/20">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep('input')}
                className="text-xs font-display uppercase tracking-wider text-[#a89d8d]"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t('backToInput')}
              </Button>

              <Button
                type="button"
                onClick={() => setStep('ready')}
                className="bg-brass text-[#120f0d] hover:bg-brass/90 font-display uppercase tracking-wider text-xs font-bold px-6"
              >
                {t('continueToDualOutput')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* EKRAN 3: GOTOWOŚĆ I DUAL-OUTPUT (GRA W APCE LUB ZIP)          */}
        {/* ============================================================ */}
        {step === 'ready' && (
          <div className="py-4 space-y-6">
            <div className="p-4 border border-brass/40 bg-[#191511] rounded-md space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-display text-sm uppercase tracking-wider">
                <CheckCircle2 className="h-5 w-5" />
                {t('adventureReadyHeader')}
              </div>
              <h3 className="font-display text-lg text-brass">{adventure.title}</h3>
              <p className="text-xs text-[#a89d8d] font-special-elite">
                {adventure.eraLabel || adventure.era} &bull; {adventure.yearRange} &bull; {adventure.location}
              </p>
              <div className="mt-2 text-xs text-[#dcd2c3] italic bg-[#110e0c] p-3 rounded border border-brass/20">
                &ldquo;{adventure.hook || adventure.description}&rdquo;
              </div>
            </div>

            {/* PRZYCISKI DUAL OUTPUT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* WYJŚCIE 1: GRA W APLIKACJI */}
              <div className="p-4 border border-brass/30 bg-[#16120e] rounded flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="font-display text-sm uppercase tracking-wider text-brass flex items-center gap-2">
                    <Gamepad2 className="h-4 w-4 text-emerald-400" />
                    {t('playInAppTitle')}
                  </h4>
                  <p className="text-xs text-[#a89d8d] mt-1">
                    {t('playInAppDesc')}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleStartGame}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-display uppercase tracking-wider text-xs font-bold py-5"
                >
                  <Gamepad2 className="mr-2 h-4 w-4" />
                  {t('playInAppButton')}
                </Button>
              </div>

              {/* WYJŚCIE 2: POBIERZ PAKIET MG (ZIP) */}
              <div className="p-4 border border-brass/30 bg-[#16120e] rounded flex flex-col justify-between space-y-3">
                <div>
                  <h4 className="font-display text-sm uppercase tracking-wider text-brass flex items-center gap-2">
                    <Download className="h-4 w-4 text-amber-400" />
                    {t('downloadKitTitle')}
                  </h4>
                  <p className="text-xs text-[#a89d8d] mt-1">
                    {t('downloadKitDesc')}
                  </p>
                  {role === 'player' && (
                    <div className="mt-2 flex items-center gap-1 text-[11px] text-amber-400/80 font-special-elite">
                      <AlertTriangle className="h-3 w-3 shrink-0" />
                      {t('playerDownloadWarning')}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  onClick={handleDownloadZip}
                  disabled={isExportingZip}
                  variant="outline"
                  className="w-full border-amber-500/50 text-amber-300 hover:bg-amber-950/40 font-display uppercase tracking-wider text-xs font-bold py-5"
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isExportingZip ? t('exportingZip') : t('downloadKitButton')}
                </Button>
              </div>
            </div>

            {/* NAWIGACJA */}
            <div className="flex items-center justify-between pt-3 border-t border-brass/20">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep(role === 'player' ? 'input' : 'review')}
                className="text-xs font-display uppercase tracking-wider text-[#a89d8d]"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                {t('back')}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleReset}
                className="text-xs font-display uppercase tracking-wider text-[#a89d8d] hover:text-amber-300"
              >
                {t('startOver')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
