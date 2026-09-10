// In scope: the settings used to plan the one-time schedule for the UMA one-draw topic notification
// Out of scope: picking the firing time, registering the schedule

/** Prefix of a one-time schedule's name; the date follows it, making the name unique per day. */
export const INVOCATION_SCHEDULE_NAME_PREFIX = "uma-one-draw-topic";

export const INVOCATION_WINDOW_START_HOUR = 12;

export const INVOCATION_WINDOW_DURATION_MINUTES = 360;

/** IANA timezone the firing time is read in. */
export const INVOCATION_TIMEZONE = "Asia/Tokyo";
