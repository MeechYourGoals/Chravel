import React, { useCallback, useEffect, useState } from 'react';

interface EmojiSelection {
  native?: string;
}

interface EmojiMartPickerProps {
  onEmojiSelect: (emoji: EmojiSelection) => void;
  className?: string;
}

type EmojiMartPickerComponentType = React.ComponentType<{
  data: unknown;
  onEmojiSelect: (emoji: EmojiSelection) => void;
  theme?: 'dark' | 'light' | 'auto';
  previewPosition?: 'none';
  skinTonePosition?: 'none';
  autoFocus?: boolean;
}>;

export const EmojiMartPicker: React.FC<EmojiMartPickerProps> = ({ onEmojiSelect, className }) => {
  const [emojiPickerData, setEmojiPickerData] = useState<unknown>(null);
  const [EmojiPickerComponent, setEmojiPickerComponent] =
    useState<EmojiMartPickerComponentType | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const [pickerModule, dataModule] = await Promise.all([
        import('@emoji-mart/react'),
        import('@emoji-mart/data'),
      ]);

      if (!mounted) return;

      const picker =
        (
          pickerModule as {
            default?: EmojiMartPickerComponentType;
            Picker?: EmojiMartPickerComponentType;
          }
        ).default ||
        (pickerModule as { Picker?: EmojiMartPickerComponentType }).Picker ||
        null;

      setEmojiPickerData(dataModule.default);
      setEmojiPickerComponent(() => picker);
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSelect = useCallback(
    (emoji: EmojiSelection) => {
      onEmojiSelect(emoji);
    },
    [onEmojiSelect],
  );

  if (!EmojiPickerComponent || !emojiPickerData) {
    return (
      <div
        className={
          className ??
          'w-72 h-40 flex items-center justify-center bg-neutral-900 rounded-xl text-neutral-400 text-sm'
        }
      >
        Loading emojis…
      </div>
    );
  }

  return (
    <EmojiPickerComponent
      data={emojiPickerData}
      onEmojiSelect={handleSelect}
      theme="dark"
      previewPosition="none"
      skinTonePosition="none"
      autoFocus
    />
  );
};
