#!/bin/bash

# Navigate to project directory
cd /Users/christianamechi/Desktop/Chravel

# Output file for results
OUTPUT_FILE="commit-results.txt"
echo "Starting git commit process..." > $OUTPUT_FILE

# Add all changes
echo "Adding files..." >> $OUTPUT_FILE
git add . >> $OUTPUT_FILE 2>&1

# Show status
echo "Git status:" >> $OUTPUT_FILE
git status >> $OUTPUT_FILE 2>&1

# Commit
echo "Committing..." >> $OUTPUT_FILE
git commit -m "feat: AI Concierge context-aware system

Complete implementation of context-aware AI Concierge:
- Database migration for usage tracking with RLS policies
- TripContextAggregator service for parallel data fetching
- ContextCacheService with 5-minute TTL caching
- Enhanced lovable-concierge edge function
- Usage tracking and rate limiting (10/day free)
- useConciergeUsage hook for frontend
- Updated AIConciergeChat with usage display
- ContextPollService for real-time updates
- Comprehensive documentation and tests" >> $OUTPUT_FILE 2>&1

# Push
echo "Pushing to GitHub..." >> $OUTPUT_FILE
git push origin main >> $OUTPUT_FILE 2>&1

echo "Complete! Check commit-results.txt for details" >> $OUTPUT_FILE
cat $OUTPUT_FILE

