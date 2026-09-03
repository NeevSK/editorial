export type Publication = 'edlove' | 'gurudevi' | 'neevsk' | 'intuitui';
export type Language = 'en' | 'si' | 'ta';
export type ContentKind = 'original' | 'curated' | 'licensed' | 'guest' | 'translation';
export type TranslationStatus = 'not_applicable' | 'draft' | 'in_review' | 'approved';
export type SubmissionStatus =
  | 'submitted'
  | 'in_review'
  | 'rights_review'
  | 'approved'
  | 'rejected'
  | 'withdrawn';
export type EditorialStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'rights_review'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'withdrawn';

export interface AuthorProfile {
  id: string;
  displayName: string;
  biography: string;
  email?: string;
  websiteUrl?: string;
  socialLinks: ReadonlyArray<string>;
  attributionName?: string;
}

export interface RightsAgreement {
  id: string;
  rightsHolder: string;
  license: string;
  permittedPublications: ReadonlyArray<Publication>;
  permittedChannels: ReadonlyArray<DistributionChannel>;
  evidenceReference: string;
  expiresAt?: string;
  takedownContact: string;
}

export interface ExternalSource {
  url: string;
  title: string;
  author?: string;
  publication?: string;
  accessedAt?: string;
}

export interface Contribution {
  authorId: string;
  role: 'author' | 'translator' | 'editor' | 'reviewer' | 'curator';
  credit: string;
}

export interface EditorialWork {
  id: string;
  publication: Publication;
  kind: ContentKind;
  status: EditorialStatus;
  canonicalSlug: string;
  sourceWorkId?: string;
  rightsAgreementId?: string;
  externalSource?: ExternalSource;
  contributions: ReadonlyArray<Contribution>;
}

export interface EditorialSubmission {
  id: string;
  publication: Publication;
  kind: ContentKind;
  title: string;
  summary: string;
  body: string;
  language: Language;
  submitterId: string;
  sourceUrl?: string;
  rightsAgreementId?: string;
  status: SubmissionStatus;
  reviewerId?: string;
  decisionNote?: string;
  createdAt: string;
  updatedAt: string;
}

const allowedSubmissionTransitions: Record<SubmissionStatus, ReadonlyArray<SubmissionStatus>> = {
  submitted: ['submitted', 'in_review', 'rights_review', 'rejected', 'withdrawn'],
  in_review: ['in_review', 'rights_review', 'approved', 'rejected', 'withdrawn'],
  rights_review: ['rights_review', 'in_review', 'approved', 'rejected', 'withdrawn'],
  approved: ['approved', 'withdrawn'],
  rejected: ['rejected', 'in_review'],
  withdrawn: ['withdrawn', 'in_review'],
};

export function canTransitionSubmission(from: SubmissionStatus, to: SubmissionStatus): boolean {
  return allowedSubmissionTransitions[from].includes(to);
}

export interface EditorialVersion {
  id: string;
  workId: string;
  language: Language;
  title: string;
  summary: string;
  canonicalUrl: string;
  contentPath: string;
  publishDate?: string;
  updatedDate?: string;
  translationOfVersionId?: string;
  translationStatus: TranslationStatus;
}

export type DistributionChannel = 'linkedin' | 'medium' | 'substack' | 'meta' | 'postiz' | 'rss';
export type DeliveryStatus =
  | 'pending'
  | 'processing'
  | 'published'
  | 'failed'
  | 'withdrawn'
  | 'skipped';

export interface DistributionPolicy {
  channels: ReadonlyArray<DistributionChannel>;
  permittedChannels?: ReadonlyArray<DistributionChannel>;
  excerptOnly: ReadonlyArray<DistributionChannel>;
  utmCampaign: string;
}

export interface ArticlePublishedEvent {
  type: 'article.published';
  eventId: string;
  occurredAt: string;
  workId: string;
  versionId: string;
  publication: Publication;
  language: Language;
  canonicalUrl: string;
  policy: DistributionPolicy;
}

export interface DistributionDelivery {
  id: string;
  eventId: string;
  channel: DistributionChannel;
  accountId: string;
  idempotencyKey: string;
  status: DeliveryStatus;
  attempts: number;
  externalUrl?: string;
  lastError?: string;
  updatedAt: string;
}

export interface DistributionLedger {
  get(idempotencyKey: string): DistributionDelivery | undefined;
  save(delivery: DistributionDelivery): DistributionDelivery;
  list(eventId?: string): ReadonlyArray<DistributionDelivery>;
}

const allowedTransitions: Record<DeliveryStatus, ReadonlyArray<DeliveryStatus>> = {
  pending: ['processing', 'skipped'],
  processing: ['published', 'failed', 'withdrawn', 'skipped'],
  published: ['withdrawn'],
  failed: ['processing', 'skipped'],
  withdrawn: [],
  skipped: [],
};

export function createArticlePublishedEvent(
  input: Omit<ArticlePublishedEvent, 'type'>,
): ArticlePublishedEvent {
  return { ...input, type: 'article.published' };
}

export function createDelivery(
  event: ArticlePublishedEvent,
  channel: DistributionChannel,
  accountId: string,
  now: string,
): DistributionDelivery {
  const idempotencyKey = `${event.eventId}:${channel}:${accountId}`;
  return {
    id: idempotencyKey,
    eventId: event.eventId,
    channel,
    accountId,
    idempotencyKey,
    status: 'pending',
    attempts: 0,
    updatedAt: now,
  };
}

export function transitionDelivery(
  delivery: DistributionDelivery,
  status: DeliveryStatus,
  now: string,
  details: Pick<DistributionDelivery, 'externalUrl' | 'lastError'> = {},
): DistributionDelivery {
  if (!allowedTransitions[delivery.status].includes(status)) {
    throw new Error(`Cannot transition delivery from ${delivery.status} to ${status}`);
  }
  return {
    ...delivery,
    ...details,
    status,
    attempts: status === 'processing' ? delivery.attempts + 1 : delivery.attempts,
    updatedAt: now,
  };
}

export class MemoryDistributionLedger implements DistributionLedger {
  private readonly deliveries = new Map<string, DistributionDelivery>();

  get(idempotencyKey: string) {
    return this.deliveries.get(idempotencyKey);
  }

  save(delivery: DistributionDelivery) {
    const existing = this.deliveries.get(delivery.idempotencyKey);
    if (existing && existing.id !== delivery.id)
      throw new Error(`Delivery key collision: ${delivery.idempotencyKey}`);
    this.deliveries.set(delivery.idempotencyKey, delivery);
    return delivery;
  }

  list(eventId?: string) {
    const deliveries = [...this.deliveries.values()];
    return eventId ? deliveries.filter((delivery) => delivery.eventId === eventId) : deliveries;
  }
}
