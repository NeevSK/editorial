/**
 * @intuitui-labs/editorial - Page Metadata & Git Provenance Engine
 *
 * Extracts first-commit (published) and latest-commit (modified) timestamps directly from
 * git history for every page, generating Schema.org JSON-LD and editorial contracts.
 */
export interface PageEditorialMetadata {
    title: string;
    description: string;
    canonicalUrl: string;
    originPublication: 'neevsk' | 'intuitui' | 'edlove' | 'gurudevi';
    author: string;
    license: string;
    datePublished: string;
    dateModified: string;
    workId?: string;
    language?: string;
    keywords?: string[];
}
/**
 * Resolves a route pathname to an existing source file on disk
 */
export declare function resolvePageSourceFile(routeOrPath: string, rootDir?: string): string;
/**
 * Extracts ISO commit dates from Git history for a given file.
 * Returns { published, modified } ISO 8601 strings.
 *
 * In development mode, returns instant timestamps without spawning child processes,
 * preventing Windows libuv assertion crashes.
 */
export declare function getGitDates(filePathOrRoute: string, cwd?: string): {
    published: string;
    modified: string;
};
/**
 * Generates Schema.org JSON-LD WebPage metadata for any page
 */
export declare function generatePageStructuredData(meta: PageEditorialMetadata): {
    '@context': string;
    '@type': string;
    name: string;
    description: string;
    url: string;
    datePublished: string;
    dateModified: string;
    inLanguage: string;
    author: {
        '@type': string;
        name: string;
    };
    publisher: {
        '@type': string;
        name: "edlove" | "gurudevi" | "intuitui" | "neevsk";
        url: string;
    };
    license: string;
    keywords: string | undefined;
};
//# sourceMappingURL=page-metadata.d.ts.map