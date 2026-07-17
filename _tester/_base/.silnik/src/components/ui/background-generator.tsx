'use client';

import { useState } from 'react';
import { Button } from './button';
import {
  backgroundGenerator,
  BackgroundQuestion,
  BackgroundChoice,
  BackgroundGenerationResult,
} from '@/lib/background-generator';

interface BackgroundGeneratorProps {
  occupation: string;
  onBackgroundGenerated: (result: BackgroundGenerationResult) => void;
  onClose: () => void;
}

export function BackgroundGeneratorModal({
  occupation,
  onBackgroundGenerated,
  onClose,
}: BackgroundGeneratorProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [choices, setChoices] = useState<BackgroundChoice[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<BackgroundGenerationResult | null>(null);

  const questions = backgroundGenerator.getQuestionsForOccupation(occupation);
  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // Handle option selection
  const handleOptionSelect = async (optionId: string) => {
    if (!currentQuestion) return;

    const selectedOption = currentQuestion.options.find(
      (opt) => opt.id === optionId
    );
    if (!selectedOption) return;

    const newChoice: BackgroundChoice = {
      questionId: currentQuestion.id,
      optionId: optionId,
      option: selectedOption,
    };

    const updatedChoices = [...choices, newChoice];
    setChoices(updatedChoices);

    if (isLastQuestion) {
      // Generate final background
      setIsGenerating(true);
      try {
        const backgroundResult = await backgroundGenerator.generateBackground(
          occupation,
          updatedChoices
        );
        setResult(backgroundResult);
      } catch (error) {
        console.error('Error generating background:', error);
      } finally {
        setIsGenerating(false);
      }
    } else {
      // Move to next question
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  // Go back to previous question
  const handleGoBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setChoices(choices.slice(0, -1));
    }
  };

  // Apply generated background
  const handleApplyBackground = () => {
    if (result) {
      onBackgroundGenerated(result);
      onClose();
    }
  };

  if (questions.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-card border border-border rounded-lg p-6 w-full max-w-2xl mx-4">
          <h2 className="text-xl font-bold text-foreground mb-4">
            Generator Tła Postaci
          </h2>
          <p className="text-muted-foreground mb-4">
            Brak dostępnych pytań dla zawodu: {occupation}
          </p>
          <Button onClick={onClose} className="w-full">
            Zamknij
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-6 w-[90vw] max-w-[1440px] mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Generator Tła Postaci: {occupation}
            </h2>
            <p className="text-sm text-muted-foreground">
              Pytanie {currentQuestionIndex + 1} z {questions.length}
            </p>
          </div>
          <Button onClick={onClose} variant="outline" size="sm">
            ✕
          </Button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-2 mb-6">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((currentQuestionIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>

        {!result ? (
          <>
            {/* Current Question */}
            {currentQuestion && (
              <div className="space-y-6">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {currentQuestion.question}
                  </h3>
                  {currentQuestion.context && (
                    <div className="bg-blue-900/20 border border-blue-600/30 p-3 rounded mb-4">
                      <p className="text-sm text-blue-200">
                        📚 <strong>Kontekst historyczny:</strong>{' '}
                        {currentQuestion.context}
                      </p>
                    </div>
                  )}
                </div>

                {/* Options */}
                <div className="space-y-4">
                  {currentQuestion.options.map((option) => (
                    <div
                      key={option.id}
                      className="bg-muted/30 border border-border hover:border-primary/50 rounded-lg p-4 cursor-pointer transition-all duration-200 hover:bg-muted/50"
                      onClick={() => handleOptionSelect(option.id)}
                    >
                      <h4 className="font-semibold text-foreground mb-2">
                        {option.text}
                      </h4>
                      <p className="text-sm text-muted-foreground mb-3">
                        {option.description}
                      </p>

                      {/* Consequences */}
                      {option.consequences.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-yellow-400 mb-1">
                            Konsekwencje:
                          </p>
                          <ul className="text-xs text-yellow-300 list-disc list-inside">
                            {option.consequences.map((consequence, index) => (
                              <li key={index}>{consequence}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Skill modifiers */}
                      {Object.keys(option.skillModifiers).length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs font-semibold text-green-400 mb-1">
                            Wpływ na umiejętności:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(option.skillModifiers).map(
                              ([skill, modifier]) => (
                                <span
                                  key={skill}
                                  className={`text-xs px-2 py-1 rounded ${
                                    modifier > 0
                                      ? 'bg-green-900/30 text-green-300 border border-green-600/30'
                                      : 'bg-red-900/30 text-red-300 border border-red-600/30'
                                  }`}
                                >
                                  {skill}: {modifier > 0 ? '+' : ''}
                                  {modifier}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {/* Equipment and connections */}
                      {(option.equipmentGained || option.connectionGained) && (
                        <div className="space-y-2">
                          {option.equipmentGained && (
                            <div>
                              <p className="text-xs font-semibold text-purple-400 mb-1">
                                Ekwipunek:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {option.equipmentGained.map((item, index) => (
                                  <span
                                    key={index}
                                    className="text-xs bg-purple-900/30 text-purple-300 px-2 py-1 rounded"
                                  >
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {option.connectionGained && (
                            <div>
                              <p className="text-xs font-semibold text-blue-400 mb-1">
                                Kontakty:
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {option.connectionGained.map(
                                  (connection, index) => (
                                    <span
                                      key={index}
                                      className="text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded"
                                    >
                                      {connection}
                                    </span>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Navigation */}
                <div className="flex justify-between pt-4">
                  <Button
                    onClick={handleGoBack}
                    disabled={currentQuestionIndex === 0}
                    variant="outline"
                  >
                    ← Poprzednie
                  </Button>
                  <Button onClick={onClose} variant="outline">
                    Anuluj
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Results */
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-foreground mb-2">
                🎭 Tło Postaci Wygenerowane!
              </h3>
              <p className="text-sm text-muted-foreground">
                Oto historia twojej postaci oparta na dokonanych wyborach
              </p>
            </div>
            {/* Background Story */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold text-foreground mb-3">
                📖 Historia Postaci:
              </h4>
              <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {result.backgroundStory}
              </div>
            </div>
            {/* Skill Modifiers */}
            {Object.keys(result.skillModifiers).length > 0 && (
              <div className="bg-green-900/20 border border-green-600/30 p-4 rounded-lg">
                <h4 className="font-semibold text-green-300 mb-3">
                  🎯 Modyfikatory Umiejętności:
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(result.skillModifiers).map(
                    ([skill, modifier]) => (
                      <div key={skill} className="flex justify-between text-sm">
                        <span className="text-green-200">{skill}:</span>
                        <span className="text-green-300 font-mono">
                          {modifier > 0 ? '+' : ''}
                          {modifier}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )}
            {/* Equipment */}
            {result.equipment.length > 0 && (
              <div className="bg-purple-900/20 border border-purple-600/30 p-4 rounded-lg">
                <h4 className="font-semibold text-purple-300 mb-3">
                  🎒 Ekwipunek:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.equipment.map((item, index) => (
                    <span
                      key={index}
                      className="text-sm bg-purple-800/40 text-purple-200 px-3 py-1 rounded"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {/* Connections */}
            {result.connections.length > 0 && (
              <div className="bg-blue-900/20 border border-blue-600/30 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-300 mb-3">
                  🤝 Kontakty:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.connections.map((connection, index) => (
                    <span
                      key={index}
                      className="text-sm bg-blue-800/40 text-blue-200 px-3 py-1 rounded"
                    >
                      {connection}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {/* Personality Traits */}
            {result.personalityTraits.length > 0 && (
              <div className="bg-yellow-900/20 border border-yellow-600/30 p-4 rounded-lg">
                <h4 className="font-semibold text-yellow-300 mb-3">
                  🎭 Cechy Charakteru:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {result.personalityTraits.map((trait, index) => (
                    <span
                      key={index}
                      className="text-sm bg-yellow-800/40 text-yellow-200 px-3 py-1 rounded"
                    >
                      {trait}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleApplyBackground}
                className="flex-1 bg-primary hover:bg-primary/90"
              >
                ✨ Zastosuj Tło Postaci
              </Button>
              <Button
                onClick={() => {
                  setResult(null);
                  setCurrentQuestionIndex(0);
                  setChoices([]);
                }}
                variant="outline"
              >
                🔄 Spróbuj Ponownie
              </Button>
              <Button onClick={onClose} variant="outline">
                Anuluj
              </Button>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-10">
            <div className="bg-card p-6 rounded-lg text-center">
              <div className="animate-spin text-4xl mb-4">🎭</div>
              <p className="text-foreground">Generowanie tła postaci...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
