import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../stores/authStore';
import { Search, Globe, Info } from 'lucide-react';

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

// Detect query type
function detectQueryType(query: string): 'isin' | 'wkn' | 'ticker' | 'name' {
  if (/^[A-Z]{2}[A-Z0-9]{10}$/i.test(query)) return 'isin';
  if (/^[A-Z0-9]{6}$/i.test(query) && !/^[A-Z]{2}/.test(query)) return 'wkn';
  if (/^[A-Z0-9.]{1,10}$/i.test(query)) return 'ticker';
  return 'name';
}

// Common European ETF suggestions
const EUROPEAN_SUFFIXES = [
  { suffix: '.L', exchange: 'London', flag: '🇬🇧' },
  { suffix: '.DE', exchange: 'Frankfurt', flag: '🇩🇪' },
  { suffix: '.AS', exchange: 'Amsterdam', flag: '🇳🇱' },
  { suffix: '.PA', exchange: 'Paris', flag: '🇫🇷' },
  { suffix: '.MI', exchange: 'Milan', flag: '🇮🇹' },
  { suffix: '.SW', exchange: 'Swiss', flag: '🇨🇭' },
];

export function SymbolSearch({ 
  value, 
  onChange, 
  placeholder = "Search by name, ticker, or ISIN...",
  label = "Search Symbol",
  required = true 
}: SymbolSearchProps) {
  const { accessToken } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState(value);
  const [selectedSymbol, setSelectedSymbol] = useState<SearchResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Detect what type of query the user entered
  const queryType = useMemo(() => detectQueryType(searchQuery), [searchQuery]);

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

  // Check if we should show European suffix suggestions
  const showEuropeanHints = useMemo(() => {
    if (!searchQuery || searchQuery.includes('.')) return false;
    if (searchResults?.results && searchResults.results.length > 3) return false;
    return searchQuery.length >= 2 && searchQuery.length <= 6 && queryType === 'ticker';
  }, [searchQuery, searchResults, queryType]);

  return (
    <div className="relative">
      <label className="label">{label}</label>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-500" />
        <input
          type="text"
          className="input pl-10"
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
      </div>
      
      {/* Query type hint */}
      {searchQuery.length > 0 && queryType === 'isin' && (
        <div className="mt-1 text-xs text-primary-400 flex items-center gap-1">
          <Info className="w-3 h-3" />
          Searching by ISIN...
        </div>
      )}
      
      {/* Search Results Dropdown */}
      {showDropdown && searchQuery.length >= 1 && !selectedSymbol && (
        <div className="absolute z-50 w-full mt-1 bg-surface-800 border border-surface-700 rounded-lg shadow-xl max-h-72 overflow-y-auto">
          {isSearching ? (
            <div className="p-4 text-surface-400 text-sm flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-surface-500 border-t-primary-500 rounded-full animate-spin" />
              {queryType === 'isin' ? 'Looking up ISIN...' : 'Searching...'}
            </div>
          ) : (
            <>
              {/* Results */}
              {searchResults?.results && searchResults.results.length > 0 ? (
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
                  <p>No results found for "<span className="text-primary-400">{searchQuery}</span>"</p>
                  <p className="mt-1 text-xs">You can still use this symbol manually.</p>
                </div>
              ) : (
                <div className="p-4 text-surface-400 text-sm">
                  Type at least 2 characters to search
                </div>
              )}
              
              {/* European exchange suggestions */}
              {showEuropeanHints && (
                <div className="border-t border-surface-700 p-3">
                  <div className="flex items-center gap-2 text-xs text-surface-500 mb-2">
                    <Globe className="w-3 h-3" />
                    Try European exchanges:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {EUROPEAN_SUFFIXES.map(({ suffix, exchange, flag }) => (
                      <button
                        key={suffix}
                        type="button"
                        className="px-2 py-1 text-xs bg-surface-700 hover:bg-surface-600 rounded text-surface-300 transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const euroSymbol = `${searchQuery.toUpperCase()}${suffix}`;
                          handleSelectSymbol({
                            symbol: euroSymbol,
                            name: `${searchQuery.toUpperCase()} (${exchange})`,
                            type: 'etf',
                            exchange,
                          });
                        }}
                      >
                        {flag} {searchQuery.toUpperCase()}{suffix}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* ISIN/WKN help */}
              {!searchResults?.results?.length && searchQuery.length < 5 && (
                <div className="border-t border-surface-700 p-3 text-xs text-surface-500">
                  <p className="font-medium text-surface-400 mb-1">💡 Search tips:</p>
                  <ul className="space-y-1 ml-2">
                    <li>• Ticker: <span className="text-surface-300">AAPL, MSFT, VUAA</span></li>
                    <li>• ISIN: <span className="text-surface-300">IE00BFMXXD54</span></li>
                    <li>• European: <span className="text-surface-300">VUAA.L, CSPX.DE</span></li>
                  </ul>
                </div>
              )}
            </>
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
