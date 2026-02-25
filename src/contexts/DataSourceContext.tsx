import React, { createContext, useContext, useMemo, useState, ReactNode } from 'react';

export type DataSource = 'demo' | 'live';

interface DataSourceContextValue {
  source: DataSource;
  setSource: (s: DataSource) => void;
}

const DataSourceContext = createContext<DataSourceContextValue | undefined>(undefined);

export const DataSourceProvider = ({
  children,
  initial = 'demo' as DataSource,
}: {
  children: ReactNode;
  initial?: DataSource;
}) => {
  const [source, setSource] = useState<DataSource>(initial);
  const value = useMemo(() => ({ source, setSource }), [source]);
  return <DataSourceContext.Provider value={value}>{children}</DataSourceContext.Provider>;
};

export const useDataSource = () => {
  const ctx = useContext(DataSourceContext);
  if (!ctx) throw new Error('useDataSource must be used within DataSourceProvider');
  return ctx;
};
