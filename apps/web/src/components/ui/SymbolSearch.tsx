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
  const trimmed = query.trim();
  if (/^[A-Z]{2}[A-Z0-9]{10}$/i.test(trimmed)) return 'isin';
  if (/^[A-Z0-9]{6}$/i.test(trimmed) && !/^[A-Z]{2}/.test(trimmed)) return 'wkn';
  // Ticker: short alphanumeric, may include dots for exchange suffix
  if (/^[A-Z0-9]{1,6}(\.[A-Z]{1,3})?$/i.test(trimmed)) return 'ticker';
  // If contains spaces or longer text, it's likely a name search
  return 'name';
}

// Common European ETF suggestions
const EUROPEAN_SUFFIXES = [
  { suffix: '.DE', exchange: 'Frankfurt', flag: '🇩🇪' },
  { suffix: '.L', exchange: 'London', flag: '🇬🇧' },
  { suffix: '.AS', exchange: 'Amsterdam', flag: '🇳🇱' },
  { suffix: '.PA', exchange: 'Paris', flag: '🇫🇷' },
  { suffix: '.MI', exchange: 'Milan', flag: '🇮🇹' },
  { suffix: '.SW', exchange: 'Swiss', flag: '🇨🇭' },
];

// US stocks have different tickers on German exchanges (Xetra)
const US_TO_GERMAN: Record<string, string> = {
  'TSLA': 'TL0',
  'AAPL': 'APC',
  'MSFT': 'MSF',
  'AMZN': 'AMZ',
  'GOOGL': 'ABEA',
  'META': 'FB2A',
  'NVDA': 'NVD',
  'AMD': 'AMD',
  'NFLX': 'NFC',
  'DIS': 'WDP',
  'PYPL': '2PP',
  'INTC': 'INL',
  'CSCO': 'CIS',
  'ORCL': 'ORC',
  'BA': 'BCO',
  'JPM': 'CMC',
  'V': '3V64',
  'MA': 'M4I',
  'JNJ': 'JNJ',
  'KO': 'CCC3',
  'PEP': 'PEP',
  'MCD': 'MDO',
  'NKE': 'NKE',
  'SBUX': 'SRB',
  'UBER': 'UT8',
  'ABNB': '7AB',
  'PLTR': 'PTX',
  'COIN': '1QZ',
  'RIVN': '7RN',
  'NIO': 'NT0',
};

export function SymbolSearch({ 
  value, 
  onChange, 
  placeholder = "Search by company name (Apple, Tesla) or ticker (AAPL)...",
  label = "Search",
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
      if (searchQuery.length < 2) return { results: [] };
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
    enabled: searchQuery.length >= 2,
    staleTime: 30000,
  });

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Don't force uppercase - allow name searches like "Apple", "Tesla Inc"
    const newValue = e.target.value;
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

  // Check if we should show European suffix suggestions (only for ticker searches)
  const showEuropeanHints = useMemo(() => {
    const upperQuery = searchQuery.toUpperCase().trim();
    if (!searchQuery || searchQuery.includes('.')) return false;
    if (searchResults?.results && searchResults.results.length > 5) return false;
    // Only show for ticker-like queries (short, alphanumeric)
    return upperQuery.length >= 2 && upperQuery.length <= 6 && queryType === 'ticker';
  }, [searchQuery, searchResults, queryType]);
  
  // Get the uppercase version for ticker lookups
  const upperSearchQuery = searchQuery.toUpperCase().trim();

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
      {searchQuery.length > 0 && queryType === 'name' && (
        <div className="mt-1 text-xs text-primary-400 flex items-center gap-1">
          <Info className="w-3 h-3" />
          Searching by company name...
        </div>
      )}
      
      {/* Search Results Dropdown */}
      {showDropdown && searchQuery.length >= 2 && !selectedSymbol && (
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
                  <p className="mt-2 text-xs">Try:</p>
                  <ul className="text-xs mt-1 space-y-1 ml-2">
                    <li>• Full company name: <span className="text-surface-300">Apple Inc, Tesla</span></li>
                    <li>• Ticker symbol: <span className="text-surface-300">AAPL, TSLA</span></li>
                    <li>• With exchange: <span className="text-surface-300">TL0.DE, AAPL.L</span></li>
                  </ul>
                </div>
              ) : null}
              
              {/* European exchange suggestions */}
              {showEuropeanHints && (
                <div className="border-t border-surface-700 p-3">
                  <div className="flex items-center gap-2 text-xs text-surface-500 mb-2">
                    <Globe className="w-3 h-3" />
                    Try European exchanges (Trade Republic compatible):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* Show German ticker first if available */}
                    {US_TO_GERMAN[upperSearchQuery] && (
                      <button
                        type="button"
                        className="px-2 py-1 text-xs bg-primary-600 hover:bg-primary-500 rounded text-white transition-colors font-medium"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          const germanTicker = US_TO_GERMAN[upperSearchQuery];
                          const euroSymbol = `${germanTicker}.DE`;
                          handleSelectSymbol({
                            symbol: euroSymbol,
                            name: `${upperSearchQuery} on Xetra (EUR)`,
                            type: 'stock',
                            exchange: 'XETRA',
                          });
                        }}
                      >
                        🇩🇪 {US_TO_GERMAN[upperSearchQuery]}.DE ⭐
                      </button>
                    )}
                    {EUROPEAN_SUFFIXES.map(({ suffix, exchange, flag }) => {
                      // Skip .DE for US stocks that have German equivalents (already shown above)
                      if (suffix === '.DE' && US_TO_GERMAN[upperSearchQuery]) return null;
                      return (
                        <button
                          key={suffix}
                          type="button"
                          className="px-2 py-1 text-xs bg-surface-700 hover:bg-surface-600 rounded text-surface-300 transition-colors"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            const euroSymbol = `${upperSearchQuery}${suffix}`;
                            handleSelectSymbol({
                              symbol: euroSymbol,
                              name: `${upperSearchQuery} (${exchange})`,
                              type: 'stock',
                              exchange,
                            });
                          }}
                        >
                          {flag} {upperSearchQuery}{suffix}
                        </button>
                      );
                    })}
                  </div>
                  {US_TO_GERMAN[upperSearchQuery] && (
                    <p className="text-xs text-surface-500 mt-2">
                      ⭐ = Recommended for Trade Republic (matches EUR prices)
                    </p>
                  )}
                </div>
              )}
              
              {/* Search help */}
              {!searchResults?.results?.length && searchQuery.length < 3 && (
                <div className="border-t border-surface-700 p-3 text-xs text-surface-500">
                  <p className="font-medium text-surface-400 mb-1">💡 Search tips:</p>
                  <ul className="space-y-1 ml-2">
                    <li>• <span className="text-primary-400">Company name:</span> <span className="text-surface-300">Apple, Microsoft, Tesla Inc</span></li>
                    <li>• <span className="text-primary-400">US Ticker:</span> <span className="text-surface-300">AAPL, MSFT, TSLA</span></li>
                    <li>• <span className="text-primary-400">German/Xetra:</span> <span className="text-surface-300">TL0.DE (Tesla), APC.DE (Apple)</span></li>
                    <li>• <span className="text-primary-400">ETF:</span> <span className="text-surface-300">VUAA.DE, CSPX.L, Vanguard</span></li>
                    <li>• <span className="text-primary-400">ISIN:</span> <span className="text-surface-300">IE00BFMXXD54</span></li>
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
