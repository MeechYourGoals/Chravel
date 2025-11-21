import React, { useState } from 'react';
import { Settings, CheckCircle, AlertCircle, ExternalLink, Eye, Mail, Building2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Card } from '../ui/card';

export const IntegrationsSection = () => {
  const [amexGbtEnabled, setAmexGbtEnabled] = useState(true); // Demo: enabled
  const [navanEnabled, setNavanEnabled] = useState(false);
  const [sapConcurEnabled, setSapConcurEnabled] = useState(false);
  const [bcdTravelEnabled, setBcdTravelEnabled] = useState(false);
  const [sabreGetThereEnabled, setSabreGetThereEnabled] = useState(false);
  
  const [configOpen, setConfigOpen] = useState(false);
  const [syncLogOpen, setSyncLogOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<string>('');

  const integrations = [
    {
      id: 'amex-gbt',
      name: 'Amex GBT',
      subtitle: 'Neo / Egencia',
      tagline: 'Sync bookings & travel policy',
      enabled: amexGbtEnabled,
      onToggle: setAmexGbtEnabled,
      status: 'connected',
      logo: '🏢', // Placeholder - would be actual logo
    },
    {
      id: 'navan',
      name: 'Navan',
      subtitle: '',
      tagline: 'Unified travel + card + expense',
      enabled: navanEnabled,
      onToggle: setNavanEnabled,
      status: 'available',
      logo: '✈️', // Placeholder - would be actual logo
    },
    {
      id: 'sap-concur',
      name: 'SAP Concur',
      subtitle: '',
      tagline: 'Industry-leading T&E automation',
      enabled: sapConcurEnabled,
      onToggle: setSapConcurEnabled,
      status: 'available',
      logo: '📊', // Placeholder - would be actual logo
    },
    {
      id: 'bcd-travel',
      name: 'BCD Travel',
      subtitle: 'TripSource',
      tagline: 'Global TMC with TripSource mobile',
      enabled: bcdTravelEnabled,
      onToggle: setBcdTravelEnabled,
      status: 'available',
      logo: '🌍', // Placeholder - would be actual logo
    },
    {
      id: 'sabre-getthere',
      name: 'Sabre GetThere',
      subtitle: '',
      tagline: 'Online booking tool (OBT)',
      enabled: sabreGetThereEnabled,
      onToggle: setSabreGetThereEnabled,
      status: 'available',
      logo: '🎯', // Placeholder - would be actual logo
    }
  ];

  const futureIntegrations = [
    {
      id: 'travelperk',
      name: 'TravelPerk',
      tagline: 'All-in-one travel management',
      logo: '🚀',
    },
    {
      id: 'corporate-stays',
      name: 'Corporate Stays',
      tagline: 'Extended stay accommodations',
      logo: '🏨',
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500/20 text-green-400 border-green-500/30">Connected</Badge>;
      case 'available':
        return <Badge variant="outline" className="border-yellow-500/30 text-yellow-400">Available</Badge>;
      default:
        return <Badge variant="outline" className="border-muted text-muted-foreground">Offline</Badge>;
    }
  };

  const handleConfigure = (integrationId: string) => {
    setSelectedIntegration(integrationId);
    setConfigOpen(true);
  };

  const handleViewSyncLog = (integrationId: string) => {
    setSelectedIntegration(integrationId);
    setSyncLogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-foreground">Integrations</h3>
        <Button variant="outline" size="sm">
          <Settings size={16} className="mr-2" />
          Manage All
        </Button>
      </div>

      {/* Corporate Travel Management Systems */}
      <div className="space-y-3">
        <h4 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Building2 size={20} />
          Corporate Travel Management
        </h4>
        
        <div className="grid grid-cols-1 gap-4">
          {integrations.map((integration) => (
            <Card 
              key={integration.id} 
              className="w-full h-[90px] bg-background/60 backdrop-blur-sm border border-border/50 p-3 hover:bg-background/80 transition-all duration-300"
            >
              <div className="flex items-center justify-between h-full">
                {/* Logo */}
                <div className="flex items-center text-4xl">
                  {integration.logo}
                </div>
                
                {/* Content */}
                <div className="flex-1 mx-4">
                  <div className="text-foreground font-semibold">
                    {integration.name}
                    {integration.subtitle && (
                      <span className="text-muted-foreground font-normal ml-1">({integration.subtitle})</span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{integration.tagline}</div>
                </div>
                
                {/* Configure Link */}
                <Dialog open={configOpen} onOpenChange={setConfigOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-primary hover:text-primary/80"
                      onClick={() => handleConfigure(integration.id)}
                    >
                      Configure
                    </Button>
                  </DialogTrigger>
                </Dialog>
                
                {/* Status Badge */}
                <div className="mx-2">
                  {getStatusBadge(integration.status)}
                </div>
                
                {/* Sync Log */}
                {integration.status === 'connected' && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleViewSyncLog(integration.id)}
                    className="mr-2"
                  >
                    <Eye size={14} />
                  </Button>
                )}
                
                {/* Toggle Switch */}
                <Switch
                  checked={integration.enabled}
                  onCheckedChange={integration.onToggle}
                />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Future Integrations */}
      <div className="space-y-4">
        <h4 className="text-lg font-semibold text-foreground">Coming Soon</h4>
        <div className="grid grid-cols-1 gap-4">
          {futureIntegrations.map((integration) => (
            <Card 
              key={integration.id} 
              className="w-full h-[90px] bg-background/30 backdrop-blur-sm border border-border/30 p-3 opacity-60"
            >
              <div className="flex items-center justify-between h-full">
                <div className="flex items-center text-4xl opacity-60">
                  {integration.logo}
                </div>
                <div className="flex-1 mx-4">
                  <div className="text-foreground/60 font-semibold">{integration.name}</div>
                  <div className="text-sm text-muted-foreground/60 mt-1">{integration.tagline}</div>
                </div>
                <Badge variant="outline" className="border-primary/30 text-primary/70">
                  <Mail size={12} className="mr-1" />
                  Request access
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Configuration Modal */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure Integration</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="text-center space-y-4">
              <div className="text-lg font-semibold">Step 1: OAuth Authentication</div>
              <Button className="w-full">
                <ExternalLink size={16} className="mr-2" />
                Connect to {selectedIntegration}
              </Button>
            </div>
            <div className="border-t pt-4">
              <div className="text-lg font-semibold mb-4">Step 2: Company Account Selection</div>
              <div className="space-y-2">
                <div className="p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                  <div className="font-medium">Acme Corp Travel Account</div>
                  <div className="text-sm text-muted-foreground">Primary business travel account</div>
                </div>
              </div>
            </div>
            <div className="border-t pt-4">
              <div className="text-lg font-semibold mb-4">Step 3: Import Preferences</div>
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Sync bookings automatically</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>Import receipts and expenses</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input type="checkbox" className="rounded" />
                  <span>Apply travel policy flags</span>
                </label>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sync Log Modal */}
      <Dialog open={syncLogOpen} onOpenChange={setSyncLogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Sync Activity Log</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-96 overflow-y-auto">
            {[
              { time: '2 minutes ago', action: 'Booking sync', status: 'success', details: 'Flight LH 441 imported successfully' },
              { time: '1 hour ago', action: 'Expense sync', status: 'success', details: 'Hotel receipt processed' },
              { time: '3 hours ago', action: 'Policy check', status: 'warning', details: 'Non-preferred vendor detected' },
              { time: '1 day ago', action: 'Booking sync', status: 'success', details: '5 new bookings imported' },
            ].map((log, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  {log.status === 'success' && <CheckCircle size={16} className="text-green-500" />}
                  {log.status === 'warning' && <AlertCircle size={16} className="text-yellow-500" />}
                  <div>
                    <div className="font-medium">{log.action}</div>
                    <div className="text-sm text-muted-foreground">{log.details}</div>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">{log.time}</div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};