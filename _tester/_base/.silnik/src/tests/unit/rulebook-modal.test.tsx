import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RulebookModal } from '@/components/dialogs/RulebookModal';
import {
  loadCustomAdventures,
  saveCustomAdventures,
} from '@/lib/custom-adventures-storage';

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    const messages: Record<string, string> = {
      title: 'Podręcznik Zasad d100 (zgodny z CoC 7e)',
      description: 'Wgraj oficjalny podręcznik zasad d100 (PDF).',
      privacyLabel: 'Prywatność i przetwarzanie lokalne:',
      privacyDescription: 'Pliki są przetwarzane lokalnie.',
      requiredBadge: 'Wymagany',
      optionalBadge: 'Opcjonalne',
      readyBadge: `Gotowy (${values?.count ?? 0} fragmentów zasad)`,
      expansionOnlyBadge: 'Wymagana baza d100',
      leftColTitle: '1. Podręczniki Zasad (Wymagane)',
      leftColSubtitle: 'Wgraj przynajmniej Starter lub Księgę Strażnika.',
      rightColTitle: '2. Przygody, Lorebooki i Bestiariusze (Opcjonalne)',
      rightColSubtitle: 'Wgraj gotowe scenariusze, antologie, kampanie.',
      dropZonePrompt: 'Kliknij lub upuść plik PDF z zasadami',
      dropZoneSub: 'Księga Strażnika CoC 7e, Starter, Pulp Cthulhu',
      dropZoneOptionalPrompt: 'Kliknij lub upuść przygodę / dodatek PDF',
      dropZoneOptionalSub: 'Scenariusze, antologie, kampanie, Wielki Grymuar',
      processingTitle: 'Przetwarzam dokument PDF...',
      processingDescription: 'Parsowanie treści...',
      successTitle: 'Dokument PDF wczytany pomyślnie!',
      successIndexed: `Zindeksowano ${values?.count ?? 0} fragmentów.`,
      errorTitle: 'Błąd podczas wgrywania pliku PDF',
      retry: 'Spróbuj ponownie',
      close: 'Zamknij',
      continueToGame: 'Gotowe, przejdź do gry',
      lockedContinueHint:
        'Wgraj Starter lub Księgę Strażnika (Core) w lewej kolumnie, aby odblokować przejście do gry.',
      pulpRequiresCoreTitle: 'Wgrano dodatek zasad bez podręcznika bazowego',
      pulpRequiresCoreDesc:
        'Pulp Cthulhu oraz Podręcznik Badacza rozszerzają mechanikę, ale wymagają bazowych reguł d100.',
      autoRoutedToOptionalTitle:
        'Wykryto przygodę lub suplement - przeniesiono do kolumny Opcjonalne',
      autoRoutedToOptionalDesc: `Plik "${values?.fileName}" został rozpoznany jako "${values?.profileTitle}" (${values?.adventureCount ?? 0} scen.).`,
      autoRoutedToRulesTitle:
        'Wykryto podręcznik zasad - przeniesiono do kolumny Wymagane',
      autoRoutedToRulesDesc: `Plik "${values?.fileName}" został rozpoznany jako podręcznik zasad.`,
      starterScenarioExtractedNote:
        'Wyodrębniono również wbudowany scenariusz ze Startera i dodano go do Manual Setup.',
      installedRulesHeader: `Wgrane podręczniki zasad (${values?.count ?? 0})`,
      installedOptionalHeader: `Wgrane przygody i dodatki (${values?.count ?? 0})`,
      emptyRulesList: 'Brak wgranych podręczników zasad.',
      emptyOptionalList: 'Brak wgranych dodatków.',
      removeFileButton: 'Usuń',
      removeCascadeHint: 'Usuwa nakładkę RAG oraz powiązane przygody',
      badgeBaseRulebook: 'Zasady bazowe',
      badgeExpansionRulebook: 'Dodatek zasad',
      badgeAdventure: 'Przygoda / Kampania',
      badgeSupplement: 'Suplement / Lorebook',
      statsPages: `${values?.count ?? 0} str.`,
      statsScenarios: `${values?.count ?? 0} scen.`,
      statsNpcs: `${values?.count ?? 0} NPC`,
      statsSpells: `${values?.count ?? 0} czarów`,
      statsCreatures: `${values?.count ?? 0} bestii`,
      statusCurrent: 'Aktualny stan bazy:',
      sourcesTitle: 'Gdzie legalnie zdobyć podręcznik?',
      sourcesDesc: 'Pobierz darmowy starter lub kup pełne wydanie:',
      disclaimer: 'Niezależny silnik emulatora śledztwa d100.',
    };
    return messages[key] || key;
  },
}));

jest.mock('@/lib/custom-adventures-storage', () => ({
  loadCustomAdventures: jest.fn(),
  saveCustomAdventures: jest.fn().mockResolvedValue(undefined),
}));

const mockLoadCustomAdventures = jest.mocked(loadCustomAdventures);
const mockSaveCustomAdventures = jest.mocked(saveCustomAdventures);

describe('RulebookModal - dwukolumnowe centrum podręczników i dodatków PDF', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadCustomAdventures.mockResolvedValue({
      adventures: [],
      activeId: null,
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        recordCount: 0,
        capabilities: {
          installedOverlays: [],
          flags: {
            hasBaseRules: false,
            hasRulebookExpansion: false,
            hasChaseRules: false,
            hasMagicSystem: false,
            hasPulpTalents: false,
            hasSanityRules: false,
            hasCombatRules: false,
          },
          counts: {
            totalNpcs: 0,
            totalCreatures: 0,
            totalSpells: 0,
            totalHandouts: 0,
            totalAdventures: 0,
          },
          lastUpdated: new Date().toISOString(),
        },
      }),
    });
  });

  it('renderuje układ dwukolumnowy (Wymagane Zasady vs Opcjonalne Przygody/Suplementy) w rozmiarze 85vw x 85vh', async () => {
    render(
      <RulebookModal
        open={true}
        onOpenChange={() => {}}
        gated={true}
        rulesCount={0}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.className).toContain('w-[85vw]');
    expect(dialog.className).toContain('h-[85vh]');

    expect(screen.getByTestId('rules-column')).toBeInTheDocument();
    expect(screen.getByTestId('optional-column')).toBeInTheDocument();
    expect(screen.queryByTestId('continue-to-game-btn')).not.toBeInTheDocument();
    expect(screen.getByTestId('locked-continue-hint')).toBeInTheDocument();
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('Q1 Smart Auto-Routing: wrzucenie przygody do lewej kolumny przenosi ją do prawej kolumny, pokazuje komunikat i zapisuje scenariusze do Manual Setup', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          recordCount: 0,
          capabilities: {
            installedOverlays: [],
            flags: { hasBaseRules: false, hasRulebookExpansion: false },
            counts: {},
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          indexed: 45,
          totalChunks: 45,
          namespace: 'adventures/custom-tatry',
          actualColumn: 'optional',
          requestedColumn: 'rules',
          autoRouted: true,
          routingKind: 'moved_to_optional',
          rulebookProfile: {
            profile: 'scenario_anthology',
            title: 'Cienie Tatr',
          },
          adventures: [
            {
              id: 'custom-tatry-1',
              title: 'Cienie Tatr: Na Grani',
              fileName: 'cienie_tatr.pdf',
            },
          ],
          capabilities: {
            installedOverlays: [
              {
                id: 'overlay-cienie-tatr',
                title: 'Cienie Tatr',
                fileName: 'cienie_tatr.pdf',
                profile: 'scenario_anthology',
                column: 'optional',
                pageCount: 45,
                adventureIds: ['custom-tatry-1'],
                installedAt: new Date().toISOString(),
                tags: ['FABULA', 'NPC'],
                overlayPath: '/tmp/overlay-cienie-tatr.json',
                stats: {
                  npcCount: 4,
                  creatureCount: 1,
                  spellCount: 0,
                  ruleCount: 0,
                  handoutCount: 2,
                  adventureCount: 1,
                },
              },
            ],
            flags: {
              hasBaseRules: false,
              hasRulebookExpansion: false,
              hasChaseRules: false,
              hasMagicSystem: false,
              hasPulpTalents: false,
              hasSanityRules: false,
              hasCombatRules: false,
            },
            counts: {
              totalNpcs: 4,
              totalCreatures: 1,
              totalSpells: 0,
              totalHandouts: 2,
              totalAdventures: 1,
            },
            lastUpdated: new Date().toISOString(),
          },
        }),
      });

    render(
      <RulebookModal
        open={true}
        onOpenChange={() => {}}
        gated={true}
        rulesCount={0}
      />
    );

    const rulesDropzone = screen.getByTestId('upload-rules-dropzone');
    const file = new File(['%PDF-1.4 dummy'], 'cienie_tatr.pdf', {
      type: 'application/pdf',
    });

    fireEvent.drop(rulesDropzone, {
      dataTransfer: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByTestId('auto-routing-banner')).toBeInTheDocument();
    });

    expect(
      screen.getByTestId('installed-overlay-overlay-cienie-tatr')
    ).toBeInTheDocument();
    expect(mockSaveCustomAdventures).toHaveBeenCalledWith(
      expect.objectContaining({
        adventures: expect.arrayContaining([
          expect.objectContaining({
            id: 'custom-tatry-1',
            title: 'Cienie Tatr: Na Grani',
          }),
        ]),
      })
    );
    // Przycisk przejścia do gry nadal zablokowany, bo brakuje podręcznika zasad bazowych
    expect(screen.queryByTestId('continue-to-game-btn')).not.toBeInTheDocument();
  });

  it('Q2 Pulp Cthulhu requirement: sam Pulp Cthulhu pokazuje ostrzeżenie i nie odblokowuje gry, dopóki gracz nie dogra Startera lub Księgi Strażnika', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        recordCount: 110,
        capabilities: {
          installedOverlays: [
            {
              id: 'overlay-pulp-d100',
              title: 'Pulp d100: Księga Zasad',
              fileName: 'pulp_cthulhu.pdf',
              profile: 'pulp-d100',
              column: 'rules',
              pageCount: 110,
              installedAt: new Date().toISOString(),
              tags: ['MECHANIKA'],
              overlayPath: '/tmp/overlay-pulp.json',
              stats: {
                npcCount: 0,
                creatureCount: 0,
                spellCount: 0,
                ruleCount: 12,
                handoutCount: 0,
                adventureCount: 0,
              },
            },
          ],
          flags: {
            hasBaseRules: false,
            hasRulebookExpansion: true,
            hasChaseRules: false,
            hasMagicSystem: false,
            hasPulpTalents: true,
            hasSanityRules: false,
            hasCombatRules: true,
          },
          counts: {
            totalNpcs: 0,
            totalCreatures: 0,
            totalSpells: 0,
            totalHandouts: 0,
            totalAdventures: 0,
          },
          lastUpdated: new Date().toISOString(),
        },
      }),
    });

    render(
      <RulebookModal
        open={true}
        onOpenChange={() => {}}
        gated={true}
        rulesCount={110}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByTestId('pulp-requires-core-banner')
      ).toBeInTheDocument();
    });
    expect(
      screen.getByTestId('rules-status-expansion-only')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('continue-to-game-btn')).not.toBeInTheDocument();
  });

  it('Q3 Cascading Delete: kliknięcie Usuń przy wgranym pliku usuwa nakładkę i kaskadowo czyści przygody z Manual Setup', async () => {
    mockLoadCustomAdventures.mockResolvedValue({
      adventures: [
        {
          id: 'custom-starter-adv',
          title: 'Nawiedzony dom',
          fileName: 'starter.pdf',
        } as never,
      ],
      activeId: 'custom-starter-adv',
    });

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          recordCount: 32,
          capabilities: {
            installedOverlays: [
              {
                id: 'overlay-starter-d100',
                title: 'Zasady Skrócone d100',
                fileName: 'starter.pdf',
                profile: 'starter-d100',
                column: 'rules',
                pageCount: 32,
                adventureIds: ['custom-starter-adv'],
                installedAt: new Date().toISOString(),
                tags: ['MECHANIKA', 'FABULA'],
                overlayPath: '/tmp/overlay-starter.json',
                stats: {
                  npcCount: 2,
                  creatureCount: 1,
                  spellCount: 0,
                  ruleCount: 5,
                  handoutCount: 1,
                  adventureCount: 1,
                },
              },
            ],
            flags: {
              hasBaseRules: true,
              hasRulebookExpansion: false,
              hasChaseRules: false,
              hasMagicSystem: false,
              hasPulpTalents: false,
              hasSanityRules: true,
              hasCombatRules: true,
            },
            counts: {
              totalNpcs: 2,
              totalCreatures: 1,
              totalSpells: 0,
              totalHandouts: 1,
              totalAdventures: 1,
            },
            lastUpdated: new Date().toISOString(),
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          deletedAdventureIds: ['custom-starter-adv'],
          deletedFileName: 'starter.pdf',
          recordCount: 0,
          capabilities: {
            installedOverlays: [],
            flags: {
              hasBaseRules: false,
              hasRulebookExpansion: false,
              hasChaseRules: false,
              hasMagicSystem: false,
              hasPulpTalents: false,
              hasSanityRules: false,
              hasCombatRules: false,
            },
            counts: {
              totalNpcs: 0,
              totalCreatures: 0,
              totalSpells: 0,
              totalHandouts: 0,
              totalAdventures: 0,
            },
            lastUpdated: new Date().toISOString(),
          },
        }),
      });

    render(
      <RulebookModal
        open={true}
        onOpenChange={() => {}}
        gated={true}
        rulesCount={32}
      />
    );

    const deleteBtn = await screen.findByTestId(
      'delete-overlay-overlay-starter-d100'
    );
    expect(screen.getByTestId('continue-to-game-btn')).toBeInTheDocument();

    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(mockSaveCustomAdventures).toHaveBeenCalledWith({
        adventures: [],
        activeId: null,
      });
    });

    expect(
      screen.queryByTestId('installed-overlay-overlay-starter-d100')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('continue-to-game-btn')).not.toBeInTheDocument();
  });

  it('zachowuje komunikat auto-routingu podczas wgrywania wielu plików naraz i nie zlicza kompendiów jako scenariuszy', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          recordCount: 0,
          capabilities: {
            installedOverlays: [],
            flags: { hasBaseRules: false, hasRulebookExpansion: false },
            counts: {},
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          indexed: 120,
          totalChunks: 120,
          namespace: 'adventures/custom-malleus',
          actualColumn: 'optional',
          requestedColumn: 'rules',
          autoRouted: true,
          routingKind: 'moved_to_optional',
          rulebookProfile: {
            profile: 'bestiary',
            title: 'Malleus Monstrorum',
          },
          adventures: [
            {
              id: 'custom-malleus',
              title: 'Malleus Monstrorum',
              fileName: 'malleus.pdf',
              documentType: 'compendium',
            },
          ],
          capabilities: {
            installedOverlays: [
              {
                id: 'overlay-malleus',
                title: 'Malleus Monstrorum',
                fileName: 'malleus.pdf',
                profile: 'bestiary',
                column: 'optional',
                pageCount: 120,
                adventureIds: ['custom-malleus'],
                installedAt: new Date().toISOString(),
                tags: ['BESTIARIUSZ'],
                overlayPath: '/tmp/overlay-malleus.json',
                stats: {
                  npcCount: 0,
                  creatureCount: 30,
                  spellCount: 0,
                  ruleCount: 0,
                  handoutCount: 0,
                  adventureCount: 0,
                },
              },
            ],
            flags: { hasBaseRules: false, hasRulebookExpansion: false },
            counts: { totalCreatures: 30, totalAdventures: 0 },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          indexed: 400,
          totalChunks: 400,
          namespace: 'rules',
          actualColumn: 'rules',
          requestedColumn: 'rules',
          autoRouted: false,
          routingKind: 'none',
          rulebookProfile: {
            profile: 'core-d100',
            title: 'Księga Zasad Głównych d100',
          },
          adventures: [],
          capabilities: {
            installedOverlays: [
              {
                id: 'overlay-malleus',
                title: 'Malleus Monstrorum',
                fileName: 'malleus.pdf',
                profile: 'bestiary',
                column: 'optional',
                pageCount: 120,
                installedAt: new Date().toISOString(),
                tags: ['BESTIARIUSZ'],
                overlayPath: '/tmp/overlay-malleus.json',
                stats: {
                  npcCount: 0,
                  creatureCount: 30,
                  spellCount: 0,
                  ruleCount: 0,
                  handoutCount: 0,
                  adventureCount: 0,
                },
              },
              {
                id: 'overlay-core',
                title: 'Księga Zasad Głównych d100',
                fileName: 'keeper.pdf',
                profile: 'core-d100',
                column: 'rules',
                pageCount: 400,
                installedAt: new Date().toISOString(),
                tags: ['MECHANIKA'],
                overlayPath: '/tmp/overlay-core.json',
                stats: {
                  npcCount: 0,
                  creatureCount: 10,
                  spellCount: 10,
                  ruleCount: 25,
                  handoutCount: 0,
                  adventureCount: 0,
                },
              },
            ],
            flags: { hasBaseRules: true, hasRulebookExpansion: false },
            counts: { totalCreatures: 40, totalAdventures: 0 },
          },
        }),
      });

    render(
      <RulebookModal
        open={true}
        onOpenChange={() => {}}
        gated={true}
        rulesCount={0}
      />
    );

    const rulesDropzone = screen.getByTestId('upload-rules-dropzone');
    const file1 = new File(['%PDF-1.4 malleus'], 'malleus.pdf', {
      type: 'application/pdf',
    });
    const file2 = new File(['%PDF-1.4 keeper'], 'keeper.pdf', {
      type: 'application/pdf',
    });

    fireEvent.drop(rulesDropzone, {
      dataTransfer: { files: [file1, file2] },
    });

    await waitFor(() => {
      expect(screen.getByTestId('continue-to-game-btn')).toBeInTheDocument();
    });

    const banner = screen.getByTestId('auto-routing-banner');
    expect(banner).toBeInTheDocument();
    expect(banner.textContent).toContain('(0 scen.)');
  });
});
