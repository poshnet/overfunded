import { permanentRedirect } from 'next/navigation';

/**
 * The closer used to live here and the old path is indexed, so it keeps a 308
 * to /close rather than starting to return 404s.
 */
export default function LegacyCloserRoute(): never {
  permanentRedirect('/close');
}
