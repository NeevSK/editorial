import type { ContentKind, Language, Publication, SubmissionStatus } from './domain';

export type SyndicationReviewStatus =
  | 'draft'
  | 'pending_editorial_review'
  | 'rights_approved'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

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
  publishDate: string; // ISO date string
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

const allowedSyndicationTransitions: Record<SyndicationReviewStatus, ReadonlyArray<SyndicationReviewStatus>> = {
  draft: ['draft', 'pending_editorial_review', 'withdrawn'],
  pending_editorial_review: ['pending_editorial_review', 'rights_approved', 'approved', 'rejected', 'withdrawn'],
  rights_approved: ['rights_approved', 'approved', 'rejected', 'withdrawn'],
  approved: ['approved', 'withdrawn'],
  rejected: ['rejected', 'pending_editorial_review'],
  withdrawn: ['withdrawn', 'draft'],
};

export function canTransitionSyndication(
  from: SyndicationReviewStatus,
  to: SyndicationReviewStatus,
): boolean {
  return allowedSyndicationTransitions[from].includes(to);
}

/**
 * Manifest defining cross-syndicated articles across EdLove and Gurudevi with review gating.
 */
export const sharedSyndicationManifests: ReadonlyArray<SharedSyndicationManifest> = [
  {
    workId: 'beyond-extractive-classroom',
    slug: 'beyond-extractive-classroom',
    canonicalUrl: 'https://edlove.org/journal/beyond-extractive-classroom',
    originPublication: 'edlove',
    syndicatedTo: ['gurudevi'],
    pedagogicalTakeaways: {
      gurudevi:
        'Local-first software preserves the cognitive sanctuary of the teacher, ensuring classroom documentation remains private, offline-capable, and respectful of teacher focus.',
    },
    status: 'approved',
    approvedBy: 'Naveen',
    approvalNote: 'Approved as cornerstone contemplative tech paper.',
    updatedAt: '2026-09-02T00:00:00Z',
  },
  {
    workId: 'architecture-of-gratitude',
    slug: 'architecture-of-gratitude',
    canonicalUrl: 'https://gurudevi.edlove.org/journal/architecture-of-gratitude',
    originPublication: 'gurudevi',
    syndicatedTo: ['edlove'],
    pedagogicalTakeaways: {
      edlove:
        'Transforming extractive tuition economics into sustainable teacher patronage is a cornerstone of systemic educational equity in the Global South.',
    },
    status: 'approved',
    approvedBy: 'Naveen',
    approvalNote: 'Approved for global gift economy comparative study.',
    updatedAt: '2026-09-02T00:00:00Z',
  },
];

export function getSyndicationManifest(workId: string): SharedSyndicationManifest | undefined {
  return sharedSyndicationManifests.find((m) => m.workId === workId);
}
