import despia from 'despia-native';

export interface ShareAppOptions {
  message: string;
  url: string;
}

/**
 * Triggers the native share dialog using Despia SDK.
 * @param options - The message and URL to share.
 */
export const shareApp = ({ message, url }: ShareAppOptions) => {
  // We use encodeURIComponent to ensure special characters in the message or URL
  // do not break the custom scheme format.
  despia(`shareapp://message?=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`);
};

export { despia };
export default despia;
