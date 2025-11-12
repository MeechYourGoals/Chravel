import React, { useState } from 'react';
import { X, Calendar, Users, MapPin, MessageSquare } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  demoType?: 'pro' | 'events';
}

export const DemoModal = ({ isOpen, onClose, demoType = 'pro' }: DemoModalProps) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    teamSize: '',
    useCase: '',
    message: ''
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onClose();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getDemoTitle = () => {
    return demoType === 'events' ? 'Schedule Events Demo' : 'Schedule Pro Demo';
  };

  const getDemoDescription = () => {
    return demoType === 'events' 
      ? 'See how Chravel Events can streamline your event management workflow'
      : 'Discover how Chravel Pro can transform your team\'s travel coordination';
  };

  const getUseCaseOptions = () => {
    if (demoType === 'events') {
      return [
        'Conference Management',
        'Corporate Events',
        'Festival Coordination',
        'Wedding Planning',
        'Sports Events',
        'Other'
      ];
    }
    return [
      'Corporate Travel',
      'Music Tours',
      'Sports Teams',
      'Film Production',
      'Agency Operations',
      'Other'
    ];
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{getDemoTitle()}</h2>
            <p className="text-sm text-muted-foreground mt-1">{getDemoDescription()}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Full Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="John Doe"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Work Email *
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="john@company.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Company *
            </label>
            <Input
              value={formData.company}
              onChange={(e) => handleInputChange('company', e.target.value)}
              placeholder="Company Inc."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Team Size
              </label>
              <Select onValueChange={(value) => handleInputChange('teamSize', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1-10 people</SelectItem>
                  <SelectItem value="11-50">11-50 people</SelectItem>
                  <SelectItem value="51-200">51-200 people</SelectItem>
                  <SelectItem value="200+">200+ people</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Use Case
              </label>
              <Select onValueChange={(value) => handleInputChange('useCase', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select use case" />
                </SelectTrigger>
                <SelectContent>
                  {getUseCaseOptions().map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Tell us about your needs
            </label>
            <Textarea
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              placeholder="What challenges are you looking to solve?"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              Schedule Demo
            </Button>
          </div>
        </form>

        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar size={16} />
              <span>30-min call</span>
            </div>
            <div className="flex items-center gap-2">
              <Users size={16} />
              <span>Live demo</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare size={16} />
              <span>Q&A included</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};