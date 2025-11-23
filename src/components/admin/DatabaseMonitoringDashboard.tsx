import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useDatabaseMetrics } from '@/hooks/useDatabaseMetrics';
import { Database, HardDrive, Table, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};

export const DatabaseMonitoringDashboard = () => {
  const { tableMetrics, storageMetrics, totalDbSize, totalRowCount, isLoading } = useDatabaseMetrics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Calculate percentages (assuming 8GB free tier limit)
  const dbLimitBytes = 8 * 1024 * 1024 * 1024;
  const dbUsagePercent = (totalDbSize / dbLimitBytes) * 100;

  const totalStorageSize = storageMetrics.reduce((sum, s) => sum + s.total_size_mb, 0);
  const storageLimitMB = 1024; // 1GB free tier
  const storageUsagePercent = (totalStorageSize / storageLimitMB) * 100;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Database className="h-6 w-6 text-primary" />
        <h1 className="text-3xl font-bold">Database Monitoring</h1>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database Size</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(totalDbSize)}</div>
            <Progress value={dbUsagePercent} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {dbUsagePercent.toFixed(1)}% of 8GB limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Storage Size</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStorageSize.toFixed(2)} MB</div>
            <Progress value={storageUsagePercent} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {storageUsagePercent.toFixed(1)}% of {storageLimitMB}MB limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tables</CardTitle>
            <Table className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tableMetrics.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active database tables</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Media Files</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {storageMetrics.reduce((sum, s) => sum + s.file_count, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Uploaded media items</p>
          </CardContent>
        </Card>
      </div>

      {/* Table Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Table Storage Breakdown</CardTitle>
          <CardDescription>Size and row count by table</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tableMetrics
              .sort((a, b) => b.row_count - a.row_count)
              .slice(0, 15)
              .map((table) => {
                const estimatedSize = (table.row_count * 2000) / (1024 * 1024); // MB
                return (
                  <div key={table.table_name} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{table.table_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {table.row_count.toLocaleString()} rows
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">~{estimatedSize.toFixed(2)} MB</div>
                      <div className="text-sm text-muted-foreground">
                        Estimated size
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </CardContent>
      </Card>

      {/* Storage Buckets */}
      <Card>
        <CardHeader>
          <CardTitle>Storage Buckets</CardTitle>
          <CardDescription>Media storage usage by bucket</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {storageMetrics.map((storage) => (
              <div key={storage.bucket} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium">{storage.bucket}</div>
                  <div className="text-sm text-muted-foreground">
                    {storage.file_count.toLocaleString()} files
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{storage.total_size_mb.toFixed(2)} MB</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
