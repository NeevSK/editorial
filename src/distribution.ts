import {
  type ArticlePublishedEvent,
  createDelivery,
  type DistributionChannel,
  type DistributionDelivery,
  type DistributionLedger,
  MemoryDistributionLedger,
  transitionDelivery,
} from './domain.js';

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
  prepare(
    event: ArticlePublishedEvent,
    article: Pick<DistributionPayload, 'title' | 'text'>,
  ): DistributionPayload;
  publish(
    delivery: DistributionDelivery,
    payload: DistributionPayload,
  ): Promise<{ status: 'published' | 'dry-run'; externalUrl?: string }>;
}

export interface LinkedInAdapterConfig {
  accessToken: string;
  authorUrn: string;
  apiVersion: string;
  fetcher?: typeof fetch;
}

export function createLinkedInAdapter(config: LinkedInAdapterConfig): DistributionAdapter {
  const fetcher = config.fetcher ?? fetch;
  return {
    channel: 'linkedin',
    mode: 'live',
    prepare(event, article) {
      return createDryRunAdapter('linkedin').prepare(event, article);
    },
    async publish(_delivery, payload) {
      const response = await fetcher('https://api.linkedin.com/rest/posts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
          'Linkedin-Version': config.apiVersion,
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          author: config.authorUrn,
          commentary: `${payload.title}\n\n${payload.text}\n\n${payload.url}`,
          visibility: 'PUBLIC',
          distribution: {
            feedDistribution: 'MAIN_FEED',
            targetEntities: [],
            thirdPartyDistributionChannels: [],
          },
          lifecycleState: 'PUBLISHED',
          isReshareDisabledByAuthor: false,
        }),
      });
      if (!response.ok) {
        throw new Error(
          `LinkedIn publish failed with HTTP ${response.status}: ${await response.text()}`,
        );
      }
      const postId = response.headers.get('x-restli-id');
      return {
        status: 'published',
        externalUrl: postId
          ? `https://www.linkedin.com/feed/update/${encodeURIComponent(postId)}`
          : undefined,
      };
    },
  };
}

function createDryRunAdapter(channel: DistributionChannel): DistributionAdapter {
  return {
    channel,
    mode: 'dry-run',
    prepare(event, article) {
      const excerptOnly = event.policy.excerptOnly.includes(channel);
      const url = `${event.canonicalUrl}?utm_source=${channel}&utm_medium=social&utm_campaign=${encodeURIComponent(event.policy.utmCampaign)}`;
      return {
        ...article,
        text: excerptOnly ? article.text.slice(0, 280) : article.text,
        url,
        publication: event.publication,
        language: event.language,
        excerptOnly,
        utmCampaign: event.policy.utmCampaign,
      };
    },
    async publish() {
      return { status: 'dry-run' };
    },
  };
}

export interface PostizAdapterConfig {
  baseUrl: string;
  apiKey: string;
  integrationIds?: ReadonlyArray<string>;
  fetcher?: typeof fetch;
}

export function createPostizAdapter(config: PostizAdapterConfig): DistributionAdapter {
  const fetcher = config.fetcher ?? fetch;
  return {
    channel: 'postiz',
    mode: 'live',
    prepare(event, article) {
      return createDryRunAdapter('postiz').prepare(event, article);
    },
    async publish(_delivery, payload) {
      const response = await fetcher(`${config.baseUrl.replace(/\/+$/, '')}/public/v1/posts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: `${payload.title}\n\n${payload.text}\n\n${payload.url}`,
          providers: config.integrationIds,
          scheduleDate: new Date().toISOString(),
          type: 'now',
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Postiz publish failed with HTTP ${response.status}: ${await response.text()}`,
        );
      }

      const data = (await response.json().catch(() => ({}))) as { id?: string; url?: string };
      return {
        status: 'published',
        externalUrl: data.url ?? (data.id ? `${config.baseUrl}/posts/${data.id}` : undefined),
      };
    },
  };
}

export const linkedinAdapter = createDryRunAdapter('linkedin');
export const mediumAdapter = createDryRunAdapter('medium');
export const substackAdapter = createDryRunAdapter('substack');
export const metaAdapter = createDryRunAdapter('meta');
export const postizAdapter = createDryRunAdapter('postiz');

export const distributionAdapters: Readonly<
  Record<DistributionChannel, DistributionAdapter | undefined>
> = {
  linkedin: linkedinAdapter,
  medium: mediumAdapter,
  substack: substackAdapter,
  meta: metaAdapter,
  postiz: postizAdapter,
  rss: undefined,
};

export interface DispatchInput {
  event: ArticlePublishedEvent;
  article: Pick<DistributionPayload, 'title' | 'text'>;
  accountIds: Readonly<Partial<Record<DistributionChannel, string>>>;
  ledger: DistributionLedger;
  adapters?: Readonly<Record<DistributionChannel, DistributionAdapter | undefined>>;
  now: string;
}

export async function dispatchArticlePublished({
  event,
  article,
  accountIds,
  ledger,
  adapters = distributionAdapters,
  now,
}: DispatchInput): Promise<ReadonlyArray<DistributionDelivery>> {
  const deliveries: DistributionDelivery[] = [];
  for (const channel of event.policy.channels) {
    const accountId = accountIds[channel];
    if (!accountId) continue;
    const existing = ledger.get(`${event.eventId}:${channel}:${accountId}`);
    const delivery = existing ?? createDelivery(event, channel, accountId, now);
    if (
      delivery.status === 'published' ||
      delivery.status === 'withdrawn' ||
      delivery.status === 'skipped'
    ) {
      deliveries.push(delivery);
      continue;
    }
    if (event.policy.permittedChannels && !event.policy.permittedChannels.includes(channel)) {
      const skipped = transitionDelivery(delivery, 'skipped', now);
      ledger.save(skipped);
      deliveries.push(skipped);
      continue;
    }
    const processing = transitionDelivery(delivery, 'processing', now);
    ledger.save(processing);
    const adapter = adapters[channel];
    if (!adapter) {
      const published = transitionDelivery(processing, 'published', now, {
        externalUrl: event.canonicalUrl,
      });
      ledger.save(published);
      deliveries.push(published);
      continue;
    }
    try {
      const result = await adapter.publish(processing, adapter.prepare(event, article));
      const finalStatus = result.status === 'dry-run' ? 'skipped' : 'published';
      const completed = transitionDelivery(processing, finalStatus, now, {
        externalUrl: result.externalUrl,
      });
      ledger.save(completed);
      deliveries.push(completed);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown distribution failure';
      const failed = transitionDelivery(processing, 'failed', now, { lastError: message });
      ledger.save(failed);
      deliveries.push(failed);
    }
  }
  return deliveries;
}

export function createMemoryDispatchLedger() {
  return new MemoryDistributionLedger();
}
