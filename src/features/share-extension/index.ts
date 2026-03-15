/**
 * Share Extension Feature Module
 *
 * Provides the web-side integration for the iOS Share Extension.
 * The extension saves normalized SharedInboundItems to App Group shared storage,
 * and this module processes them into Supabase-backed trip entities.
 */

export { useShareExtensionIngestion } from './hooks/useShareExtensionIngestion';
export {
  processSharedItem,
  getPendingSharedItems,
  getSharedItemsForTrip,
} from './shareIngestionService';
export { syncTripCacheToNative, syncAuthToNative } from './nativeBridge';
export type {
  SharedInboundItem,
  SharedContentAttachment,
  ShareDestination,
  SharedContentType,
  IngestionStatus,
  RoutingConfidence,
  ShareRoutingDecision,
  SharedInboundItemRow,
} from './types';
export { DESTINATION_LABELS } from './types';
