import { useState, useCallback } from 'react';

export interface PollOption {
  id: string;
  text: string;
}

export interface PollFormData {
  question: string;
  options: PollOption[];
}

export interface CreatePollData {
  question: string;
  options: string[];
}

const generateOptionId = () => `option_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export const usePollManager = () => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<PollOption[]>([
    { id: generateOptionId(), text: '' },
    { id: generateOptionId(), text: '' },
  ]);

  const addOption = useCallback(() => {
    setOptions(prev => [...prev, { id: generateOptionId(), text: '' }]);
  }, []);

  const updateOption = useCallback((index: number, value: string) => {
    setOptions(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text: value };
      return updated;
    });
  }, []);

  const removeOption = useCallback((index: number) => {
    setOptions(prev => prev.filter((_, i) => i !== index));
  }, []);

  const validatePoll = useCallback((): { isValid: boolean; error?: string } => {
    if (!question.trim()) {
      return { isValid: false, error: 'Question is required' };
    }

    const validOptions = options.filter(opt => opt.text.trim());
    if (validOptions.length < 2) {
      return { isValid: false, error: 'At least 2 options are required' };
    }

    return { isValid: true };
  }, [question, options]);

  const getPollData = useCallback((): CreatePollData | null => {
    const validation = validatePoll();
    if (!validation.isValid) {
      return null;
    }

    return {
      question: question.trim(),
      options: options.filter(opt => opt.text.trim()).map(opt => opt.text.trim()),
    };
  }, [question, options, validatePoll]);

  const resetForm = useCallback(() => {
    setQuestion('');
    setOptions([
      { id: generateOptionId(), text: '' },
      { id: generateOptionId(), text: '' },
    ]);
  }, []);

  return {
    // State
    question,
    options,

    // Computed
    validOptions: options.filter(opt => opt.text.trim()),
    canAddOption: options.length < 10,
    canRemoveOption: options.length > 2,

    // Actions
    setQuestion,
    addOption,
    updateOption,
    removeOption,
    validatePoll,
    getPollData,
    resetForm,
  };
};
