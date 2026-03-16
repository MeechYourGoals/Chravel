import { useEffect } from 'react';
import { toast } from 'sonner';

/**
 * Listens for the `sw:updateavailable` custom event dispatched by serviceWorkerRegistration.ts
 * when a new service worker installs and is waiting. Shows a persistent toast prompting the user
 * to reload and pick up the new version.
 */
export const useSwUpdate = (): void => {
  useEffect(() => {
    const handleUpdate = () => {
      toast('A new version of Chravel is ready.', {
        description: 'Reload to get the latest updates.',
        duration: Infinity,
        action: {
          label: 'Update now',
          onClick: () => window.location.reload(),
        },
      });
    };

    window.addEventListener('sw:updateavailable', handleUpdate);
    return () => window.removeEventListener('sw:updateavailable', handleUpdate);
  }, []);
};
