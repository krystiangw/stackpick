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
    id: 'payments-and-apis',
    label: 'Developer-first APIs',
    jobToBeDone: 'add payments, messaging or auth without building it',
    domains: ['stripe.com', 'twilio.com', 'auth0.com', 'clerk.com', 'resend.com', 'plaid.com'],
  },
]

export function categoryFor(domain: string): Category | null {
  return CATEGORIES.find((category) => category.domains.includes(domain)) ?? null
}
