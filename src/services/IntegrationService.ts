/**
 * Service to handle integrations with external media providers.
 * Note: These require real API keys in .env
 */

export interface ExternalMedia {
  id: string;
  url: string;
  thumbnailUrl: string;
  type: 'image' | 'video';
  name?: string;
  size?: string;
  source: 'google-drive' | 'instagram' | 'flickr';
}

class IntegrationService {
  private googleToken: string | null = null;
  private instagramToken: string | null = null;
  private flickrToken: string | null = null;

  // Mock fallbacks for demo
  private MOCK_IG = [
    { id: 'ig1', url: 'https://picsum.photos/seed/ig1/600/800', type: 'image' as const, source: 'instagram' as const, thumbnailUrl: 'https://picsum.photos/seed/ig1/600/800' },
    { id: 'ig2', url: 'https://picsum.photos/seed/ig2/600/800', type: 'image' as const, source: 'instagram' as const, thumbnailUrl: 'https://picsum.photos/seed/ig2/600/800' },
    { id: 'ig3', url: 'https://www.w3schools.com/html/mov_bbb.mp4', type: 'video' as const, source: 'instagram' as const, thumbnailUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
  ];

  private MOCK_DRIVE = [
    { id: 'gd1', name: 'Vacation.jpg', url: 'https://picsum.photos/seed/gd1/800/600', type: 'image' as const, size: '2.4 MB', source: 'google-drive' as const, thumbnailUrl: 'https://picsum.photos/seed/gd1/800/600' },
    { id: 'gd3', name: 'Project.mp4', url: 'https://www.w3schools.com/html/mov_bbb.mp4', type: 'video' as const, size: '12.5 MB', source: 'google-drive' as const, thumbnailUrl: 'https://www.w3schools.com/html/mov_bbb.mp4' },
  ];

  async fetchInstagramMedia(): Promise<ExternalMedia[]> {
    const clientId = import.meta.env.VITE_INSTAGRAM_CLIENT_ID;
    if (!clientId) {
      console.warn("Instagram Client ID missing. Returning mock data.");
      return this.MOCK_IG;
    }
    
    // In a real app, you'd check this.instagramToken or initiate OAuth
    // return fetch(`https://graph.instagram.com/me/media?fields=id,media_type,media_url,thumbnail_url&access_token=${this.instagramToken}`)
    return this.MOCK_IG;
  }

  async fetchGoogleDriveMedia(): Promise<ExternalMedia[]> {
    const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
    if (!apiKey) {
      console.warn("Google API Key missing. Returning mock data.");
      return this.MOCK_DRIVE;
    }
    
    // Logic for Google Picker or Drive API would go here
    return this.MOCK_DRIVE;
  }

  async fetchFlickrMedia(): Promise<ExternalMedia[]> {
    const apiKey = import.meta.env.VITE_FLICKR_API_KEY;
    if (!apiKey) {
      console.warn("Flickr API Key missing. Returning mock data.");
      return [
        { id: 'fl1', name: 'Street.jpg', url: 'https://picsum.photos/seed/fl1/1200/800', type: 'image' as const, source: 'flickr' as const, thumbnailUrl: 'https://picsum.photos/seed/fl1/1200/800' }
      ];
    }

    // Example Flickr fetch
    try {
      // const res = await fetch(`https://www.flickr.com/services/rest/?method=flickr.photos.getRecent&api_key=${apiKey}&format=json&nojsoncallback=1`);
      // const data = await res.json();
      return this.MOCK_DRIVE; // Placeholder
    } catch (e) {
      return this.MOCK_DRIVE;
    }
  }

  // OAuth initiation (simplified)
  initiateInstagramAuth() {
    const clientId = import.meta.env.VITE_INSTAGRAM_CLIENT_ID;
    const redirect = window.location.origin + '/auth/instagram/callback';
    window.open(`https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirect}&scope=user_profile,user_media&response_type=code`, '_blank');
  }

  initiateGoogleAuth() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    // Standard Google OAuth flow
  }
}

export const IntegrationProvider = new IntegrationService();
