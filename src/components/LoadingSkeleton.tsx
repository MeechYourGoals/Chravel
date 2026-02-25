import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

interface LoadingSkeletonProps {
  variant?: 'card' | 'list' | 'grid' | 'chat' | 'media';
  count?: number;
}

/**
 * Reusable loading skeleton component for consistent loading states
 *
 * Usage:
 * ```tsx
 * {isLoading ? <LoadingSkeleton variant="card" count={3} /> : <Content />}
 * ```
 */
export function LoadingSkeleton({ variant = 'card', count = 3 }: LoadingSkeletonProps) {
  const skeletons = Array.from({ length: count }, (_, i) => i);

  switch (variant) {
    case 'card':
      return (
        <div className="space-y-4">
          {skeletons.map(i => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      );

    case 'list':
      return (
        <div className="space-y-3">
          {skeletons.map(i => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      );

    case 'grid':
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skeletons.map(i => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-32 w-full mb-4" />
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      );

    case 'chat':
      return (
        <div className="space-y-4">
          {skeletons.map(i => (
            <div key={i} className={`flex gap-3 ${i % 2 === 0 ? '' : 'flex-row-reverse'}`}>
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2 max-w-[70%]">
                <Skeleton className="h-16 w-full rounded-lg" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      );

    case 'media':
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {skeletons.map(i => (
            <Skeleton key={i} className="aspect-square w-full" />
          ))}
        </div>
      );

    default:
      return null;
  }
}
