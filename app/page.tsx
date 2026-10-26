import Image from "next/image";
import PixelSnow from "./PixelSnow";

export default function Home() {
  return (
    <main className="landing">
      <div className="snow-background" aria-hidden="true">
        <PixelSnow
          color="#ffffff"
          variant="snowflake"
          density={0.5}
          speed={3}
          wind={0.25}
          flakeSize={1}
          pixelSize={1}
          glow={1.95}
          mouseInteraction
          accumulate
          lightMode={false}
          dpr={1.5}
        />
      </div>
      <section className="launch" aria-labelledby="brand-name">
        <h1 id="brand-name" className="brand">
          white privilege<sup>TM</sup>
        </h1>
        <div className="pack">
          <Image
            className="pack-image"
            src="/brick2.png"
            alt="A white brick wrapped in clear plastic and beige tape"
            width={666}
            height={375}
            sizes="(max-width: 600px) 140vw, (max-width: 752px) 100vw, 704px"
            preload
            draggable={false}
          />
        </div>
        <p className="release-date">
          <span className="sr-only">Launching </span>
          <time dateTime="2027-06-08">08/06/27</time>
        </p>
      </section>
    </main>
  );
}
