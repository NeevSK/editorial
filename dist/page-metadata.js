/**
 * @intuitui-labs/editorial - Page Metadata & Git Provenance Engine
 *
 * Extracts first-commit (published) and latest-commit (modified) timestamps directly from
 * git history for every page, generating Schema.org JSON-LD and editorial contracts.
 */
import { execSync } from 'child_process';
import * as fs from 'fs';
// In-memory cache to prevent repeated git log invocations across SSG builds
const gitCache = new Map();
/**
 * Resolves a route pathname to an existing source file on disk
 */
export function resolvePageSourceFile(routeOrPath, rootDir = process.cwd()) {
    // If it's already an existing file path, return it directly
    if (fs.existsSync(`${rootDir}/${routeOrPath}`)) {
        return routeOrPath;
    }
    const clean = routeOrPath.replace(/^\/|\/$/g, '');
    if (!clean)
        return 'src/pages/index.astro';
    const segments = clean.split('/');
    const candidates = [
        `src/pages/${clean}.astro`,
        `src/pages/${clean}/index.astro`,
        `src/pages/${segments[0]}/[slug].astro`,
        `src/pages/${segments[0]}/[...slug].astro`,
        `src/pages/${clean}.md`,
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(`${rootDir}/${candidate}`)) {
            return candidate;
        }
    }
    return 'src/pages/index.astro';
}
/**
 * Extracts ISO commit dates from Git history for a given file.
 * Returns { published, modified } ISO 8601 strings.
 *
 * In development mode, returns instant timestamps without spawning child processes,
 * preventing Windows libuv assertion crashes.
 */
export function getGitDates(filePathOrRoute, cwd = process.cwd()) {
    const resolvedPath = resolvePageSourceFile(filePathOrRoute, cwd);
    const cacheKey = `${cwd}:${resolvedPath}`;
    if (gitCache.has(cacheKey)) {
        return gitCache.get(cacheKey);
    }
    // In development, avoid continuous child_process spawning on Windows libuv
    if (process.env.NODE_ENV === 'development') {
        const now = new Date().toISOString();
        const devDates = { published: now, modified: now };
        gitCache.set(cacheKey, devDates);
        return devDates;
    }
    let published = '';
    let modified = '';
    try {
        const fullPath = `${cwd}/${resolvedPath}`;
        if (fs.existsSync(fullPath)) {
            // 1. Get latest commit date (modified)
            const modResult = execSync(`git log -1 --format=%aI -- "${resolvedPath}"`, {
                cwd,
                encoding: 'utf-8',
                stdio: ['ignore', 'pipe', 'ignore'],
            }).trim();
            if (modResult)
                modified = modResult;
            // 2. Get first commit date (published)
            const pubResult = execSync(`git log --follow --format=%aI -- "${resolvedPath}"`, {
                cwd,
                encoding: 'utf-8',
                stdio: ['ignore', 'pipe', 'ignore'],
            }).trim();
            if (pubResult) {
                const lines = pubResult.split(/\r?\n/).filter(Boolean);
                published = lines[lines.length - 1]?.trim() || modified;
            }
        }
    }
    catch {
        // Fallback if git command fails
    }
    // Fallback to filesystem timestamps if git is absent or file is untracked
    if (!modified || !published) {
        try {
            const fullPath = `${cwd}/${resolvedPath}`;
            if (fs.existsSync(fullPath)) {
                const stats = fs.statSync(fullPath);
                const fileDate = stats.mtime.toISOString();
                if (!modified)
                    modified = fileDate;
                if (!published)
                    published = stats.birthtime.toISOString() || fileDate;
            }
        }
        catch {
            // Ignored
        }
    }
    const now = new Date().toISOString();
    const result = {
        published: published || now,
        modified: modified || published || now,
    };
    gitCache.set(cacheKey, result);
    return result;
}
/**
 * Generates Schema.org JSON-LD WebPage metadata for any page
 */
export function generatePageStructuredData(meta) {
    return {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: meta.title,
        description: meta.description,
        url: meta.canonicalUrl,
        datePublished: meta.datePublished,
        dateModified: meta.dateModified,
        inLanguage: meta.language ?? 'en',
        author: {
            '@type': 'Person',
            name: meta.author,
        },
        publisher: {
            '@type': 'Organization',
            name: meta.originPublication,
            url: meta.canonicalUrl,
        },
        license: meta.license,
        keywords: meta.keywords?.join(', '),
    };
}
//# sourceMappingURL=page-metadata.js.map