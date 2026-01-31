import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SymbolSearch, SearchResult } from '../components/ui/SymbolSearch';
import { Plus, Trash2, RefreshCw, Eye, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Badge, RecommendationBadge, ConfidenceBadge } from '../components/ui/Badge';
import { PriceChange, formatCurrency } from '../components/ui/PriceChange';
import { watchlistApi } from '../services/api';
import type { WatchlistItem } from '../types';

export default function WatchlistPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState<string>('');
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery<{ items: WatchlistItem[] }>({
    queryKey: ['watchlist', filter],
    queryFn: () => watchlistApi.getWatchlist('confidence', 'desc', filter || undefined),
  });
  
  const deleteMutation = useMutation({
    mutationFn: (id: string) => watchlistApi.removeItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });
  
  const refreshMutation = useMutation({
    mutationFn: (id: string) => watchlistApi.refreshAnalysis(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  const items = data?.items || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Watchlist</h1>
          <p className="text-surface-500">AI-powered analysis and target prices for your watched assets</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add to Watchlist
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['', 'strong_buy', 'buy', 'hold', 'avoid'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f 
                ? 'bg-primary-600 text-white' 
                : 'bg-surface-800 text-surface-400 hover:text-surface-200'
            }`}
          >
            {f === '' ? 'All' : f.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Watchlist Grid */}
      {items.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Eye className="w-8 h-8 text-surface-500" />
              </div>
              <h3 className="text-lg font-medium text-surface-200 mb-2">Your watchlist is empty</h3>
              <p className="text-surface-500 mb-4">Add assets to get AI-powered analysis and target prices</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary"
              >
                Add Your First Asset
              </button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map((item) => (
            <WatchlistCard
              key={item.id}
              item={item}
              onDelete={() => deleteMutation.mutate(item.id)}
              onRefresh={() => refreshMutation.mutate(item.id)}
              isRefreshing={refreshMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddWatchlistModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

function WatchlistCard({ 
  item, 
  onDelete, 
  onRefresh,
  isRefreshing 
}: { 
  item: WatchlistItem;
  onDelete: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const target = item.targetPrice;
  const nearBuyTarget = item.distanceToBuyPct != null && item.distanceToBuyPct <= 5;
  
  return (
    <Card className={nearBuyTarget ? 'ring-1 ring-success-500/50' : ''}>
      <CardContent>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-surface-100">{item.symbol}</h3>
              {nearBuyTarget && (
                <Badge variant="success">Near Target</Badge>
              )}
            </div>
            <p className="text-sm text-surface-500">{item.assetName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-primary-400 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onDelete}
              className="p-2 rounded-lg hover:bg-surface-700 text-surface-500 hover:text-danger-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {/* Price Info */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-xs text-surface-500 mb-1">Current Price</p>
            <p className="text-lg font-mono font-semibold text-surface-100">
              {formatCurrency(item.currentPrice)}
            </p>
            <PriceChange 
              value={item.priceChange24h} 
              percentage={item.priceChangePct24h} 
              size="sm" 
            />
          </div>
          <div>
            <p className="text-xs text-surface-500 mb-1">Buy Target</p>
            <p className="text-lg font-mono font-semibold text-success-400">
              {target?.buyTarget ? formatCurrency(target.buyTarget) : '—'}
            </p>
            {item.distanceToBuyPct != null && (
              <p className="text-xs text-surface-500">
                {item.distanceToBuyPct > 0 ? '+' : ''}{Number(item.distanceToBuyPct).toFixed(1)}% away
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-surface-500 mb-1">Sell Target</p>
            <p className="text-lg font-mono font-semibold text-primary-400">
              {target?.sellTarget ? formatCurrency(target.sellTarget) : '—'}
            </p>
          </div>
        </div>
        
        {/* Analysis */}
        {target ? (
          <>
            <div className="flex items-center gap-3 mb-4">
              <RecommendationBadge recommendation={target.recommendation} />
              <ConfidenceBadge confidence={target.confidence} />
              <Badge variant={target.riskLevel === 'low' ? 'success' : target.riskLevel === 'high' ? 'danger' : 'warning'}>
                {target.riskLevel} risk
              </Badge>
            </div>
            
            <p className="text-sm text-surface-300 mb-3">
              {target.analysisSummary}
            </p>
            
            {target.keyFactors.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-surface-500 uppercase">Key Factors</p>
                <ul className="space-y-1">
                  {target.keyFactors.slice(0, 3).map((factor, i) => (
                    <li key={i} className="text-sm text-surface-400 flex items-start gap-2">
                      <span className="text-primary-400">•</span>
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center gap-2 text-surface-500 py-4">
            <AlertCircle className="w-5 h-5" />
            <span>Analysis pending...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AddWatchlistModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    symbol: '',
    assetType: 'stock',
    notes: '',
  });
  
  const addMutation = useMutation({
    mutationFn: (data: typeof formData) => watchlistApi.addItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
      onClose();
    },
  });
  
  const handleSymbolChange = (symbol: string, result: SearchResult | null) => {
    setFormData({
      ...formData,
      symbol,
      assetType: result?.type || formData.assetType,
    });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.symbol) return;
    addMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface-900 border border-surface-700 rounded-xl w-full max-w-md p-6">
        <h2 className="text-xl font-semibold text-surface-100 mb-6">Add to Watchlist</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <SymbolSearch
            value={formData.symbol}
            onChange={handleSymbolChange}
            label="Search Symbol"
            placeholder="Search for AAPL, MSFT, BTC..."
          />
          
          <div>
            <label className="label">Asset Type</label>
            <select
              className="input"
              value={formData.assetType}
              onChange={(e) => setFormData({ ...formData, assetType: e.target.value })}
            >
              <option value="stock">Stock</option>
              <option value="etf">ETF</option>
              <option value="crypto">Crypto</option>
              <option value="commodity">Commodity</option>
            </select>
          </div>
          
          <div>
            <label className="label">Notes (Optional)</label>
            <textarea
              className="input"
              rows={2}
              placeholder="Why are you watching this asset?"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          
          <div className="bg-surface-800 rounded-lg p-3 text-sm text-surface-400">
            <p>AI analysis will be generated automatically. You'll get:</p>
            <ul className="mt-2 space-y-1">
              <li>• Target buy and sell prices</li>
              <li>• Confidence score</li>
              <li>• Technical analysis</li>
              <li>• Sentiment analysis</li>
            </ul>
          </div>
          
          {addMutation.isError && (
            <div className="bg-danger-500/10 border border-danger-500/30 rounded-lg p-3 text-sm text-danger-400">
              {(addMutation.error as any)?.response?.data?.message || 'Failed to add to watchlist'}
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary flex-1"
              disabled={addMutation.isPending || !formData.symbol}
            >
              {addMutation.isPending ? 'Adding...' : 'Add to Watchlist'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
