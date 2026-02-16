
import React, { useState, useEffect } from 'react';
import { Archive, Camera, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InteractiveButton } from '../components/ui/interactive-button';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Badge } from '../components/ui/badge';
import { ProfileHeaderSkeleton, StatsSkeletonGrid } from '../components/ui/loading-skeleton';
import { useAuth } from '../hooks/useAuth';
import { SavedPlacesInline } from '../components/profile/SavedPlacesInline';

const ProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading for demonstration
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const stats = [
    { label: 'Total Trips', value: '12', icon: '✈️' },
    { label: 'Countries Visited', value: '8', icon: '🌍' },
    { label: 'Photos Shared', value: '247', icon: '📸' },
    { label: 'Friends Connected', value: '28', icon: '👥' }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
        <ProfileHeaderSkeleton />
        <StatsSkeletonGrid />
        <div className="space-y-3 mb-8">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted/20 rounded-enterprise animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-6">
      {/* Profile Header with smooth entrance animation */}
      <div className="text-center mb-8 animate-fade-in">
        <Avatar className="w-24 h-24 mx-auto mb-4 transition-all duration-200 hover:scale-105">
          <AvatarImage src="/placeholder.svg" />
          <AvatarFallback className="bg-muted text-foreground text-2xl">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        
        <h1 className="text-2xl font-bold mb-1">{user?.email?.split('@')[0] || 'User'}</h1>
        <p className="text-muted-foreground mb-4">Travel Enthusiast</p>
        
        <div className="flex gap-2 justify-center">
          <Badge className="bg-primary/20 text-primary animate-fade-in" style={{ animationDelay: '0.1s' }}>
            Pro Member
          </Badge>
          <Badge className="bg-accent/20 text-accent animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Early Adopter
          </Badge>
        </div>
      </div>

      {/* Stats Grid with staggered animation */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {stats.map((stat, index) => (
          <div 
            key={index} 
            className="bg-card border border-border rounded-enterprise p-4 text-center animate-fade-in transition-all duration-200 hover:scale-105 hover:shadow-enterprise-md"
            style={{ animationDelay: `${0.1 * (index + 1)}s` }}
          >
            <div className="text-2xl mb-2">{stat.icon}</div>
            <div className="text-2xl font-bold text-foreground mb-1">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </div>
        ))}
      </div>

      <SavedPlacesInline />

      {/* Quick Actions with enhanced interactions */}
      <div className="space-y-3 mb-8">
        <InteractiveButton 
          variant="outline" 
          className="w-full justify-start h-12" 
          size="lg"
          onClick={() => navigate('/')}
          microAnimation="scale"
        >
          <Camera className="mr-3" size={18} />
          Manage Photos & Memories
        </InteractiveButton>
        
        <InteractiveButton 
          variant="outline" 
          className="w-full justify-start h-12" 
          size="lg"
          onClick={() => navigate('/archive')}
          microAnimation="scale"
        >
          <Archive className="mr-3" size={18} />
          Archived Trips
        </InteractiveButton>
        
        <InteractiveButton 
          variant="outline" 
          className="w-full justify-start h-12" 
          size="lg"
          onClick={() => navigate('/')}
          microAnimation="scale"
        >
          <Share2 className="mr-3" size={18} />
          Shared Trip Links
        </InteractiveButton>
      </div>

      {/* Recent Activity with entrance animation */}
      <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          <div className="bg-card border border-border rounded-enterprise p-3 transition-all duration-200 hover:shadow-enterprise">
            <p className="text-foreground">Added 12 photos to Tokyo Adventure</p>
            <p className="text-xs text-muted-foreground">2 hours ago</p>
          </div>
          
          <div className="bg-card border border-border rounded-enterprise p-3 transition-all duration-200 hover:shadow-enterprise">
            <p className="text-foreground">Created new trip: Paris Weekend</p>
            <p className="text-xs text-muted-foreground">1 day ago</p>
          </div>
          
          <div className="bg-card border border-border rounded-enterprise p-3 transition-all duration-200 hover:shadow-enterprise">
            <p className="text-foreground">Joined Bali Group Trip</p>
            <p className="text-xs text-muted-foreground">3 days ago</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
