import type { components } from '../../../api/schema';

export type PollDto = components['schemas']['PublicPollDto'];

export type PollResponseValues = Record<string, string | string[] | undefined>;

export type PollScreenProps = Record<PropertyKey, never>;
