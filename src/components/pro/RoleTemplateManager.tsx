import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { 
  Save, Trash2, Download, Upload, Star, Globe, Lock, CheckCircle2, AlertCircle
} from 'lucide-react';
import { ProParticipant } from '../../types/pro';
import { ProTripCategory } from '../../types/proCategories';
import { roleTemplateService, RoleTemplate } from '../../services/roleTemplateService';
import { useToast } from '../../hooks/use-toast';
import { supabase } from '../../integrations/supabase/client';

interface RoleTemplateManagerProps {
  isOpen: boolean;
  onClose: () => void;
  roster: ProParticipant[];
  category: ProTripCategory;
  onApplyTemplate?: (assignments: Map<string, string>) => Promise<void>;
}

type View = 'list' | 'save' | 'load';

export const RoleTemplateManager = ({
  isOpen,
  onClose,
  roster,
  category,
  onApplyTemplate
}: RoleTemplateManagerProps) => {
  const [view, setView] = useState<View>('list');
  const [templates, setTemplates] = useState<RoleTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Save Template State
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [makePublic, setMakePublic] = useState(false);

  // Load templates on open
  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, category]);

  const loadTemplates = async () => {
    setIsLoading(true);
    const categoryTemplates = await roleTemplateService.getTemplatesByCategory(category);
    setTemplates(categoryTemplates);
    setIsLoading(false);
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      toast({
        title: 'Template name required',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    const template = await roleTemplateService.saveTemplate({
      name: templateName.trim(),
      description: templateDescription.trim(),
      category,
      roster,
      isPublic: makePublic
    });

    if (template) {
      toast({
        title: 'Template saved successfully',
        description: `"${template.name}" is now available for reuse`
      });
      setTemplateName('');
      setTemplateDescription('');
      setMakePublic(false);
      setView('list');
      loadTemplates();
    } else {
      toast({
        title: 'Failed to save template',
        variant: 'destructive'
      });
    }
    setIsLoading(false);
  };

  const handleLoadTemplate = async (template: RoleTemplate) => {
    if (!onApplyTemplate) return;

    setIsLoading(true);
    try {
      const assignments = roleTemplateService.applyTemplateToRoster(template, roster);
      await onApplyTemplate(assignments);
      
      toast({
        title: 'Template applied successfully',
        description: `Assigned roles to ${assignments.size} members`
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Failed to apply template',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`Delete template "${templateName}"? This cannot be undone.`)) return;

    setIsLoading(true);
    const success = await roleTemplateService.deleteTemplate(templateId);
    
    if (success) {
      toast({
        title: 'Template deleted',
        description: `"${templateName}" has been removed`
      });
      loadTemplates();
    } else {
      toast({
        title: 'Failed to delete template',
        variant: 'destructive'
      });
    }
    setIsLoading(false);
  };

  // Count unique roles in current roster
  const roleStats = roster.reduce((acc, member) => {
    acc[member.role] = (acc[member.role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star size={20} />
            Role Templates
          </DialogTitle>
        </DialogHeader>

        {/* View Tabs */}
        <div className="flex gap-2 mb-4">
          <Button
            onClick={() => setView('list')}
            variant={view === 'list' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
          >
            <Upload size={16} className="mr-2" />
            Load Template
          </Button>
          <Button
            onClick={() => setView('save')}
            variant={view === 'save' ? 'default' : 'outline'}
            size="sm"
            className="flex-1"
          >
            <Save size={16} className="mr-2" />
            Save Template
          </Button>
        </div>

        {/* List View */}
        {view === 'list' && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-gray-400">Loading templates...</p>
              </div>
            ) : templates.length > 0 ? (
              <div className="space-y-3">
                {templates.map(template => {
                  const { data: { user } } = supabase.auth.getUser();
                  const isOwner = template.createdBy === user;
                  
                  return (
                    <div
                      key={template.id}
                      className="bg-white/5 border border-gray-700 rounded-lg p-4 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium">{template.name}</h3>
                            {template.isPublic ? (
                              <div title="Public template">
                                <Globe size={14} className="text-blue-400" />
                              </div>
                            ) : (
                              <div title="Private template">
                                <Lock size={14} className="text-gray-400" />
                              </div>
                            )}
                          </div>
                          {template.description && (
                            <p className="text-sm text-gray-400">{template.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {template.roles.map((r, idx) => (
                              <span
                                key={idx}
                                className="text-xs bg-gray-700 px-2 py-1 rounded"
                              >
                                {r.role} ({r.count})
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleLoadTemplate(template)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            disabled={isLoading}
                          >
                            <Download size={14} className="mr-1" />
                            Apply
                          </Button>
                          {isOwner && (
                            <Button
                              onClick={() => handleDeleteTemplate(template.id, template.name)}
                              size="sm"
                              variant="outline"
                              className="border-red-600 text-red-400 hover:bg-red-600/10"
                              disabled={isLoading}
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Star size={48} className="text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 mb-2">No templates found for {category}</p>
                <p className="text-sm text-gray-500">Save your first template to reuse role configurations</p>
              </div>
            )}
          </div>
        )}

        {/* Save View */}
        {view === 'save' && (
          <div className="space-y-4">
            <div className="bg-white/5 rounded-lg p-4 border border-gray-700">
              <p className="text-sm text-gray-400 mb-2">Current roster configuration:</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(roleStats).map(([role, count]) => (
                  <span key={role} className="text-xs bg-gray-700 px-2 py-1 rounded">
                    {role} ({count})
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Drake Tour 2024 Roles"
                className="bg-gray-800 border-gray-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-description">Description (Optional)</Label>
              <Textarea
                id="template-description"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Describe when to use this template..."
                className="bg-gray-800 border-gray-600 text-white"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="make-public"
                checked={makePublic}
                onChange={(e) => setMakePublic(e.target.checked)}
                className="rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
              />
              <label htmlFor="make-public" className="text-sm text-gray-300 cursor-pointer">
                Make public (share with other users in marketplace)
              </label>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-700">
              <Button
                onClick={() => setView('list')}
                variant="outline"
                className="flex-1"
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveTemplate}
                disabled={!templateName.trim() || isLoading}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                {isLoading ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    Save Template
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

