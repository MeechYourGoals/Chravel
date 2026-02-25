import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TableMetric {
  table_name: string;
  row_count: number;
}

export interface StorageMetric {
  bucket: string;
  file_count: number;
  total_size_mb: number;
}

const TRACKED_TABLES = [
  'trips',
  'trip_members',
  'trip_chat_messages',
  'trip_events',
  'trip_media_index',
  'trip_files',
  'trip_tasks',
  'trip_polls',
  'trip_payment_messages',
  'payment_splits',
  'profiles',
  'organizations',
  'organization_members',
  'broadcasts',
  'notifications',
  'kb_documents',
  'kb_chunks',
];

export const useDatabaseMetrics = () => {
  // Fetch table metrics (row counts)
  const { data: tableMetrics, isLoading: tablesLoading } = useQuery({
    queryKey: ['databaseMetrics', 'tables'],
    queryFn: async (): Promise<TableMetric[]> => {
      const metrics: TableMetric[] = [];

      for (const tableName of TRACKED_TABLES) {
        try {
          const { count, error } = await supabase
            .from(tableName as any)
            .select('*', { count: 'exact', head: true });

          if (!error && count !== null) {
            metrics.push({
              table_name: tableName,
              row_count: count,
            });
          }
        } catch (err) {
          console.warn(`Could not fetch count for ${tableName}:`, err);
        }
      }

      return metrics;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch storage metrics
  const { data: storageMetrics, isLoading: storageLoading } = useQuery({
    queryKey: ['databaseMetrics', 'storage'],
    queryFn: async (): Promise<StorageMetric[]> => {
      // Get file counts from trip_media_index
      const { data: mediaData } = await supabase.from('trip_media_index').select('file_size');

      const totalSize = mediaData?.reduce((sum, item) => sum + (item.file_size || 0), 0) || 0;

      return [
        {
          bucket: 'trip-media',
          file_count: mediaData?.length || 0,
          total_size_mb: totalSize / (1024 * 1024),
        },
      ];
    },
    refetchInterval: 60000,
  });

  // Estimate database size based on row counts (rough estimate)
  const totalRowCount = tableMetrics?.reduce((sum, table) => sum + table.row_count, 0) || 0;
  const estimatedDbSize = totalRowCount * 2000; // Rough estimate: 2KB per row average

  return {
    tableMetrics: tableMetrics || [],
    storageMetrics: storageMetrics || [],
    totalDbSize: estimatedDbSize,
    totalRowCount,
    isLoading: tablesLoading || storageLoading,
  };
};
