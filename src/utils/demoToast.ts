import { toast } from 'sonner';

/**
 * Show a toast with "(demo mode)" suffix when in demo mode
 */
export const showDemoToast = (
  message: string,
  isDemoMode: boolean,
  type: 'success' | 'error' | 'info' = 'success',
) => {
  const suffix = isDemoMode ? ' (demo mode)' : '';
  const fullMessage = `${message}${suffix}`;

  switch (type) {
    case 'success':
      toast.success(fullMessage);
      break;
    case 'error':
      toast.error(fullMessage);
      break;
    case 'info':
      toast.info(fullMessage);
      break;
    default:
      toast(fullMessage);
  }
};
