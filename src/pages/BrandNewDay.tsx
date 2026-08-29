import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import heroFilm from "@/assets/hero-film.mp4.asset.json";
import heroFilmWebm from "@/assets/hero-film.webm.asset.json";
import heroFilmPoster from "@/assets/hero-film-poster.jpg.asset.json";

type Cue = { text: string; a: number; b: number; size: string; hero?: boolean };

// timings in seconds against the 10s loop
const CUES: Cue[] = [
  { text: "COME ON, COME ON, COME ON", a: 0.6, b: 3.4, size: "clamp(1.4rem,6vw,3rem)" },
  { text: "OH, OH, OH, OH, OH", a: 3.6, b: 6.0, size: "clamp(1.4rem,6vw,3rem)" },
  { text: "COME ON, COME ON", a: 6.1, b: 7.4, size: "clamp(1.3rem,5vw,2.6rem)" },
  { text: "BRAND NEW DAY", a: 7.6, b: 10, size: "clamp(2.4rem,11vw,7rem)", hero: true },
];

const PUBLISHED_ASSET_ORIGIN = "https://outfyt-virtually.lovable.app";

const getAssetSource = (assetUrl: string) => {
  const isLocalPreview = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
  return isLocalPreview ? `${PUBLISHED_ASSET_ORIGIN}${assetUrl}` : assetUrl;
};

const BrandNewDay = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [t, setT] = useState(0);
  const [videoSrc, setVideoSrc] = useState(() => getAssetSource(heroFilm.url));
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const isLocalPreview = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
    if (!isLocalPreview) return;

    let objectUrl: string | undefined;
    const loadLocalFilm = async () => {
      try {
        const response = await fetch(`${PUBLISHED_ASSET_ORIGIN}${heroFilm.url}`);
        if (!response.ok) return;
        const film = await response.blob();
        objectUrl = URL.createObjectURL(film);
        setVideoSrc(objectUrl);
      } catch {
        // Keep the direct CDN source as a fallback if the Blob load is unavailable.
      }
    };

    void loadLocalFilm();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  const handleVideoError = () => {
    const fallbackSource = getAssetSource(heroFilm.url);
    if (videoSrc !== fallbackSource) setVideoSrc(fallbackSource);
  };

  const handleVideoReady = () => {
    setVideoReady(true);
    videoRef.current?.play().catch(() => {});
  };

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let raf = 0;
    const tick = () => {
      setT(v.currentTime);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // subtle beat pulse for the kinetic captions
  const pulse = 1 + Math.sin(t * Math.PI * 2 * 2) * 0.018;

  return (
    <main
      className="relative h-[100svh] w-full overflow-hidden"
      style={{ background: "hsl(var(--film-ink, 0 0% 4%))" }}
    >
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        poster={getAssetSource(heroFilmPoster.url)}
        aria-label="OUTFYT brand film"
        onCanPlay={handleVideoReady}
        onError={handleVideoError}
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
      >
        <source src={getAssetSource(heroFilmWebm.url)} type="video/webm" />
        <source src={videoSrc} type="video/mp4" />
      </video>

      {/* cinematic grade: vignette + crimson lift */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(115% 85% at 50% 45%, transparent 30%, rgba(0,0,0,0.55) 72%, rgba(0,0,0,0.9) 100%)",
        }}
      />

      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 py-4 md:px-8 md:py-5">
        <span
          className="font-display text-lg md:text-xl font-bold tracking-tight"
          style={{ color: "hsl(var(--film-bone, 40 20% 94%))" }}
        >
          OUTFYT
        </span>
        <Link
          to="/auth"
          className="text-sm md:text-base font-medium underline-offset-4 hover:underline"
          style={{ color: "hsl(var(--film-bone, 40 20% 94%))" }}
        >
          Login / Sign up
        </Link>
      </header>

      {/* kinetic captions, left-aligned lower third */}
      <div className="absolute inset-x-0 bottom-[14vh] z-20 px-6 md:px-12">
        {CUES.map((c) => {
          const span = c.b - c.a;
          const fade = Math.min(0.45, span * 0.3);
          const inO = Math.min(1, Math.max(0, (t - c.a) / fade));
          const outO = Math.min(1, Math.max(0, (c.b - t) / fade));
          const o = Math.min(inO, outO);
          if (o <= 0.01) return null;
          return (
            <h1
              key={c.text}
              className="font-display font-extrabold uppercase leading-[0.95] tracking-tight"
              style={{
                position: "absolute",
                left: 0,
                bottom: 0,
                fontSize: c.size,
                color: "#fff",
                opacity: o,
                letterSpacing: c.hero ? "-0.02em" : "0.02em",
                transform: `scale(${c.hero ? 1 : pulse}) translateY(${(1 - o) * 14}px)`,
                textShadow: "0 0 40px rgba(220,30,50,0.35), 0 2px 24px rgba(0,0,0,0.6)",
                maxWidth: "14ch",
              }}
            >
              {c.text}
            </h1>
          );
        })}
      </div>

      {/* film grain */}
      <div
        className="pointer-events-none absolute inset-0 z-10 opacity-[0.07] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/></filter><rect width='120' height='120' filter='url(%23n)'/></svg>\")",
          backgroundSize: "180px 180px",
        }}
      />
    </main>
  );
};

export default BrandNewDay;
