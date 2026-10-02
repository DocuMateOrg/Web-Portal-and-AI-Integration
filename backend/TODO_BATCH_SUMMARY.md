Tasks to implement batch summary API

1. Add endpoint POST /api/documents/batch-summary
2. Validate request payload (array of ids, optional maxSentences)
3. For each document id: fetch extracted_text from DB
4. Run simple extractive summarizer (first N sentences)
5. Save summary to DB and index in Elastic
6. Return result list: { id, ok, summary, error }
