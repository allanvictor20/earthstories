import { useEffect, useRef, useState } from 'react';
import { buildImageUrl, captionFor, prefersReducedData } from '../services/illustration';

const LOAD_TIMEOUT_MS = 20000;

/**
 * Chapter illustration: the same measured data as the charts, rendered at the
 * height people actually live at.
 *
 * On a metered or slow connection the image is offered behind a tap rather
 * than downloaded automatically.
 */
export default function ChapterImage({ cityData, birthYear, chapter, year }) {
  const [status, setStatus] = useState('loading');
  const [deferred, setDeferred] = useState(() => prefersReducedData());

  const src = buildImageUrl(cityData, birthYear, chapter, year);
  const caption = captionFor(cityData, chapter, year);

  // A new chapter or year means a new image; reset the load state during
  // render rather than in an effect, avoiding an extra commit.
  const [lastSrc, setLastSrc] = useState(src);
  if (src !== lastSrc) {
    setLastSrc(src);
    setStatus('loading');
  }

  // Generation normally takes a couple of seconds. On a stalled or very slow
  // connection the request can hang indefinitely, which would leave a
  // permanent "Drawing..." box in the middle of the chapter, so give up and
  // let the story continue without the picture.
  const timerRef = useRef(null);
  useEffect(() => {
    if (deferred || status !== 'loading') return undefined;
    timerRef.current = setTimeout(() => setStatus('error'), LOAD_TIMEOUT_MS);
    return () => clearTimeout(timerRef.current);
  }, [deferred, status, src]);

  if (deferred) {
    return (
      <figure className="chapter-image chapter-image--deferred">
        <button
          type="button"
          className="chapter-image__load"
          onClick={() => setDeferred(false)}
        >
          🖼 Show the picture for this chapter
        </button>
        <figcaption className="chapter-image__caption">
          Your connection looks metered, so pictures are off by default.
        </figcaption>
      </figure>
    );
  }

  // A failed illustration must never break the story; the chapter simply
  // carries on without it.
  if (status === 'error') return null;

  return (
    <figure className="chapter-image">
      {status === 'loading' && (
        <div className="chapter-image__placeholder" role="status">
          <span className="loading-dots" aria-hidden="true"><span /><span /><span /></span>
          <span>Drawing {cityData.city.split(',')[0]} in {year}…</span>
        </div>
      )}
      <img
        src={src}
        alt={caption}
        width="768"
        height="512"
        loading="lazy"
        decoding="async"
        className="chapter-image__img"
        style={{ display: status === 'ready' ? 'block' : 'none' }}
        onLoad={() => setStatus('ready')}
        onError={() => setStatus('error')}
      />
      {status === 'ready' && <figcaption className="chapter-image__caption">{caption}</figcaption>}
    </figure>
  );
}
