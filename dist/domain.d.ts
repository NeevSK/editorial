export type Publication = 'edlove' | 'gurudevi' | 'neevsk' | 'intuitui';
export type Language = 'en' | 'si' | 'ta';
export type ContentKind = 'original' | 'curated' | 'licensed' | 'guest' | 'translation';
export type TranslationStatus = 'not_applicable' | 'draft' | 'in_review' | 'approved';
export type SubmissionStatus = 'submitted' | 'in_review' | 'rights_review' | 'approved' | 'rejected' | 'withdrawn';
export type EditorialStatus = 'draft' | 'submitted' | 'in_review' | 'rights_review' | 'approved' | 'scheduled' | 'published' | 'withdrawn';
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
export declare function canTransitionSubmission(from: SubmissionStatus, to: SubmissionStatus): boolean;
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
export type DeliveryStatus = 'pending' | 'processing' | 'published' | 'failed' | 'withdrawn' | 'skipped';
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
export declare function createArticlePublishedEvent(input: Omit<ArticlePublishedEvent, 'type'>): ArticlePublishedEvent;
export declare function createDelivery(event: ArticlePublishedEvent, channel: DistributionChannel, accountId: string, now: string): DistributionDelivery;
export declare function transitionDelivery(delivery: DistributionDelivery, status: DeliveryStatus, now: string, details?: Pick<DistributionDelivery, 'externalUrl' | 'lastError'>): DistributionDelivery;
export declare class MemoryDistributionLedger implements DistributionLedger {
    private readonly deliveries;
    get(idempotencyKey: string): DistributionDelivery | undefined;
    save(delivery: DistributionDelivery): DistributionDelivery;
    list(eventId?: string): DistributionDelivery[];
}
//# sourceMappingURL=domain.d.ts.map