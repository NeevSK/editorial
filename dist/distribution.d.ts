import { type ArticlePublishedEvent, type DistributionChannel, type DistributionDelivery, type DistributionLedger, MemoryDistributionLedger } from './domain.js';
export interface DistributionPayload {
    title: string;
    text: string;
    url: string;
    publication: ArticlePublishedEvent['publication'];
    language: ArticlePublishedEvent['language'];
    excerptOnly: boolean;
    utmCampaign: string;
}
export interface DistributionAdapter {
    readonly channel: DistributionChannel;
    readonly mode: 'dry-run' | 'live';
    prepare(event: ArticlePublishedEvent, article: Pick<DistributionPayload, 'title' | 'text'>): DistributionPayload;
    publish(delivery: DistributionDelivery, payload: DistributionPayload): Promise<{
        status: 'published' | 'dry-run';
        externalUrl?: string;
    }>;
}
export interface LinkedInAdapterConfig {
    accessToken: string;
    authorUrn: string;
    apiVersion: string;
    fetcher?: typeof fetch;
}
export declare function createLinkedInAdapter(config: LinkedInAdapterConfig): DistributionAdapter;
export interface PostizAdapterConfig {
    baseUrl: string;
    apiKey: string;
    integrationIds?: ReadonlyArray<string>;
    fetcher?: typeof fetch;
}
export declare function createPostizAdapter(config: PostizAdapterConfig): DistributionAdapter;
export declare const linkedinAdapter: DistributionAdapter;
export declare const mediumAdapter: DistributionAdapter;
export declare const substackAdapter: DistributionAdapter;
export declare const metaAdapter: DistributionAdapter;
export declare const postizAdapter: DistributionAdapter;
export declare const distributionAdapters: Readonly<Record<DistributionChannel, DistributionAdapter | undefined>>;
export interface DispatchInput {
    event: ArticlePublishedEvent;
    article: Pick<DistributionPayload, 'title' | 'text'>;
    accountIds: Readonly<Partial<Record<DistributionChannel, string>>>;
    ledger: DistributionLedger;
    adapters?: Readonly<Record<DistributionChannel, DistributionAdapter | undefined>>;
    now: string;
}
export declare function dispatchArticlePublished({ event, article, accountIds, ledger, adapters, now, }: DispatchInput): Promise<ReadonlyArray<DistributionDelivery>>;
export declare function createMemoryDispatchLedger(): MemoryDistributionLedger;
//# sourceMappingURL=distribution.d.ts.map