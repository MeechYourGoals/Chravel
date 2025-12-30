import React, { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

type RpcError = { message: string } | null;
type RpcResponse<T> = Promise<{ data: T | null; error: RpcError }>;
type RpcClient = { rpc<T>(fn: string, args: Record<string, unknown>): RpcResponse<T> };

interface MemberSearchAutocompleteProps {
  tripId: string;
  existingMemberIds: string[];
  onSelect: (user: UserProfile) => void;
  onRemove?: (userId: string) => void;
  selectedUsers?: UserProfile[];
  placeholder?: string;
}

/**
 * MemberSearchAutocomplete Component
 *
 * Provides autocomplete search for users to invite to trips.
 * Searches by email and display name, excludes existing members.
 *
 * Features:
 * - Real-time search as user types
 * - Debounced API calls to reduce load
 * - Excludes already-added members
 * - Shows user avatars and names
 * - Mobile-responsive design
 */
export const MemberSearchAutocomplete: React.FC<MemberSearchAutocompleteProps> = ({
  tripId,
  existingMemberIds,
  onSelect,
  onRemove,
  selectedUsers = [],
  placeholder = 'Search by name (email only if shared/visible)...',
  placeholder = 'Search by email or name...',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsOpen(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      await performSearch(searchQuery.trim());
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    setLoading(true);
    setIsOpen(true);

    try {
      // Use a DB-side, rate-limited RPC to reduce harvesting risk.
      // We intentionally keep this RPC call "loosely typed" because this repo's
      // `src/integrations/supabase/types.ts` is generated from the remote DB and
      // won't automatically include newly-added SQL functions in CI.
      const rpc = supabase as unknown as RpcClient;
      const { data, error } = await rpc.rpc<UserProfile[]>('search_profiles_public', {
        query_text: query,
        limit_count: 10,
      });

      if (error) throw error;

      // Filter out existing members and already selected users
      const filtered = (data || []).filter(
        user =>
          !existingMemberIds.includes(user.id) &&
          !selectedUsers.some(selected => selected.id === user.id),
      );

      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users. Please try again.');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (user: UserProfile) => {
    onSelect(user);
    setSearchQuery('');
    setSearchResults([]);
    setIsOpen(false);
  };

  const handleRemove = (userId: string) => {
    if (onRemove) {
      onRemove(userId);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="h-4 w-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && searchResults.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {searchResults.map(user => (
            <button
              key={user.user_id}
              onClick={() => handleSelect(user)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-700 transition-colors text-left"
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.display_name || user.email || 'User'}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                  {(user.display_name || user.email || '?')[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{user.display_name || 'No name'}</p>
                {user.email ? (
                  <p className="text-gray-400 text-sm truncate">{user.email}</p>
                ) : (
                  <p className="text-gray-500 text-sm truncate">Email hidden</p>
                )}
              </div>
              <UserPlus className="h-5 w-5 text-blue-400" />
            </button>
          ))}
        </div>
      )}

      {/* Selected Users */}
      {selectedUsers.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {selectedUsers.map(user => (
            <div
              key={user.user_id}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 border border-blue-500/30 rounded-lg"
            >
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.display_name || user.email || 'User'}
                  className="h-6 w-6 rounded-full object-cover"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                  {(user.display_name || user.email || '?')[0].toUpperCase()}
                </div>
              )}
              <span className="text-white text-sm">
                {user.display_name || user.email || 'User'}
              </span>
              {onRemove && (
                <button
                  onClick={() => handleRemove(user.user_id)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {isOpen && !loading && searchQuery.length >= 2 && searchResults.length === 0 && (
        <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-600 rounded-lg shadow-xl p-4 text-center text-gray-400">
          No users found matching &quot;{searchQuery}&quot;
        </div>
      )}
    </div>
  );
};
