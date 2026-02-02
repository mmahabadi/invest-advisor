import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Plus, Trash2, TrendingUp, TrendingDown, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { PriceChange } from '../components/ui/PriceChange';
import { SymbolSearch, SearchResult } from '../components/ui/SymbolSearch';
import { SparklineChart } from '../components/ui/SparklineChart';
import { PriceChart } from '../components/ui/PriceChart';
import { formatPriceEUR, formatEUR, convertToEUR } from '../utils/currency';
import { portfolioApi } from '../services/api';
import type { Portfolio, PortfolioItem } from '../types';

// Helper to safely convert any value to a number
function toNumber(value: unknown): number {
  if (value == null) return 0;
  const num = Number(value);
  return isNaN(num) ? 0 : num;
}

export default function PortfolioPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [chartItem, setChartItem] = useState<{ symbol: string; name: string; avgCost?: number } | null>(null);
  const queryClient = useQueryClient();
  
  const { data: portfolio, isLoading } = useQuery<Portfolio>({
    queryKey: ['portfolio'],
    queryFn: () => portfolioApi.getPortfolio(),
  });
  
  const deleteMutation = useMutation({
    mutationFn: (id: string) => portfolioApi.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
      </div>
    );
  }

  const summary = portfolio?.summary;
  const items = portfolio?.items || [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent>
            <p className="text-sm text-surface-500">Total Invested</p>
            <p className="text-2xl font-bold text-surface-100 mt-1">
              {formatEUR(summary?.totalInvested || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-surface-500">Current Value</p>
            <p className="text-2xl font-bold text-surface-100 mt-1">
              {formatEUR(summary?.currentValue || 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-surface-500">Total Profit/Loss</p>
            <p className={`text-2xl font-bold mt-1 ${
              (summary?.profitLoss || 0) >= 0 ? 'text-success-400' : 'text-danger-400'
            }`}>
              {formatEUR(summary?.profitLoss || 0)}
            </p>
            <PriceChange 
              value={summary?.profitLoss || 0} 
              percentage={summary?.profitLossPct || 0} 
              size="sm" 
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <p className="text-sm text-surface-500">Holdings</p>
            <p className="text-2xl font-bold text-surface-100 mt-1">{items.length}</p>
            <p className="text-sm text-surface-500">assets</p>
          </CardContent>
        </Card>
      </div>

      {/* Holdings Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-surface-100">Holdings</h2>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Investment
            </button>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-surface-500" />
              </div>
              <h3 className="text-lg font-medium text-surface-200 mb-2">No investments yet</h3>
              <p className="text-surface-500 mb-4">Start tracking your portfolio by adding your first investment</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary"
              >
                Add Your First Investment
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-surface-500 border-b border-surface-800">
                    <th className="pb-3 font-medium">Asset</th>
                    <th className="pb-3 font-medium w-24">Trend</th>
                    <th className="pb-3 font-medium">Qty</th>
                    <th className="pb-3 font-medium">Avg Cost</th>
                    <th className="pb-3 font-medium">Price</th>
                    <th className="pb-3 font-medium">Value</th>
                    <th className="pb-3 font-medium">Profit/Loss</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <PortfolioRow
                      key={item.id}
                      item={item}
                      onDelete={() => deleteMutation.mutate(item.id)}
                      onShowChart={() => setChartItem({ 
                        symbol: item.symbol, 
                        name: item.assetName || '', 
                        avgCost: toNumber(item.avgCost) 
                      })}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Investment Modal */}
      {showAddModal && (
        <AddInvestmentModal onClose={() => setShowAddModal(false)} />
      )}

      {/* Chart Modal */}
      {chartItem && (
        <PriceChart
          symbol={chartItem.symbol}
          name={chartItem.name}
          buyPrice={chartItem.avgCost}
          onClose={() => setChartItem(null)}
        />
      )}
    </div>
  );
}

function PortfolioRow({ 
  item, 
  onDelete,
  onShowChart
}: { 
  item: PortfolioItem; 
  onDelete: () => void;
  onShowChart: () => void;
}) {
  const profitLoss = toNumber(item.profitLoss);
  const quantity = toNumber(item.quantity);
  const isPositive = profitLoss >= 0;
  
  return (
    <tr className="border-b border-surface-800/50 hover:bg-surface-800/30">
      <td className="py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-800 flex items-center justify-center">
            {isPositive ? (
              <TrendingUp className="w-5 h-5 text-success-400" />
            ) : (
              <TrendingDown className="w-5 h-5 text-danger-400" />
            )}
          </div>
          <div>
            <p className="font-medium text-surface-100">{item.symbol}</p>
            <p className="text-xs text-surface-500">{item.assetName}</p>
          </div>
        </div>
      </td>
      <td className="py-4">
        <div 
          className="cursor-pointer hover:opacity-80 transition-opacity"
          onClick={onShowChart}
          title="Click to view full chart"
        >
          <SparklineChart symbol={item.symbol} range="1w" height={32} />
        </div>
      </td>
      <td className="py-4 font-mono text-surface-200 text-sm">
        {quantity.toLocaleString(undefined, { maximumFractionDigits: 4 })}
      </td>
      <td className="py-4 font-mono text-surface-300 text-sm">
        {formatPriceEUR(item.avgCost, item.symbol)}
      </td>
      <td className="py-4 font-mono text-surface-200 text-sm">
        {formatPriceEUR(item.currentPrice, item.symbol)}
      </td>
      <td className="py-4 font-mono text-surface-200 text-sm">
        {formatPriceEUR(item.currentValue, item.symbol)}
      </td>
      <td className="py-4">
        <div>
          <p className={`font-medium text-sm ${isPositive ? 'text-success-400' : 'text-danger-400'}`}>
            {isPositive ? '+' : ''}{formatPriceEUR(profitLoss, item.symbol)}
          </p>
          <PriceChange value={profitLoss} percentage={item.profitLossPct} size="sm" />
        </div>
      </td>
      <td className="py-4">
        <div className="flex items-center gap-1">
          <button
            onClick={onShowChart}
            className="p-2 rounded-lg hover:bg-surface-700 text-surface-400 hover:text-primary-400 transition-colors"
            title="View Chart"
          >
            <BarChart2 className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-surface-700 text-surface-500 hover:text-danger-400 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function AddInvestmentModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    symbol: '',
    assetType: 'stock',
    quantity: '',
    price: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  
  const addMutation = useMutation({
    mutationFn: (data: typeof formData) => portfolioApi.addItem({
      ...data,
      quantity: parseFloat(data.quantity),
      price: parseFloat(data.price),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio'] });
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
      <div className="bg-surface-900 border border-surface-700 rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-surface-100 mb-6">Add Investment</h2>
        
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
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Quantity</label>
              <input
                type="number"
                step="any"
                className="input"
                placeholder="0"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Price per Share</label>
              <input
                type="number"
                step="any"
                className="input"
                placeholder="0.00"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
              />
            </div>
          </div>
          
          <div>
            <label className="label">Purchase Date</label>
            <input
              type="date"
              className="input"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
            />
          </div>
          
          <div>
            <label className="label">Notes (Optional)</label>
            <textarea
              className="input"
              rows={2}
              placeholder="Any additional notes..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            />
          </div>
          
          {addMutation.isError && (
            <div className="bg-danger-500/10 border border-danger-500/30 rounded-lg p-3 text-sm text-danger-400">
              {(addMutation.error as any)?.response?.data?.message || 'Failed to add investment'}
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
              {addMutation.isPending ? 'Adding...' : 'Add Investment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
