import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

interface SymbolSearchProps {
  value: string;
  onChange: (symbol: string, result: SearchResult | null) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export function SymbolSearch({ 
  value, 
  onChange, 
  placeholder = "Search for AAPL, MSFT, BTC...",
  label = "Search Symbol",
  required = true 
}: SymbolSearchProps) {
  const { accessToken } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState(value);
  const [selectedSymbol, setSelectedSymbol] = useState<SearchResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Search for symbols
  const { data: searchResults, isLoading: isSearching } = useQuery<{ results: SearchResult[] }>({
    queryKey: ['symbolSearch', searchQuery],
    queryFn: async () => {
      if (searchQuery.length < 1) return { results: [] };
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const response = await fetch(
        `${apiUrl}/market/search?q=${encodeURIComponent(searchQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken || ''}`,
          },
        }
      );
      if (!response.ok) {
        throw new Error('Search failed');
      }
      return response.json();
    },
    enabled: searchQuery.length >= 1,
    staleTime: 30000,
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value.toUpperCase();
    setSearchQuery(newValue);
    setSelectedSymbol(null);
    setShowDropdown(true);
    onChange(newValue, null);
  };

  const handleSelectSymbol = (result: SearchResult) => {
    setSelectedSymbol(result);
    setSearchQuery(result.symbol);
    setShowDropdown(false);
    onChange(result.symbol, result);
  };

  const handleClear = () => {
    setSelectedSymbol(null);
    setSearchQuery('');
    onChange('', null);
  };

  return (
    <div className="relative">
      <label className="label">{label}</label>
      <input
        type="text"
        className="input"
        placeholder={placeholder}
        value={searchQuery}
        onChange={handleSearchChange}
        onFocus={() => setShowDropdown(true)}
        onBlur={() => {
          // Delay hiding to allow click on dropdown items
          setTimeout(() => setShowDropdown(false), 200);
        }}
        required={required}
      />
      
      {/* Search Results Dropdown */}
      {showDropdown && searchQuery.length >= 1 && !selectedSymbol && (
        <div className="absolute z-50 w-full mt-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-surface-400 text-sm flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-surface-500 border-t-primary-500 rounded-full animate-spin" />
              Searching...
            </div>
          ) : searchResults?.results && searchResults.results.length > 0 ? (
            searchResults.results.map((result) => (
              <button
                key={result.symbol}
                type="button"
                className="w-full px-4 py-3 text-left hover:bg-surface-700 transition-colors border-b border-surface-700/50 last:border-0"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelectSymbol(result);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-surface-100">{result.symbol}</span>
                    <p className="text-sm text-surface-400 truncate">{result.name}</p>
                  </div>
                  <span className="text-xs bg-surface-700 px-2 py-1 rounded text-surface-400 ml-2 flex-shrink-0">
                    {result.type || result.exchange}
                  </span>
                </div>
              </button>
            ))
          ) : searchQuery.length >= 2 ? (
            <div className="p-4 text-surface-400 text-sm">
              No results found. You can still use "<span className="text-primary-400">{searchQuery}</span>" manually.
            </div>
          ) : (
            <div className="p-4 text-surface-400 text-sm">
              Type at least 2 characters to search
            </div>
          )}
        </div>
      )}
      
      {/* Selected Symbol Info */}
      {selectedSymbol && (
        <div className="mt-2 p-3 bg-surface-800 rounded-lg border border-primary-500/30">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-bold text-primary-400">{selectedSymbol.symbol}</span>
              <p className="text-sm text-surface-300">{selectedSymbol.name}</p>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="text-surface-500 hover:text-surface-300 p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
