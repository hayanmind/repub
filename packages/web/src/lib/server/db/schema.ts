import { pgTable, text, timestamp, integer, jsonb, boolean } from 'drizzle-orm/pg-core';

export const uploads = pgTable('uploads', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  originalName: text('original_name').notNull(),
  size: integer('size').notNull(),
  mimeType: text('mime_type').notNull().default('application/epub+zip'),
  blobUrl: text('blob_url').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const jobs = pgTable('jobs', {
  id: text('id').primaryKey(),
  uploadId: text('upload_id').notNull().references(() => uploads.id),
  userId: text('user_id').notNull(),
  status: text('status').notNull().default('queued'),
  progress: jsonb('progress').$type<{
    step: number;
    totalSteps: number;
    percent: number;
    currentStage: string;
  }>(),
  options: jsonb('options').$type<Record<string, boolean>>().default({}),
  resultFilename: text('result_filename'),
  resultSize: integer('result_size'),
  resultBlobUrl: text('result_blob_url'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const conversionResults = pgTable('conversion_results', {
  id: text('id').primaryKey(),
  jobId: text('job_id').notNull().references(() => jobs.id),
  reportJson: jsonb('report_json'),
  metadata: jsonb('metadata'),
  stats: jsonb('stats'),
  previewData: jsonb('preview_data'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userSettings = pgTable('user_settings', {
  userId: text('user_id').primaryKey(),
  geminiApiKey: text('gemini_api_key'),
  openaiApiKey: text('openai_api_key'),
  anthropicApiKey: text('anthropic_api_key'),
  elevenlabsApiKey: text('elevenlabs_api_key'),
  stabilityApiKey: text('stability_api_key'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
