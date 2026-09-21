'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Search,
  BookOpen,
  FileQuestion,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Bookmark,
  Layers,
  ChevronRight,
  Terminal,
} from 'lucide-react';

interface LoreEntry {
  id: string;
  term: string;
  category: string;
  categoryTitle: string;
  shortDefinition: string;
  fullContent?: string;
  tags?: string[];
  sourceUrl?: string;
  sourceAttribution?: string;
  license?: string;
  isPublicDomain?: boolean;
}

type SubTab = 'LORE' | 'RULES';

export function LovecraftLoreTab() {
  const t = useTranslations('CompendiumModal');
  const [subTab, setSubTab] = useState<SubTab>('LORE');

  // Stan dla podwidoku LORE
  const [loreEntries, setLoreEntries] = useState<LoreEntry[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeEntry, setActiveEntry] = useState<LoreEntry | null>(null);
  const [isLoadingLore, setIsLoadingLore] = useState<boolean>(true);

  // Stan dla podwidoku RULES (Mini-Obsidian)
  const [activeRuleTopic, setActiveRuleTopic] = useState<string>('success_levels');
  const [ragQuery, setRagQuery] = useState<string>('');
  const [ragAnswer, setRagAnswer] = useState<string | null>(null);
  const [ragSources, setRagSources] = useState<Array<{ term: string; sourceUrl: string }> | null>(null);
  const [isRagLoading, setIsRagLoading] = useState<boolean>(false);
  const [hasUploadedPdf, setHasUploadedPdf] = useState<boolean>(false);
  const [uploadedPdfName, setUploadedPdfName] = useState<string>('');

  // Sprawdzenie stanu wgranego podręcznika w pamięci
  useEffect(() => {
    try {
      const storedPdfMemory = localStorage.getItem('pdf_memory');
      if (storedPdfMemory) {
        const parsed = JSON.parse(storedPdfMemory);
        if (parsed.rulesFileName || parsed.rulesUrl) {
          setHasUploadedPdf(true);
          setUploadedPdfName(parsed.rulesFileName || 'Podręcznik Badacza 7e');
        }
      }
    } catch {
      // Ignoruj błędy parsowania
    }
  }, []);

  // Wczytywanie otwartej encyklopedii
  useEffect(() => {
    if (subTab !== 'LORE') return;
    setIsLoadingLore(true);

    fetch('/api/mythos/index')
      .then((res) => {
        if (!res.ok) throw new Error('Data not found');
        return res.json();
      })
      .then((data: LoreEntry[] | { entries: LoreEntry[] }) => {
        const list = Array.isArray(data) ? data : data.entries;
        setLoreEntries(list);
        if (list.length > 0) {
          setActiveEntry(list[0]);
        }
        setIsLoadingLore(false);
      })
      .catch(() => {
        // Fallback do danych lokalnych w razie niedostępności endpointu
        const fallback: LoreEntry[] = [
          {
            id: 'cthulhu',
            term: 'Cthulhu',
            category: 'great_old_ones',
            categoryTitle: 'Wielcy Przedwieczni',
            shortDefinition: "Wielki Przedwieczny spoczywający w zatopionym mieście R'lyeh, czekający aż gwiazdy znajdą się we właściwym położeniu.",
            fullContent: "Cthulhu to potężna istota zrodzona w kosmicznych otchłaniach, łącząca cechy głowonoga, człowieka i smoka. Jego uśpiony umysł wpływa na sny artystów i ludzi o chwiejnej psychice na całym świecie.",
            sourceUrl: 'https://en.wikipedia.org/wiki/Cthulhu',
            sourceAttribution: 'Wikipedia (Public Domain / CC-BY-SA)',
            license: 'CC-BY-SA 3.0 / Public Domain',
            isPublicDomain: true,
          },
          {
            id: 'necronomicon',
            term: 'Necronomicon',
            category: 'grimoires',
            categoryTitle: 'Księgi i Arkanum',
            shortDefinition: 'Mityczny grymuar autorstwa Abdula Alhazreda, spisany w Damaszku ok. 730 r. pod tytułem Al Azif.',
            fullContent: 'Zawiera opisy historii Zewnętrznych Bogów i Wielkich Przedwiecznych oraz bluźniercze rytuały przywołań. Egzemplarze łacińskie i greckie przechowywane są pod kluczem w Miskatonic University w Arkham.',
            sourceUrl: 'https://en.wikipedia.org/wiki/Necronomicon',
            sourceAttribution: 'Wikipedia (Public Domain / CC-BY-SA)',
            license: 'CC-BY-SA 3.0 / Public Domain',
            isPublicDomain: true,
          },
          {
            id: 'prohibition',
            term: 'Prohibicja (Lata 20.)',
            category: 'epoch',
            categoryTitle: 'Epoka i Historia 1920s',
            shortDefinition: '18. Poprawka do Konstytucji USA zakazująca produkcji i sprzedaży alkoholu (1920–1933).',
            fullContent: 'Okres rozkwitu nielegalnych lokali (speakeasies), bimbrownictwa (bootlegging) i zorganizowanych syndykatów przestępczych. Badacze często wchodzą w drogę przemytnikom w opuszczonych portach i magazynach.',
            sourceUrl: 'https://en.wikipedia.org/wiki/Prohibition_in_the_United_States',
            sourceAttribution: 'Wikipedia (Public Domain / CC-BY-SA)',
            license: 'CC-BY-SA 3.0 / Public Domain',
            isPublicDomain: true,
          },
        ];
        setLoreEntries(fallback);
        setActiveEntry(fallback[0]);
        setIsLoadingLore(false);
      });
  }, [subTab]);

  // Pobranie pełnej treści hasła przy selekcji
  useEffect(() => {
    if (!activeEntry || activeEntry.fullContent) return;
    fetch(`/api/mythos/${encodeURIComponent(activeEntry.id)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { entry?: LoreEntry } | null) => {
        if (data?.entry) {
          setActiveEntry(data.entry);
        }
      })
      .catch(() => undefined);
  }, [activeEntry]);

  // Filtrowanie haseł w encyklopedii
  const categories = Array.from(new Set(loreEntries.map((e) => e.categoryTitle))).filter(Boolean);

  const filteredEntries = loreEntries.filter((entry) => {
    const matchesCategory = activeCategory === 'ALL' || entry.categoryTitle === activeCategory;
    const matchesSearch =
      searchQuery === '' ||
      entry.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.shortDefinition.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Obsługa zapytania do lokalnego RAG
  const handleAskRag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ragQuery.trim() || isRagLoading) return;

    setIsRagLoading(true);
    setRagAnswer(null);
    setRagSources(null);

    try {
      const res = await fetch('/api/mythos/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: ragQuery }),
      });

      if (!res.ok) throw new Error('Query failed');
      const data = await res.json();
      setRagAnswer(data.answer || t('lore_ragNoAnswer'));
      setRagSources(data.sources || []);
    } catch {
      setRagAnswer(t('lore_ragErrorFallback'));
    } finally {
      setIsRagLoading(false);
    }
  };

  const rawRuleTopics = [
    {
      id: 'success_levels',
      title: t('lore_ruleSuccessLevelsTitle'),
      badge: t('lore_ruleSuccessLevelsBadge'),
      summary: t('lore_ruleSuccessLevelsSummary'),
      mechanics: t('lore_ruleSuccessLevelsMechanics'),
      example: t('lore_ruleSuccessLevelsExample'),
    },
    {
      id: 'idea_roll',
      title: t('lore_ruleIdeaRollTitle'),
      badge: t('lore_ruleIdeaRollBadge'),
      summary: t('lore_ruleIdeaRollSummary'),
      mechanics: t('lore_ruleIdeaRollMechanics'),
      example: t('lore_ruleIdeaRollExample'),
    },
    {
      id: 'pushed_roll',
      title: t('lore_rulePushedRollTitle'),
      badge: t('lore_rulePushedRollBadge'),
      summary: t('lore_rulePushedRollSummary'),
      mechanics: t('lore_rulePushedRollMechanics'),
      example: t('lore_rulePushedRollExample'),
    },
    {
      id: 'bonus_penalty_dice',
      title: t('lore_ruleBonusPenaltyTitle'),
      badge: t('lore_ruleBonusPenaltyBadge'),
      summary: t('lore_ruleBonusPenaltySummary'),
      mechanics: t('lore_ruleBonusPenaltyMechanics'),
      example: t('lore_ruleBonusPenaltyExample'),
    },
    {
      id: 'sanity_madness',
      title: t('lore_ruleSanityTitle'),
      badge: t('lore_ruleSanityBadge'),
      summary: t('lore_ruleSanitySummary'),
      mechanics: t('lore_ruleSanityMechanics'),
      example: t('lore_ruleSanityExample'),
    },
    {
      id: 'combat_maneuvers',
      title: t('lore_ruleCombatTitle'),
      badge: t('lore_ruleCombatBadge'),
      summary: t('lore_ruleCombatSummary'),
      mechanics: t('lore_ruleCombatMechanics'),
      example: t('lore_ruleCombatExample'),
    },
  ];

  const selectedRule = rawRuleTopics.find((r) => r.id === activeRuleTopic) || rawRuleTopics[0];

  return (
    <div className="space-y-6">
      {/* Przełącznik Podwidoków (Sub-tabs) */}
      <div className="flex items-center justify-between border-b border-brass/30 pb-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setSubTab('LORE')}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-serif rounded-md transition-all ${
              subTab === 'LORE'
                ? 'bg-brass/20 text-brass font-bold border border-brass/40 shadow-sm'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            {t('lore_subTabLoreTitle')}
          </button>

          <button
            type="button"
            onClick={() => setSubTab('RULES')}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-serif rounded-md transition-all ${
              subTab === 'RULES'
                ? 'bg-brass/20 text-brass font-bold border border-brass/40 shadow-sm'
                : 'bg-card text-muted-foreground hover:text-foreground border border-border'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            {t('lore_subTabRulesTitle')}
          </button>
        </div>

        {/* Wskaźnik licencji / statusu */}
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-courier-prime text-muted-foreground">
          <ShieldCheck className="w-3.5 h-3.5 text-brass" />
          <span>{subTab === 'LORE' ? t('lore_openLicenseBadge') : t('lore_rawCoCBadge')}</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PODWIDOK 1: ŚWIAT I MITY (OTWARTA ENCYKLOPEDIA CC/PD)     */}
      {/* ======================================================== */}
      {subTab === 'LORE' && (
        <div className="space-y-4">
          {/* Pasek Wyszukiwania i Kategorie */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('lore_searchLorePlaceholder')}
                className="w-full pl-9 pr-4 py-2 bg-input/40 border border-border rounded-md text-xs font-courier-prime text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-brass/50"
              />
            </div>

            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              aria-label={t('lore_filterCategoryAria')}
              className="px-3 py-2 bg-input/40 border border-border rounded-md text-xs font-serif text-foreground focus:outline-none focus:border-brass/50"
            >
              <option value="ALL">{t('lore_categoryAll')}</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Dwie kolumny: Lista haseł + Treść hasła */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[440px]">
            {/* Lewa kolumna: Lista haseł */}
            <div className="md:col-span-4 rounded-md border border-border bg-card/40 overflow-y-auto p-2 space-y-1">
              {isLoadingLore ? (
                <div className="p-4 text-center text-xs font-courier-prime text-muted-foreground">
                  {t('lore_loadingLore')}
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="p-4 text-center text-xs font-courier-prime text-muted-foreground">
                  {t('lore_noLoreMatches')}
                </div>
              ) : (
                filteredEntries.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveEntry(item)}
                    className={`w-full text-left p-2.5 rounded transition-all flex flex-col gap-0.5 ${
                      activeEntry?.id === item.id
                        ? 'bg-brass/20 text-brass border-l-2 border-brass'
                        : 'text-foreground/80 hover:bg-card hover:text-foreground'
                    }`}
                  >
                    <span className="text-xs font-serif font-bold line-clamp-1">
                      {item.term}
                    </span>
                    <span className="text-[10px] font-courier-prime text-muted-foreground line-clamp-1">
                      {item.categoryTitle || item.category}
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* Prawa kolumna: Szczegóły aktywnego hasła */}
            <div className="md:col-span-8 rounded-md border border-brass/30 bg-card/70 p-5 overflow-y-auto flex flex-col justify-between space-y-4">
              {activeEntry ? (
                <div className="space-y-4">
                  <div className="border-b border-border pb-3">
                    <span className="text-[10px] font-courier-prime text-brass uppercase tracking-widest">
                      {activeEntry.categoryTitle}
                    </span>
                    <h3 className="text-lg font-serif font-bold text-brass mt-0.5">
                      {activeEntry.term}
                    </h3>
                  </div>

                  <div className="space-y-3 text-xs leading-relaxed text-foreground/90">
                    <p className="font-serif italic text-brass/90 border-l-2 border-brass/40 pl-3 py-0.5 bg-brass/5 rounded-r">
                      {activeEntry.shortDefinition}
                    </p>

                    {activeEntry.fullContent && (
                      <div className="text-xs text-foreground/80 font-sans whitespace-pre-line space-y-2">
                        {activeEntry.fullContent}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-xs font-courier-prime text-muted-foreground">
                  {t('lore_selectLorePrompt')}
                </div>
              )}

              {/* Pasek licencji i źródła otwartego */}
              {activeEntry && (
                <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2 text-[10px] font-courier-prime text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-brass" />
                    <span>
                      {t('lore_licenseLabel')}: {activeEntry.license || 'CC-BY-SA 3.0 / Public Domain'}
                    </span>
                  </div>

                  {activeEntry.sourceUrl && (
                    <a
                      href={activeEntry.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brass hover:underline flex items-center gap-1"
                    >
                      <span>{t('lore_sourceLinkLabel')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PODWIDOK 2: KODEKS ZASAD & MINI-OBSIDIAN RAG             */}
      {/* ======================================================== */}
      {subTab === 'RULES' && (
        <div className="space-y-6">
          {/* Stan wgranego podręcznika (Status RAG) */}
          <div className="p-4 rounded-md border border-border bg-card/60 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={`p-2 rounded-md border ${hasUploadedPdf ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-brass/10 border-brass/30 text-brass'}`}>
                {hasUploadedPdf ? <Bookmark className="w-4 h-4" /> : <FileQuestion className="w-4 h-4" />}
              </span>
              <div>
                <h4 className="text-xs font-serif font-bold text-foreground">
                  {hasUploadedPdf ? t('lore_pdfIndexedStatusTitle') : t('lore_pdfNotIndexedTitle')}
                </h4>
                <p className="text-[11px] font-courier-prime text-muted-foreground">
                  {hasUploadedPdf ? `${t('lore_pdfIndexedFileName')}: ${uploadedPdfName}` : t('lore_pdfNotIndexedHint')}
                </p>
              </div>
            </div>

            <div className="text-[10px] font-courier-prime px-2.5 py-1 rounded bg-input/50 border border-border text-muted-foreground">
              {hasUploadedPdf ? t('lore_ragActiveBadge') : t('lore_builtInRulesOnlyBadge')}
            </div>
          </div>

          {/* Wyszukiwarka Zasad (Mini-Obsidian RAG Query) */}
          <form onSubmit={handleAskRag} className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Terminal className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brass" />
                <input
                  type="text"
                  value={ragQuery}
                  onChange={(e) => setRagQuery(e.target.value)}
                  placeholder={t('lore_ragSearchPlaceholder')}
                  className="w-full pl-9 pr-4 py-2.5 bg-input/50 border border-border rounded-md text-xs font-courier-prime text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-brass/60"
                />
              </div>
              <button
                type="submit"
                disabled={isRagLoading || !ragQuery.trim()}
                className="px-4 py-2.5 bg-brass/20 text-brass font-serif font-bold text-xs rounded-md border border-brass/40 hover:bg-brass/30 transition-all disabled:opacity-50"
              >
                {isRagLoading ? t('lore_ragSearchingBtn') : t('lore_ragSearchBtn')}
              </button>
            </div>

            {/* Wynik RAG (jeśli szukano) */}
            {ragAnswer && (
              <div className="p-4 rounded-md border border-brass/40 bg-card/90 space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-border pb-2">
                  <span className="font-serif font-bold text-brass flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    {t('lore_ragAnswerHeader')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setRagAnswer(null);
                      setRagSources(null);
                    }}
                    className="text-[10px] font-courier-prime text-muted-foreground hover:text-foreground"
                  >
                    {t('lore_clearRagAnswer')}
                  </button>
                </div>
                <div className="text-foreground/90 font-serif leading-relaxed whitespace-pre-line">
                  {ragAnswer}
                </div>
                {ragSources && ragSources.length > 0 && (
                  <div className="pt-2 border-t border-border/60 text-[10px] font-courier-prime text-muted-foreground flex flex-wrap gap-2">
                    <span>{t('lore_ragSourcesLabel')}:</span>
                    {ragSources.map((s, idx) => (
                      <span key={idx} className="text-brass">
                        {s.term}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </form>

          {/* Wbudowany Leksykon Reguł CoC 7e RAW (Mini-Obsidian Graph/List) */}
          <div className="space-y-3">
            <h4 className="text-xs font-serif font-bold text-brass uppercase tracking-wider">
              {t('lore_rawRulesHandbookHeader')}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              {/* Spis tematów po lewej */}
              <div className="md:col-span-4 rounded-md border border-border bg-card/40 p-2 space-y-1">
                {rawRuleTopics.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveRuleTopic(item.id)}
                    className={`w-full text-left p-2.5 rounded transition-all flex items-center justify-between ${
                      activeRuleTopic === item.id
                        ? 'bg-brass/20 text-brass font-bold border border-brass/40'
                        : 'text-foreground/80 hover:bg-card'
                    }`}
                  >
                    <span className="text-xs font-serif line-clamp-1">
                      {item.title}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                ))}
              </div>

              {/* Szczegóły wybranej reguły po prawej */}
              <div className="md:col-span-8 rounded-md border border-brass/30 bg-card/70 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-sm font-serif font-bold text-brass">
                    {selectedRule.title}
                  </h3>
                  <span className="text-[10px] font-courier-prime px-2 py-0.5 rounded bg-input border border-border text-brass">
                    {selectedRule.badge}
                  </span>
                </div>

                <div className="space-y-3 text-xs leading-relaxed">
                  <p className="font-serif italic text-brass/90 border-l-2 border-brass/40 pl-3 py-0.5 bg-brass/5 rounded-r">
                    {selectedRule.summary}
                  </p>

                  <div className="space-y-1">
                    <h5 className="font-serif font-bold text-foreground uppercase tracking-wide text-[11px]">
                      {t('lore_ruleMechanicsSectionTitle')}:
                    </h5>
                    <p className="text-muted-foreground font-sans">
                      {selectedRule.mechanics}
                    </p>
                  </div>

                  <div className="p-3 rounded bg-input/40 border border-border space-y-1">
                    <h5 className="font-courier-prime font-bold text-brass text-[10px] uppercase">
                      {t('lore_ruleExampleSectionTitle')}:
                    </h5>
                    <p className="text-foreground/90 font-courier-prime text-[11px] italic">
                      {selectedRule.example}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
