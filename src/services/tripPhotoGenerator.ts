import { RunwareService } from './runwareService';
import { toast } from 'sonner';

export interface TripPhotoPrompt {
  tripId: number;
  tripTitle: string;
  prompt: string;
}

export const TRIP_PHOTO_PROMPTS: TripPhotoPrompt[] = [
  {
    tripId: 1,
    tripTitle: 'Kappa Alpha Psi Spring Break Trip',
    prompt:
      'Beautiful Cancun beach with turquoise water and white sand, tropical paradise, resort view, high quality, photorealistic, 16:9 aspect ratio',
  },
  {
    tripId: 2,
    tripTitle: 'Tokyo Adventure',
    prompt:
      'Modern Tokyo skyline at sunset with neon lights and cherry blossoms, urban adventure, cinematic quality, bustling city life, 16:9 aspect ratio',
  },
  {
    tripId: 3,
    tripTitle: 'Bali Wedding Weekend',
    prompt:
      'Romantic Bali beach wedding setup at sunset, tropical flowers, elegant destination wedding, warm lighting, ocean view, 16:9 aspect ratio',
  },
  {
    tripId: 4,
    tripTitle: 'Nashville Bachelorette Trip',
    prompt:
      'Nashville honky-tonk district at night, neon signs, live music venue, vibrant nightlife atmosphere, Broadway street, 16:9 aspect ratio',
  },
  {
    tripId: 5,
    tripTitle: 'Coachella Festival Weekend',
    prompt:
      'Desert music festival stage with crowd and palm trees, golden hour, vibrant festival atmosphere, outdoor concert, 16:9 aspect ratio',
  },
  {
    tripId: 6,
    tripTitle: 'Aspen Family Vacation',
    prompt:
      'Aspen mountain resort in summer, family-friendly alpine scenery, luxury mountain lodge, green meadows, snow-capped peaks, 16:9 aspect ratio',
  },
  {
    tripId: 7,
    tripTitle: 'Fantasy Football Golf Outing',
    prompt:
      'Beautiful golf course in Phoenix Arizona desert, palm trees, mountain backdrop, pristine fairways, desert landscape, 16:9 aspect ratio',
  },
  {
    tripId: 8,
    tripTitle: 'Tulum Wellness Retreat',
    prompt:
      'Serene Tulum beach yoga session at sunrise, cenote pool, wellness retreat atmosphere, peaceful meditation, tropical zen, 16:9 aspect ratio',
  },
  {
    tripId: 9,
    tripTitle: 'Wine-Tasting Getaway Napa',
    prompt:
      'Napa Valley vineyard landscape with rolling hills and wine glasses, golden hour, elegant wine country, grapevines, 16:9 aspect ratio',
  },
  {
    tripId: 10,
    tripTitle: 'Corporate Aspen Ski Retreat',
    prompt:
      'Aspen ski slopes in winter, snow-covered mountains, luxury ski resort, professional winter retreat, pristine powder snow, 16:9 aspect ratio',
  },
  {
    tripId: 11,
    tripTitle: 'Disney Cruise with Family',
    prompt:
      'Disney cruise ship on azure ocean, family vacation vibes, magical cruise experience, tropical waters, ship deck view, 16:9 aspect ratio',
  },
  {
    tripId: 12,
    tripTitle: 'Yellowstone Hiking Trip',
    prompt:
      'Yellowstone National Park with Old Faithful geyser and mountain landscape, outdoor adventure, natural beauty, wilderness, 16:9 aspect ratio',
  },
];

export class TripPhotoGenerator {
  private runwareService: RunwareService | null = null;

  constructor(apiKey?: string) {
    if (apiKey) {
      this.runwareService = new RunwareService(apiKey);
    }
  }

  async generateTripPhoto(tripPrompt: TripPhotoPrompt): Promise<string> {
    if (!this.runwareService) {
      throw new Error('Runware API key not provided');
    }

    try {
      const result = await this.runwareService.generateImage({
        positivePrompt: tripPrompt.prompt,
        model: 'runware:100@1',
        numberResults: 1,
        outputFormat: 'WEBP',
        CFGScale: 1,
        scheduler: 'FlowMatchEulerDiscreteScheduler',
        strength: 0.8,
      });

      return result.imageURL;
    } catch (error) {
      console.error(`Failed to generate photo for trip ${tripPrompt.tripId}:`, error);
      toast.error(`Failed to generate photo for ${tripPrompt.tripTitle}`);
      throw error;
    }
  }

  async generateAllTripPhotos(
    onProgress?: (completed: number, total: number) => void,
  ): Promise<Record<number, string>> {
    if (!this.runwareService) {
      throw new Error('Runware API key not provided');
    }

    const results: Record<number, string> = {};
    const total = TRIP_PHOTO_PROMPTS.length;

    toast.info(`Starting generation of ${total} trip photos...`);

    for (let i = 0; i < TRIP_PHOTO_PROMPTS.length; i++) {
      const prompt = TRIP_PHOTO_PROMPTS[i];

      try {
        const imageUrl = await this.generateTripPhoto(prompt);
        results[prompt.tripId] = imageUrl;

        if (onProgress) {
          onProgress(i + 1, total);
        }

        toast.success(`Generated photo for ${prompt.tripTitle} (${i + 1}/${total})`);
      } catch (error) {
        console.error(`Failed to generate photo for trip ${prompt.tripId}:`, error);
        // Continue with other photos even if one fails
      }
    }

    toast.success(
      `Photo generation complete! Generated ${Object.keys(results).length}/${total} photos.`,
    );
    return results;
  }
}
