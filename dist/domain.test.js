import { describe, expect, it } from 'vitest';
import { createLinkedInAdapter, createMemoryDispatchLedger, createPostizAdapter, dispatchArticlePublished, linkedinAdapter, } from './distribution';
import { canTransitionSubmission, createArticlePublishedEvent, createDelivery, MemoryDistributionLedger, transitionDelivery, } from './domain';
const event = createArticlePublishedEvent({
    eventId: 'evt-1',
    occurredAt: '2026-08-31T00:00:00.000Z',
    workId: 'work-1',
    versionId: 'version-1',
    publication: 'edlove',
    language: 'en',
    canonicalUrl: 'https://edlove.org/journal/example',
    policy: { channels: ['linkedin'], excerptOnly: ['linkedin'], utmCampaign: 'journal-launch' },
});
describe('editorial distribution contracts', () => {
    it('creates stable idempotent delivery keys', () => {
        expect(createDelivery(event, 'linkedin', 'edlove-main', event.occurredAt).idempotencyKey).toBe('evt-1:linkedin:edlove-main');
    });
    it('allows retry after failure and increments attempts', () => {
        const delivery = createDelivery(event, 'linkedin', 'edlove-main', event.occurredAt);
        const processing = transitionDelivery(delivery, 'processing', event.occurredAt);
        const failed = transitionDelivery(processing, 'failed', event.occurredAt, {
            lastError: 'rate limited',
        });
        const retry = transitionDelivery(failed, 'processing', event.occurredAt);
        expect(retry.attempts).toBe(2);
        expect(retry.status).toBe('processing');
    });
    it('prepares channel-specific links and excerpts', () => {
        const payload = linkedinAdapter.prepare(event, { title: 'Title', text: 'x'.repeat(400) });
        expect(payload.text).toHaveLength(280);
        expect(payload.url).toContain('utm_source=linkedin');
    });
    it('deduplicates deliveries through the ledger', () => {
        const ledger = new MemoryDistributionLedger();
        const delivery = createDelivery(event, 'linkedin', 'edlove-main', event.occurredAt);
        ledger.save(delivery);
        ledger.save(delivery);
        expect(ledger.list(event.eventId)).toHaveLength(1);
    });
    it('does not claim a dry-run adapter published externally', async () => {
        const deliveries = await dispatchArticlePublished({
            event,
            article: { title: 'Title', text: 'Body' },
            accountIds: { linkedin: 'edlove-main' },
            ledger: createMemoryDispatchLedger(),
            now: event.occurredAt,
        });
        expect(deliveries[0]?.status).toBe('skipped');
    });
    it('records a skipped delivery when rights exclude a channel', async () => {
        const restrictedEvent = createArticlePublishedEvent({
            ...event,
            eventId: 'evt-restricted',
            policy: {
                ...event.policy,
                permittedChannels: [],
            },
        });
        const deliveries = await dispatchArticlePublished({
            event: restrictedEvent,
            article: { title: 'Title', text: 'Body' },
            accountIds: { linkedin: 'edlove-main' },
            ledger: createMemoryDispatchLedger(),
            now: restrictedEvent.occurredAt,
        });
        expect(deliveries[0]?.status).toBe('skipped');
    });
    it('keeps submission approval behind review states', () => {
        expect(canTransitionSubmission('submitted', 'approved')).toBe(false);
        expect(canTransitionSubmission('in_review', 'rights_review')).toBe(true);
        expect(canTransitionSubmission('rights_review', 'approved')).toBe(true);
        expect(canTransitionSubmission('approved', 'in_review')).toBe(false);
    });
    it('publishes a LinkedIn post through the supported Posts API shape', async () => {
        let request;
        const adapter = createLinkedInAdapter({
            accessToken: 'token',
            authorUrn: 'urn:li:organization:1',
            apiVersion: '202601',
            fetcher: async (input, init) => {
                request = new Request(input, init);
                return new Response(null, { status: 201, headers: { 'x-restli-id': 'urn:li:share:2' } });
            },
        });
        const result = await adapter.publish(createDelivery(event, 'linkedin', 'edlove-main', event.occurredAt), adapter.prepare(event, { title: 'Title', text: 'Body' }));
        expect(result).toEqual({
            status: 'published',
            externalUrl: 'https://www.linkedin.com/feed/update/urn%3Ali%3Ashare%3A2',
        });
        expect(request?.headers.get('Linkedin-Version')).toBe('202601');
        expect(await request?.json()).toMatchObject({
            author: 'urn:li:organization:1',
            lifecycleState: 'PUBLISHED',
        });
    });
    it('publishes a post via Postiz REST API contract', async () => {
        let request;
        const adapter = createPostizAdapter({
            baseUrl: 'https://postiz.example.com',
            apiKey: 'test-api-key',
            integrationIds: ['li-1', 'x-1'],
            fetcher: async (input, init) => {
                request = new Request(input, init);
                return new Response(JSON.stringify({ id: 'post-123', url: 'https://postiz.example.com/posts/post-123' }), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' },
                });
            },
        });
        const result = await adapter.publish(createDelivery(event, 'postiz', 'postiz-main', event.occurredAt), adapter.prepare(event, { title: 'Title', text: 'Body' }));
        expect(result).toEqual({
            status: 'published',
            externalUrl: 'https://postiz.example.com/posts/post-123',
        });
        expect(request?.headers.get('Authorization')).toBe('Bearer test-api-key');
        expect(await request?.json()).toMatchObject({
            providers: ['li-1', 'x-1'],
            type: 'now',
        });
    });
});
//# sourceMappingURL=domain.test.js.map