import React, { useState } from 'react';
import { Plus, X, HelpCircle, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface CreatePollFormProps {
  onCreatePoll: (
    question: string,
    options: string[],
    settings: PollSettings,
  ) => Promise<void> | void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export interface PollSettings {
  allow_multiple: boolean;
  is_anonymous: boolean;
  allow_vote_change: boolean;
  deadline_at?: string;
}

export const CreatePollForm = ({
  onCreatePoll,
  onCancel,
  isSubmitting = false,
}: CreatePollFormProps) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [settings, setSettings] = useState<PollSettings>({
    allow_multiple: false,
    is_anonymous: false,
    allow_vote_change: true,
  });
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineTime, setDeadlineTime] = useState('');

  const handleAddOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleCreate = async () => {
    const validOptions = options.filter(opt => opt.trim() !== '');

    if (question.trim() && validOptions.length >= 2) {
      let deadline_at: string | undefined;
      if (deadlineDate) {
        const time = deadlineTime || '23:59';
        deadline_at = `${deadlineDate}T${time}:00`;
      }

      await onCreatePoll(question.trim(), validOptions, {
        ...settings,
        deadline_at,
      });

      // Reset form
      setQuestion('');
      setOptions(['', '']);
      setSettings({
        allow_multiple: false,
        is_anonymous: false,
        allow_vote_change: true,
      });
      setDeadlineDate('');
      setDeadlineTime('');
    }
  };

  const handleCancel = () => {
    setQuestion('');
    setOptions(['', '']);
    setSettings({
      allow_multiple: false,
      is_anonymous: false,
      allow_vote_change: true,
    });
    setDeadlineDate('');
    setDeadlineTime('');
    onCancel();
  };

  const isValid = question.trim() !== '' && options.filter(opt => opt.trim() !== '').length >= 2;

  return (
    <div className="bg-glass-slate-card border border-glass-slate-border rounded-2xl p-6 shadow-enterprise-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Create New Poll</h3>
        <button
          onClick={handleCancel}
          className="w-8 h-8 rounded-full bg-glass-slate-bg hover:bg-glass-slate-border flex items-center justify-center transition-colors"
        >
          <X size={16} className="text-gray-400" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Question */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2">Poll Question</label>
          <Input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="What would you like to ask the group?"
            className="w-full bg-glass-slate-bg border-glass-slate-border text-white placeholder-gray-500"
          />
        </div>

        {/* Options */}
        <div>
          <label className="block text-sm font-semibold text-white mb-2">Options</label>
          <div className="space-y-2">
            {options.map((option, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  type="text"
                  value={option}
                  onChange={e => handleOptionChange(index, e.target.value)}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1 bg-glass-slate-bg border-glass-slate-border text-white placeholder-gray-500"
                />
                {options.length > 2 && (
                  <button
                    onClick={() => handleRemoveOption(index)}
                    className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <button
                onClick={handleAddOption}
                className="w-full h-10 border-2 border-dashed border-glass-slate-border rounded-lg text-gray-400 hover:border-glass-enterprise-blue hover:text-glass-enterprise-blue transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} />
                Add Option
              </button>
            )}
          </div>
        </div>

        {/* Poll Settings */}
        <div className="space-y-3 p-4 bg-glass-slate-bg/30 rounded-xl border border-glass-slate-border/50">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Poll Settings
          </p>

          {/* Multiple Choice */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="multiple-choice" className="text-sm text-gray-300 cursor-pointer">
                Allow multiple selections
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle size={14} className="text-gray-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Voters can select more than one option</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch
              id="multiple-choice"
              checked={settings.allow_multiple}
              onCheckedChange={checked => setSettings({ ...settings, allow_multiple: checked })}
            />
          </div>

          {/* Anonymous Voting */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="anonymous" className="text-sm text-gray-300 cursor-pointer">
                Anonymous voting
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle size={14} className="text-gray-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Hide who voted for what</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch
              id="anonymous"
              checked={settings.is_anonymous}
              onCheckedChange={checked => setSettings({ ...settings, is_anonymous: checked })}
            />
          </div>

          {/* Allow Vote Changes */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label htmlFor="allow-changes" className="text-sm text-gray-300 cursor-pointer">
                Allow vote changes
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle size={14} className="text-gray-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Voters can change their vote after submitting</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch
              id="allow-changes"
              checked={settings.allow_vote_change}
              onCheckedChange={checked => setSettings({ ...settings, allow_vote_change: checked })}
            />
          </div>

          {/* Deadline */}
          <div className="pt-3 border-t border-glass-slate-border/50">
            <Label className="text-sm text-gray-300 mb-2 flex items-center gap-2">
              <Clock size={14} />
              Optional Deadline
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={deadlineDate}
                onChange={e => setDeadlineDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="flex-1 bg-glass-slate-bg border-glass-slate-border text-white text-sm h-9"
              />
              <Input
                type="time"
                value={deadlineTime}
                onChange={e => setDeadlineTime(e.target.value)}
                disabled={!deadlineDate}
                className="w-28 bg-glass-slate-bg border-glass-slate-border text-white text-sm h-9"
              />
            </div>
            {deadlineDate && (
              <button
                onClick={() => {
                  setDeadlineDate('');
                  setDeadlineTime('');
                }}
                className="text-xs text-red-400 hover:text-red-300 mt-1.5"
              >
                Clear deadline
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <Button
            onClick={handleCancel}
            variant="outline"
            className="flex-1 h-10 rounded-lg border-glass-slate-border text-gray-300 hover:text-white hover:bg-glass-slate-bg"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!isValid || isSubmitting}
            className="flex-1 h-10 rounded-lg bg-gradient-to-r from-glass-enterprise-blue to-glass-enterprise-blue-light hover:from-glass-enterprise-blue-light hover:to-glass-enterprise-blue font-semibold shadow-enterprise border border-glass-enterprise-blue/50 text-white"
          >
            {isSubmitting ? 'Creating...' : 'Create Poll'}
          </Button>
        </div>
      </div>
    </div>
  );
};
