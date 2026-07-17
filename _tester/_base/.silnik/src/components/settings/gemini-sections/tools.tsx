'use client';

import { useState } from 'react';
import { HelpIcon } from '../../ui/tooltip';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../../ui/accordion';
import { GEMINI_HELP } from '../gemini-settings-help';
import type { GeminiSectionProps } from './types';

/**
 * Sekcja Tools (Function Calling) - eksperymentalne.
 * Pola tools/toolConfig są przepuszczane do Gemini API, ale aplikacja jeszcze nie konsumuje wywołań funkcji w narracji.
 */
export function ToolsSection({ g, updateGemini }: GeminiSectionProps) {
  // tools (JSON array)
  const [toolsRaw, setToolsRaw] = useState<string>(
    g.tools ? JSON.stringify(g.tools, null, 2) : ''
  );
  const [toolsError, setToolsError] = useState<string | null>(null);
  const commitTools = () => {
    if (!toolsRaw.trim()) {
      updateGemini({ tools: undefined });
      setToolsError(null);
      return;
    }
    try {
      const parsed: unknown = JSON.parse(toolsRaw);
      if (!Array.isArray(parsed)) {
        setToolsError('tools musi być tablicą deklaracji funkcji');
        return;
      }
      updateGemini({ tools: parsed as object[] });
      setToolsError(null);
    } catch (err) {
      setToolsError(err instanceof Error ? err.message : 'Niepoprawny JSON');
    }
  };

  // toolConfig (JSON object)
  const [toolConfigRaw, setToolConfigRaw] = useState<string>(
    g.toolConfig ? JSON.stringify(g.toolConfig, null, 2) : ''
  );
  const [toolConfigError, setToolConfigError] = useState<string | null>(null);
  const commitToolConfig = () => {
    if (!toolConfigRaw.trim()) {
      updateGemini({ toolConfig: undefined });
      setToolConfigError(null);
      return;
    }
    try {
      const parsed: unknown = JSON.parse(toolConfigRaw);
      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        setToolConfigError('toolConfig musi być obiektem');
        return;
      }
      updateGemini({ toolConfig: parsed as object });
      setToolConfigError(null);
    } catch (err) {
      setToolConfigError(
        err instanceof Error ? err.message : 'Niepoprawny JSON'
      );
    }
  };

  return (
    <AccordionItem value="tools">
      <AccordionTrigger>
        <span className="flex items-center gap-2">
          <span className="font-display uppercase tracking-[0.16em] text-brass text-sm">
            🔧 Eksperymentalne (Tools)
          </span>
          <span className="text-xs text-muted-foreground font-special-elite uppercase tracking-[0.1em]">
            {g.tools && Array.isArray(g.tools) && g.tools.length > 0
              ? `${g.tools.length} fn`
              : '○ brak'}
            {' · 🚧 power-user'}
          </span>
        </span>
      </AccordionTrigger>
      <AccordionContent>
        <div className="border-l-2 border-brass/50 bg-brass/[0.06] p-3 mb-4">
          <p className="text-sm text-muted-foreground font-serif italic">
            🚧{' '}
            <strong className="text-brass not-italic">
              Function Calling - feature eksperymentalny.
            </strong>{' '}
            Pola <code>tools</code> i <code>toolConfig</code> są przepuszczane
            do Gemini API, ale aplikacja jeszcze nie konsumuje wywołań funkcji w
            narracji RPG (planowane). Power-user testing OK; produkcja - czekaj.
          </p>
        </div>

        <div className="space-y-4">
          {/* tools */}
          <div>
            <label className="flex items-center gap-2 text-xs font-special-elite uppercase tracking-[0.1em] text-muted-foreground mb-2">
              {GEMINI_HELP.tools.label}
              <HelpIcon
                content={`${GEMINI_HELP.tools.desc} ${GEMINI_HELP.tools.example ?? ''}`}
              />
            </label>
            <textarea
              value={toolsRaw}
              onChange={(e) => setToolsRaw(e.target.value)}
              onBlur={commitTools}
              placeholder='[{"name":"roll_dice","parameters":{"type":"object","properties":{"sides":{"type":"number"}}}}]'
              rows={6}
              className={`w-full px-3 py-2 bg-[#1f1a14] border rounded text-foreground focus:border-primary focus:outline-none font-mono text-xs ${
                toolsError ? 'border-destructive' : 'border-brass/30'
              }`}
            />
            {toolsError && (
              <p className="text-xs text-destructive font-special-elite mt-1">
                ⚠️ Błąd: {toolsError}
              </p>
            )}
            <p className="text-sm text-muted-foreground font-serif italic mt-1">
              JSON tablica deklaracji funkcji. Parsowane onBlur. Walidacja
              kształtu w providerze.
            </p>
          </div>

          {/* toolConfig */}
          <div>
            <label className="flex items-center gap-2 text-xs font-special-elite uppercase tracking-[0.1em] text-muted-foreground mb-2">
              {GEMINI_HELP.toolConfig.label}
              <HelpIcon
                content={`${GEMINI_HELP.toolConfig.desc} ${GEMINI_HELP.toolConfig.example ?? ''}`}
              />
            </label>
            <textarea
              value={toolConfigRaw}
              onChange={(e) => setToolConfigRaw(e.target.value)}
              onBlur={commitToolConfig}
              placeholder='{"function_calling_config":{"mode":"AUTO"}}'
              rows={4}
              className={`w-full px-3 py-2 bg-[#1f1a14] border rounded text-foreground focus:border-primary focus:outline-none font-mono text-xs ${
                toolConfigError ? 'border-destructive' : 'border-brass/30'
              }`}
            />
            {toolConfigError && (
              <p className="text-xs text-destructive font-special-elite mt-1">
                ⚠️ Błąd: {toolConfigError}
              </p>
            )}
            <p className="text-sm text-muted-foreground font-serif italic mt-1">
              Tryby: <code>AUTO</code> · <code>NONE</code> · <code>ANY</code>{' '}
              (wymuś) · <code>MODE_UNSPECIFIED</code>.
            </p>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
