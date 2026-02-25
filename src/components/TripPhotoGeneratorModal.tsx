import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { TripPhotoGenerator, TRIP_PHOTO_PROMPTS } from '@/services/tripPhotoGenerator';
import { AlertCircle, Download } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TripPhotoGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TripPhotoGeneratorModal = ({ isOpen, onClose }: TripPhotoGeneratorModalProps) => {
  const [apiKey, setApiKey] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedPhotos, setGeneratedPhotos] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  const handleGenerate = async () => {
    if (!apiKey.trim()) {
      return;
    }

    setIsGenerating(true);
    setProgress(0);
    setShowResults(false);

    try {
      const generator = new TripPhotoGenerator(apiKey);
      const results = await generator.generateAllTripPhotos((completed, total) => {
        setProgress((completed / total) * 100);
      });

      setGeneratedPhotos(results);
      setShowResults(true);
    } catch (error) {
      console.error('Failed to generate photos:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadResults = () => {
    const dataStr = JSON.stringify(generatedPhotos, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'trip-cover-photos.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Trip Cover Photos</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This will generate custom cover photos for all {TRIP_PHOTO_PROMPTS.length} consumer
              trips using Runware AI. You need a Runware API key from{' '}
              <a
                href="https://runware.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                runware.ai
              </a>
              .
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="apiKey">Runware API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter your Runware API key..."
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              disabled={isGenerating}
            />
          </div>

          {isGenerating && (
            <div className="space-y-2">
              <Label>Generation Progress</Label>
              <Progress value={progress} className="w-full" />
              <p className="text-sm text-muted-foreground">
                Generating trip photos... {Math.round(progress)}% complete
              </p>
            </div>
          )}

          {showResults && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Generated Photos</h3>
                <Button onClick={downloadResults} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download Results
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 max-h-64 overflow-y-auto">
                {TRIP_PHOTO_PROMPTS.map(prompt => {
                  const photoUrl = generatedPhotos[prompt.tripId];
                  return (
                    <div key={prompt.tripId} className="space-y-2">
                      <div className="text-sm font-medium">{prompt.tripTitle}</div>
                      {photoUrl ? (
                        <img
                          src={photoUrl}
                          alt={prompt.tripTitle}
                          className="w-full h-24 object-cover rounded border"
                        />
                      ) : (
                        <div className="w-full h-24 bg-muted rounded border flex items-center justify-center text-xs text-muted-foreground">
                          Failed to generate
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <Alert>
                <AlertDescription>
                  Copy the generated URLs from the downloaded JSON file and update your tripsData.ts
                  file manually.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={isGenerating}>
              Close
            </Button>
            <Button onClick={handleGenerate} disabled={!apiKey.trim() || isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate Photos'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
