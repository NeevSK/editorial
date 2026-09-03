const allowedSubmissionTransitions = {
    submitted: ['submitted', 'in_review', 'rights_review', 'rejected', 'withdrawn'],
    in_review: ['in_review', 'rights_review', 'approved', 'rejected', 'withdrawn'],
    rights_review: ['rights_review', 'in_review', 'approved', 'rejected', 'withdrawn'],
    approved: ['approved', 'withdrawn'],
    rejected: ['rejected', 'in_review'],
    withdrawn: ['withdrawn', 'in_review'],
};
export function canTransitionSubmission(from, to) {
    return allowedSubmissionTransitions[from].includes(to);
}
const allowedTransitions = {
    pending: ['processing', 'skipped'],
    processing: ['published', 'failed', 'withdrawn', 'skipped'],
    published: ['withdrawn'],
    failed: ['processing', 'skipped'],
    withdrawn: [],
    skipped: [],
};
export function createArticlePublishedEvent(input) {
    return { ...input, type: 'article.published' };
}
export function createDelivery(event, channel, accountId, now) {
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
export function transitionDelivery(delivery, status, now, details = {}) {
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
export class MemoryDistributionLedger {
    deliveries = new Map();
    get(idempotencyKey) {
        return this.deliveries.get(idempotencyKey);
    }
    save(delivery) {
        const existing = this.deliveries.get(delivery.idempotencyKey);
        if (existing && existing.id !== delivery.id)
            throw new Error(`Delivery key collision: ${delivery.idempotencyKey}`);
        this.deliveries.set(delivery.idempotencyKey, delivery);
        return delivery;
    }
    list(eventId) {
        const deliveries = [...this.deliveries.values()];
        return eventId ? deliveries.filter((delivery) => delivery.eventId === eventId) : deliveries;
    }
}
//# sourceMappingURL=domain.js.map