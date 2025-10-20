import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { advertiserService, type AdCampaign, type AdImage } from '@/services/advertiserService';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

type DashboardMode = 'list' | 'create' | 'edit';

export const AdvertiserDashboard: React.FC = () => {
  const [mode, setMode] = useState<DashboardMode>('list');
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    discount: '',
    images: [] as AdImage[],
    start_date: '',
    end_date: ''
  });
  const { toast } = useToast();

  const canPublish = useMemo(() => form.name.trim().length > 0 && form.images.length >= 1, [form]);

  const refresh = async () => {
    setLoading(true);
    try {
      const rows = await advertiserService.listCampaigns();
      setCampaigns(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const onImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to upload assets.' });
      return;
    }
    const nextImages: AdImage[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop() ?? 'bin';
      const path = `${user.id}/ads/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from('advertiser-assets').upload(path, file, { upsert: false, contentType: file.type });
      if (error) {
        toast({ title: 'Upload failed', description: error.message });
        continue;
      }
      const { data: pub } = supabase.storage.from('advertiser-assets').getPublicUrl(path);
      nextImages.push({ url: pub.publicUrl });
    }
    setForm(prev => ({ ...prev, images: [...prev.images, ...nextImages].slice(0, 10) }));
    e.currentTarget.value = '';
  };

  const onCreate = async (publish = false) => {
    try {
      setLoading(true);
      const payload = {
        name: form.name.trim(),
        description: form.description?.slice(0, 240) || null,
        discount: form.discount?.trim() || null,
        images: form.images,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        status: publish ? 'active' : 'draft' as const,
      };
      await advertiserService.createCampaign(payload as any);
      toast({ title: publish ? 'Ad published' : 'Draft saved' });
      setForm({ name: '', description: '', discount: '', images: [], start_date: '', end_date: '' });
      setMode('list');
      await refresh();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const LivePreview = () => (
    <Card className="p-4 bg-card/80 border border-border/50">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground text-lg line-clamp-1">{form.name || 'Ad name'}</h3>
          {form.discount && <Badge className="bg-accent/20 text-accent border-accent/30">{form.discount}</Badge>}
        </div>
        <Badge variant="secondary">Preview</Badge>
      </div>
      <div className="relative">
        {form.images.length > 0 ? (
          <Carousel className="w-full">
            <CarouselContent>
              {form.images.map((img, i) => (
                <CarouselItem key={i}>
                  <img src={img.url} alt={img.alt || 'Ad image'} className="w-full h-48 object-cover rounded-md" />
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="-left-3" />
            <CarouselNext className="-right-3" />
          </Carousel>
        ) : (
          <div className="h-48 rounded-md bg-muted flex items-center justify-center text-muted-foreground">Images preview</div>
        )}
      </div>
      <p className="mt-3 text-muted-foreground line-clamp-3">{form.description || 'Short description (max 240 chars)'}</p>
    </Card>
  );

  if (mode !== 'list') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Create Ad</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setMode('list')}>Cancel</Button>
            <Button onClick={() => onCreate(false)} disabled={loading || !form.name}>Save Draft</Button>
            <Button onClick={() => onCreate(true)} disabled={loading || !canPublish}>
              Publish
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-4 space-y-4 bg-card/80 border border-border/50">
            <div>
              <label className="text-sm text-muted-foreground">Ad Name</label>
              <Input value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Summer promo at The Rooftop" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Description (max 240)</label>
              <Textarea rows={4} value={form.description} onChange={e => setForm(prev => ({ ...prev, description: e.target.value.slice(0, 240) }))} />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Discount (optional)</label>
              <Input value={form.discount} onChange={e => setForm(prev => ({ ...prev, discount: e.target.value }))} placeholder="10% off for Chravel members" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-muted-foreground">Images (2–10 recommended)</label>
                <input type="file" accept="image/*" multiple onChange={onImagePick} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {form.images.map((img, idx) => (
                  <div key={idx} className="relative group">
                    <img src={img.url} className="w-full h-24 object-cover rounded" />
                    <button
                      className="absolute top-1 right-1 bg-black/60 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100"
                      onClick={() => setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-muted-foreground">Start date</label>
                <Input type="datetime-local" value={form.start_date} onChange={e => setForm(prev => ({ ...prev, start_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">End date</label>
                <Input type="datetime-local" value={form.end_date} onChange={e => setForm(prev => ({ ...prev, end_date: e.target.value }))} />
              </div>
            </div>
          </Card>
          <LivePreview />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Your Ad Campaigns</h2>
        <Button onClick={() => setMode('create')}>Create Ad</Button>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : campaigns.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">No campaigns yet. Click Create to start.</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {campaigns.map((c) => (
            <Card key={c.id} className="p-4 space-y-3 bg-card/80 border border-border/50">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <h3 className="font-semibold truncate">{c.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs capitalize">{c.status}</Badge>
                    {c.discount && <Badge className="bg-accent/20 text-accent border-accent/30">{c.discount}</Badge>}
                  </div>
                </div>
              </div>
              {Array.isArray(c.images) && c.images.length > 0 && (
                <img src={(c.images[0] as any).url || (c.images[0] as any)} className="w-full h-40 object-cover rounded" />
              )}
              <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={async () => {
                  await advertiserService.updateCampaign(c.id, { status: c.status === 'active' ? 'paused' : 'active' });
                  await refresh();
                }}>
                  {c.status === 'active' ? 'Pause' : 'Activate'}
                </Button>
                <Button variant="destructive" size="sm" onClick={async () => {
                  await advertiserService.deleteCampaign(c.id);
                  await refresh();
                }}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdvertiserDashboard;
