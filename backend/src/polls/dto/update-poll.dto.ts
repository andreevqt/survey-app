import { CreatePollDto } from './create-poll.dto';
// PATCH /polls/:id accepts the same shape as POST /polls.
// The service enforces "structural fields are read-only when responseCount > 0".
export class UpdatePollDto extends CreatePollDto {}
