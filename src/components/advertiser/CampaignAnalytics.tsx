import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  MousePointer, 
  Target,
  Calendar,
  DollarSign
} from 'lucide-react';
import { CampaignWithTargeting, CampaignStats } from '@/types/advertiser';
import { AdvertiserService } from '@/services/advertiserService';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface CampaignAnalyticsProps {
  campaigns: CampaignWithTargeting[];
}

export const CampaignAnalytics = ({ campaigns }: CampaignAnalyticsProps) => {
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [timeRange, setTimeRange] = useState('7d');
  const [stats, setStats] = useState<CampaignStats | null>(null);

  const activeCampaigns = campaigns.filter(c => c.status === 'active');
  const totalImpressions = campaigns.reduce((sum, c) => sum + c.impressions, 0);
  const totalClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
  const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0);
  const overallCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  useEffect(() => {
    if (selectedCampaign !== 'all') {
      loadCampaignStats(selectedCampaign);
    }
  }, [selectedCampaign]);

  const loadCampaignStats = async (campaignId: string) => {
    const campaignStats = await AdvertiserService.getCampaignStats(campaignId);
    setStats(campaignStats);
  };

  // Mock data for charts - in production, this would come from the API
  const performanceData = [
    { date: 'Mon', impressions: 1200, clicks: 45, conversions: 3 },
    { date: 'Tue', impressions: 1800, clicks: 72, conversions: 5 },
    { date: 'Wed', impressions: 2400, clicks: 98, conversions: 8 },
    { date: 'Thu', impressions: 2100, clicks: 85, conversions: 6 },
    { date: 'Fri', impressions: 3200, clicks: 142, conversions: 12 },
    { date: 'Sat', impressions: 3800, clicks: 178, conversions: 15 },
    { date: 'Sun', impressions: 3500, clicks: 165, conversions: 14 }
  ];

  const topPerformingCampaigns = [...campaigns]
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Campaign Analytics</h2>
        <div className="flex flex-col tablet:flex-row gap-3">
          <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Select campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaigns.map((campaign) => (
                <SelectItem key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Overview Cards - 2x2 on mobile, 4-across on tablet+ */}
      <div className="grid grid-cols-2 tablet:grid-cols-4 gap-3 tablet:gap-4">
        <Card className="bg-white/5 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 tablet:pb-2 px-3 tablet:px-6 pt-3 tablet:pt-6">
            <CardTitle className="text-xs tablet:text-sm font-medium text-white">
              <span className="tablet:hidden">Impressions</span>
              <span className="hidden tablet:inline">Total Impressions</span>
            </CardTitle>
            <Eye className="h-3 w-3 tablet:h-4 tablet:w-4 text-gray-400" />
          </CardHeader>
          <CardContent className="px-3 tablet:px-6 pb-3 tablet:pb-6">
            <div className="text-lg tablet:text-2xl font-bold text-white">{totalImpressions.toLocaleString()}</div>
            <p className="text-xs text-gray-400 whitespace-nowrap">
              <TrendingUp className="h-3 w-3 inline text-green-500" /> +15.3%<span className="hidden tablet:inline"> from last week</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 tablet:pb-2 px-3 tablet:px-6 pt-3 tablet:pt-6">
            <CardTitle className="text-xs tablet:text-sm font-medium text-white">
              <span className="tablet:hidden">Clicks</span>
              <span className="hidden tablet:inline">Total Clicks</span>
            </CardTitle>
            <MousePointer className="h-3 w-3 tablet:h-4 tablet:w-4 text-gray-400" />
          </CardHeader>
          <CardContent className="px-3 tablet:px-6 pb-3 tablet:pb-6">
            <div className="text-lg tablet:text-2xl font-bold text-white">{totalClicks.toLocaleString()}</div>
            <p className="text-xs text-gray-400 whitespace-nowrap">
              <TrendingUp className="h-3 w-3 inline text-green-500" /> +8.2%<span className="hidden tablet:inline"> from last week</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 tablet:pb-2 px-3 tablet:px-6 pt-3 tablet:pt-6">
            <CardTitle className="text-xs tablet:text-sm font-medium text-white">CTR</CardTitle>
            <Target className="h-3 w-3 tablet:h-4 tablet:w-4 text-gray-400" />
          </CardHeader>
          <CardContent className="px-3 tablet:px-6 pb-3 tablet:pb-6">
            <div className="text-lg tablet:text-2xl font-bold text-white">{overallCTR.toFixed(2)}%</div>
            <p className="text-xs text-gray-400 whitespace-nowrap">
              <TrendingDown className="h-3 w-3 inline text-red-500" /> -0.8%<span className="hidden tablet:inline"> from last week</span>
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-gray-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 tablet:pb-2 px-3 tablet:px-6 pt-3 tablet:pt-6">
            <CardTitle className="text-xs tablet:text-sm font-medium text-white">Conversions</CardTitle>
            <DollarSign className="h-3 w-3 tablet:h-4 tablet:w-4 text-gray-400" />
          </CardHeader>
          <CardContent className="px-3 tablet:px-6 pb-3 tablet:pb-6">
            <div className="text-lg tablet:text-2xl font-bold text-white">{totalConversions.toLocaleString()}</div>
            <p className="text-xs text-gray-400 whitespace-nowrap">
              <TrendingUp className="h-3 w-3 inline text-green-500" /> +5%<span className="hidden tablet:inline"> from last week</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList className="bg-gray-800 border-gray-700">
          <TabsTrigger value="performance" className="data-[state=active]:bg-yellow-600">Performance</TabsTrigger>
          <TabsTrigger value="engagement" className="data-[state=active]:bg-yellow-600">Engagement</TabsTrigger>
          <TabsTrigger value="campaigns" className="data-[state=active]:bg-yellow-600">Top Campaigns</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card className="bg-white/5 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="impressions" 
                    stroke="#8b5cf6" 
                    name="Impressions"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="clicks" 
                    stroke="#3b82f6" 
                    name="Clicks"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <Card className="bg-white/5 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Engagement Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="conversions" fill="#10b981" name="Conversions" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <Card className="bg-white/5 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Top Performing Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPerformingCampaigns.map((campaign, index) => (
                  <div key={campaign.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-semibold text-gray-400">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-white">{campaign.name}</p>
                        <p className="text-sm text-gray-400">
                          {campaign.impressions.toLocaleString()} impressions
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-white">{campaign.clicks} clicks</p>
                      <p className="text-sm text-gray-400">
                        {campaign.impressions > 0 
                          ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2)
                          : '0.00'
                        }% CTR
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Active Campaigns Summary */}
      <Card className="bg-white/5 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Active Campaigns Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2 tablet:gap-4">
            <div className="text-center p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
              <BarChart3 className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
              <p className="text-2xl font-bold text-white">{activeCampaigns.length}</p>
              <p className="text-sm text-gray-400">Active Campaigns</p>
            </div>
            <div className="text-center p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-blue-500" />
              <p className="text-2xl font-bold text-white">{campaigns.length}</p>
              <p className="text-sm text-gray-400">Total Campaigns</p>
            </div>
            <div className="text-center p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="text-2xl font-bold text-white">
                {totalClicks > 0 
                  ? ((totalConversions / totalClicks) * 100).toFixed(1)
                  : '0.0'
                }%
              </p>
              <p className="text-sm text-gray-400">Conversion Rate</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};