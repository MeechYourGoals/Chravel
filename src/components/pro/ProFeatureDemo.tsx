import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Users, Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { hasTabAccess, isReadOnlyTab } from './ProTabsConfig';
import { Button } from '../ui/button';

export const ProFeatureDemo = () => {
  const { user } = useAuth();
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});

  if (!user?.isPro) return null;

  const userRole = user.proRole || 'staff';
  const userPermissions = user.permissions || ['read'];

  const runTests = () => {
    const tests = {
      'Role System': user.proRole !== undefined,
      Permissions: user.permissions.length > 0,
      'Finance Access': hasTabAccess('finance', userRole, userPermissions),
      'Medical Access': hasTabAccess('medical', userRole, userPermissions),
      'Compliance Access': hasTabAccess('compliance', userRole, userPermissions),
      'Admin Features': userPermissions.includes('admin'),
      'Write Permissions': userPermissions.includes('write'),
      'Read-Only Mode': isReadOnlyTab('finance', userRole, userPermissions),
    };

    setTestResults(tests);
  };

  const getStatusIcon = (status: boolean | undefined) => {
    if (status === undefined) return <AlertTriangle size={16} className="text-yellow-500" />;
    return status ? (
      <CheckCircle size={16} className="text-green-500" />
    ) : (
      <XCircle size={16} className="text-red-500" />
    );
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-gray-700 rounded-xl p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-bold text-white">Pro Features Demo</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-blue-400" />
            <span className="text-blue-400 font-medium">Current Role</span>
          </div>
          <p className="text-white font-bold text-lg">{userRole}</p>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={16} className="text-green-400" />
            <span className="text-green-400 font-medium">Permissions</span>
          </div>
          <p className="text-white font-medium">{userPermissions.join(', ')}</p>
        </div>
      </div>

      <Button onClick={runTests} className="mb-4">
        Run Feature Tests
      </Button>

      {Object.keys(testResults).length > 0 && (
        <div className="space-y-2">
          <h4 className="text-white font-medium mb-3">Test Results:</h4>
          {Object.entries(testResults).map(([test, result]) => (
            <div key={test} className="flex items-center gap-3 text-sm">
              {getStatusIcon(result)}
              <span className="text-gray-300">{test}</span>
              <span className={result ? 'text-green-400' : 'text-red-400'}>
                {result ? 'Pass' : 'Fail'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
