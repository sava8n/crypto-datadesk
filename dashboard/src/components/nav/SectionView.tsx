import type { View } from './sections';

export default function SectionView({ view }: { view: View }) {
  return (
    <article className="view">
      {view.render()}
      {view.desc && (
        <section className="view__about">
          <span className="view__about-k">Description</span>
          <div className="view__desc">
            {view.desc.map((para) => (
              <p key={para.slice(0, 40)}>{para}</p>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}
