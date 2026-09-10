// In scope: how many times a thumbnail job's message is delivered before the DLQ takes it
// Out of scope: the message's own schema, the job names, queue definition, job implementation

/**
 * The queue's redrive policy and the job's give-up point both read this, so they can't drift apart.
 * It carries no schema on purpose: the queue is defined at deploy time, where pulling in a validation
 * library for one number would be pure weight.
 */
export const MEDIA_THUMBNAIL_MAX_RECEIVE_COUNT = 3;
