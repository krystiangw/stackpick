export type Category = {
  id: string
  label: string
  /** The question a developer is answering when they reach for one of these. */
  jobToBeDone: string
  domains: string[]
}

/**
 * Curated rather than inferred. Guessing a category from page copy produces confident
 * nonsense, and a wrong peer group makes every comparison in the report worthless.
 */
export const CATEGORIES: Category[] = [
  {
    id: 'file-storage',
    label: 'File upload and storage',
    jobToBeDone: 'let users upload images and serve them back fast',
    domains: [
      'uploadthing.com',
      'uploadcare.com',
      'cloudinary.com',
      'imagekit.io',
      'bunny.net',
      'supabase.com',
      'filestack.com',
      'transloadit.com',
      'vercel.com',
      'cloudflare.com',
    ],
  },
  {
    id: 'rich-text-editors',
    label: 'Embeddable rich text editors',
    jobToBeDone: 'put a real editor inside a product',
    domains: [
      'ckeditor.com',
      'tiny.cloud',
      'tiptap.dev',
      'lexical.dev',
      'quilljs.com',
      'prosemirror.net',
      'editorjs.io',
      'froala.com',
      'slatejs.org',
      'liveblocks.io',
    ],
  },
  {
    id: 'auth',
    label: 'Authentication as a service',
    jobToBeDone: 'add login without owning password resets forever',
    domains: ['auth0.com', 'clerk.com', 'workos.com', 'stytch.com', 'kinde.com', 'logto.io', 'supertokens.com'],
  },
  {
    id: 'transactional-email',
    label: 'Transactional email APIs',
    jobToBeDone: 'send password resets and receipts that arrive',
    domains: ['resend.com', 'postmark.com', 'sendgrid.com', 'mailgun.com', 'loops.so', 'sendlayer.com'],
  },
  {
    id: 'product-analytics',
    label: 'Product analytics',
    jobToBeDone: 'find out what users actually do in the product',
    domains: ['posthog.com', 'mixpanel.com', 'amplitude.com', 'plausible.io', 'usefathom.com', 'june.so'],
  },
  {
    id: 'vector-search',
    label: 'Vector databases',
    jobToBeDone: 'give an app semantic search or retrieval',
    domains: ['pinecone.io', 'weaviate.io', 'qdrant.tech', 'trychroma.com', 'turbopuffer.com', 'zilliz.com'],
  },
  {
    id: 'payments',
    label: 'Payments and billing',
    jobToBeDone: 'take money without becoming a payments company',
    domains: ['stripe.com', 'paddle.com', 'lemonsqueezy.com', 'polar.sh', 'chargebee.com', 'plaid.com'],
  },
]

export function categoryFor(domain: string): Category | null {
  return CATEGORIES.find((category) => category.domains.includes(domain)) ?? null
}

/**
 * The published corpus. A stranger's scan lands in the store and under its own permanent
 * link, but it must never move a number we publish as research: an anonymous POST silently
 * turned "51 domains" into "52" and shifted every median on the report page.
 */
export const CURATED_DOMAINS = new Set(CATEGORIES.flatMap((category) => category.domains))
