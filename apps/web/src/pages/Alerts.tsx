import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Bell, BellOff, CheckCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../components/ui/PriceChange';
import { alertsApi } from '../services/api';
import { format } from 'date-fns';
import type { Alert, AlertHistory } from '../types';

export default function AlertsPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const queryClient = useQueryClient();
  
  const { data: alertsData, isLoading: alertsLoading } = useQuery<{ alerts: Alert[] }>({
    queryKey: ['alerts', 'active'],
    queryFn: () => alertsApi.getAlerts('active'),
  });
  
  const { data: historyData, isLoading: historyLoading } = useQuery<{ history: AlertHistory[]; total: number }>({
    queryKey: ['alertHistory'],
    queryFn: () => alertsApi.getHistory(50),
  });
  
  const deleteMutation = useMutation({
    mutationFn: (id: string) => alertsApi.deleteAlert(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
  
  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => 
      alertsApi.updateAlert(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
    },
  });

  const alerts = alertsData?.alerts || [];
  const history = historyData?.history || [];
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Alerts</h1>
          <p className="text-surface-500">Get notified when your conditions are met</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Alert
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'active'
              ? 'bg-primary-600 text-white'
              : 'bg-surface-800 text-surface-400 hover:text-surface-200'
          }`}
        >
          <Bell className="w-4 h-4" />
          Active ({alerts.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-primary-600 text-white'
              : 'bg-surface-800 text-surface-400 hover:text-surface-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          History
        </button>
      </div>

      {activeTab === 'active' ? (
        <Card>
          <CardContent>
            {alerts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-surface-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-8 h-8 text-surface-500" />
                </div>
                <h3 className="text-lg font-medium text-surface-200 mb-2">No active alerts</h3>
                <p className="text-surface-500 mb-4">Create alerts to get notified about price movements</p>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="btn-primary"
                >
                  Create Your First Alert
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    onDelete={() => deleteMutation.mutate(alert.id)}
                    onToggle={() => toggleMutation.mutate({ id: alert.id, isActive: !alert.isActive })}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            {history.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-surface-500">No alert history yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.map((item) => (
                  <AlertHistoryRow key={item.id} item={item} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AddAlertModal onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}

function AlertRow({ 
  alert, 
  onDelete,
  onToggle
}: { 
  alert: Alert;
  onDelete: () => void;
  onToggle: () => void;
}) {
  const alertTypeLabels: Record<string, string> = {
    price_above: 'Price Above',
    price_below: 'Price Below',
    buy_target: 'Buy Target',
    sell_target: 'Sell Target',
    stop_loss: 'Stop Loss',
  };
  
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-surface-800/50 border border-surface-700/50">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          alert.isActive ? 'bg-primary-500/20' : 'bg-surface-700'
        }`}>
          {alert.isActive ? (
            <Bell className="w-5 h-5 text-primary-400" />
          ) : (
            <BellOff className="w-5 h-5 text-surface-500" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-surface-100">{alert.symbol}</p>
            <Badge variant={alert.isActive ? 'primary' : 'default'}>
              {alertTypeLabels[alert.alertType] || alert.alertType}
            </Badge>
            {alert.isRecurring && (
              <Badge variant="warning">Recurring</Badge>
            )}
          </div>
          <p className="text-sm text-surface-500">
            Target: {alert.targetPrice ? formatCurrency(alert.targetPrice) : '—'}
            {alert.currentPrice && ` • Current: ${formatCurrency(alert.currentPrice)}`}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onToggle}
          className={`p-2 rounded-lg transition-colors ${
            alert.isActive 
              ? 'hover:bg-surface-700 text-primary-400'
              : 'hover:bg-surface-700 text-surface-500'
          }`}
        >
          {alert.isActive ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg hover:bg-surface-700 text-surface-500 hover:text-danger-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function AlertHistoryRow({ item }: { item: AlertHistory }) {
  return (
    <div className="flex items-center justify-between p-4 rounded-lg bg-surface-800/30 border border-surface-800/50">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          item.emailSent ? 'bg-success-500/20' : 'bg-surface-700'
        }`}>
          <CheckCircle className={`w-5 h-5 ${item.emailSent ? 'text-success-400' : 'text-surface-500'}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-surface-100">{item.symbol}</p>
            <Badge>{item.alertType.replace('_', ' ')}</Badge>
            {item.acknowledged && (
              <Badge variant="success">{item.actionTaken || 'Acknowledged'}</Badge>
            )}
          </div>
          <p className="text-sm text-surface-500">
            Triggered at {formatCurrency(item.priceAtTrigger)}
            {item.targetPrice && ` (target: ${formatCurrency(item.targetPrice)})`}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm text-surface-400">
          {format(new Date(item.triggeredAt), 'MMM d, yyyy')}
        </p>
        <p className="text-xs text-surface-500">
          {format(new Date(item.triggeredAt), 'h:mm a')}
        </p>
      </div>
    </div>
  );
}

function AddAlertModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    symbol: '',
    alertType: 'price_below',
    targetPrice: '',
    isRecurring: false,
  });
  
  const addMutation = useMutation({
    mutationFn: (data: typeof formData) => alertsApi.createAlert({
      ...data,
      targetPrice: parseFloat(data.targetPrice),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      onClose();
    },
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-surface-900 border border-surface-700 rounded-xl w-full max-w-md p-6">
        <h2 className="text-xl font-semibold text-surface-100 mb-6">Create Alert</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Symbol</label>
            <input
              type="text"
              className="input"
              placeholder="e.g., AAPL"
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
              required
            />
          </div>
          
          <div>
            <label className="label">Alert Type</label>
            <select
              className="input"
              value={formData.alertType}
              onChange={(e) => setFormData({ ...formData, alertType: e.target.value })}
            >
              <option value="price_below">Price Below</option>
              <option value="price_above">Price Above</option>
              <option value="buy_target">Buy Target Hit</option>
              <option value="sell_target">Sell Target Hit</option>
              <option value="stop_loss">Stop Loss Hit</option>
            </select>
          </div>
          
          <div>
            <label className="label">Target Price</label>
            <input
              type="number"
              step="any"
              className="input"
              placeholder="0.00"
              value={formData.targetPrice}
              onChange={(e) => setFormData({ ...formData, targetPrice: e.target.value })}
              required
            />
          </div>
          
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="recurring"
              checked={formData.isRecurring}
              onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
              className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500"
            />
            <label htmlFor="recurring" className="text-sm text-surface-300">
              Recurring (re-enable after triggered)
            </label>
          </div>
          
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary flex-1"
              disabled={addMutation.isPending}
            >
              {addMutation.isPending ? 'Creating...' : 'Create Alert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
