import type { ContentKind, Language, Publication } from './domain';
export type SyndicationReviewStatus = 'draft' | 'pending_editorial_review' | 'rights_approved' | 'approved' | 'rejected' | 'withdrawn';
export interface SharedJournalMetadata {
    title: string;
    subtitle: string;
    workId: string;
    contentKind: ContentKind;
    originPublication: Publication;
    authorId?: string;
    author: string;
    scribe: string;
    scribeNote?: string;
    language: Language;
    topics: ReadonlyArray<string>;
    publishDate: string;
    updatedDate?: string;
    readingTime?: number;
    heroImage?: string;
    canonicalUrl: string;
    license: string;
    source?: string;
    rightsAgreementId?: string;
}
export interface SharedSyndicationManifest {
    workId: string;
    slug: string;
    canonicalUrl: string;
    originPublication: Publication;
    syndicatedTo: ReadonlyArray<Publication>;
    pedagogicalTakeaways: Partial<Record<Publication, string>>;
    status: SyndicationReviewStatus;
    requestedBy?: string;
    approvedBy?: string;
    approvalNote?: string;
    updatedAt?: string;
}
export declare function canTransitionSyndication(from: SyndicationReviewStatus, to: SyndicationReviewStatus): boolean;
/**
 * Manifest defining cross-syndicated articles across EdLove and Gurudevi with review gating.
 */
export declare const sharedSyndicationManifests: ReadonlyArray<SharedSyndicationManifest>;
export declare function getSyndicationManifest(workId: string): SharedSyndicationManifest | undefined;
//# sourceMappingURL=syndication.d.ts.map