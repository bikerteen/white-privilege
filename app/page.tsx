import Image from "next/image";
import Snowfall from "./Snowfall";

export default function Home() {
  return (
    <main className="landing">
      <Snowfall />
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
