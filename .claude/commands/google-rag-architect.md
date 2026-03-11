Design or upgrade Chravel's Google-native multimodal RAG pipeline.

You must:
- research latest embeddings and retrieval docs
- confirm current multimodal embedding support and constraints
- inspect existing ingestion, chunking, metadata, and retrieval code
- recommend the cleanest architecture for:
  - PDFs
  - screenshots
  - confirmations
  - itinerary docs
  - links
  - images
  - concierge memory
  - imported email/calendar content
- determine where ingestion and embedding generation should run
- determine what belongs in Supabase Edge Functions
- produce:
  - ship status
  - data model
  - chunking strategy
  - vector schema
  - retrieval strategy
  - ranking / reranking logic
  - setup map
  - secret map
  - implementation plan
  - migration plan
