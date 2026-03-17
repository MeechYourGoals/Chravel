import { cn } from '@/lib/utils';

export const MENTION_REGEX = /(@\w+(?:\s\w+)?)/g;

export const getMentionClassName = ({
  isOwnMessage,
  isBroadcast,
}: {
  isOwnMessage: boolean;
  isBroadcast?: boolean;
}) =>
  cn(
    'font-semibold px-1 rounded inline-block break-words',
    isOwnMessage || isBroadcast ? 'text-white bg-white/20' : 'text-sky-300 bg-sky-500/20',
  );
