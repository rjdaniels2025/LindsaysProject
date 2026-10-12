import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Quote } from 'lucide-react'

const testimonials = [
  {
    name: 'Jacquie',
    role: 'Elevate client',
    quote: 'This is the best thing I’ve done for myself in a long time! I’m learning to prioritize myself, create healthy routines, set boundaries, and stay focused without feeling overwhelmed. I’m so grateful I took this step and started my journey with Elevate!',
  },
  {
    name: 'Sameer',
    role: 'Elevate client',
    title: "Sameer’s Elevate Journey",
    quote: 'I started my health and fitness journey in February 2024, and since then, I’ve continued to grow, learn, and become a better version of myself. This journey has changed more than just my appearance—it has helped me build consistency, discipline, and healthier habits.\n\nI’m proud of how far I’ve come and excited to keep progressing. It’s been a journey, and I’m grateful to have kept showing up.',
    images: ['/sameer-journey-2.webp', '/sameer-journey-1.webp', '/sameer-journey-3.webp'],
  },
]

export default function TestimonialCarousel() {
  const [active, setActive] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => setActive((value) => (value + 1) % testimonials.length), 7000)
    return () => window.clearInterval(timer)
  }, [])

  const previous = () => setActive((value) => (value - 1 + testimonials.length) % testimonials.length)
  const next = () => setActive((value) => (value + 1) % testimonials.length)

  return (
    <div className="mx-auto mt-10 max-w-5xl">
      <div className="overflow-hidden rounded-2xl border border-accent/25 bg-gradient-to-br from-white/[0.06] to-accent/[0.04] shadow-2xl shadow-black/40">
        <div className="flex transition-transform duration-500 ease-out" style={{ transform: `translateX(-${active * 100}%)` }}>
          {testimonials.map((testimonial) => (
            <figure key={testimonial.name} className="w-full shrink-0 p-6 text-left sm:p-10">
              {testimonial.images ? (
                <div className="mb-8 grid h-64 grid-cols-3 gap-2 overflow-hidden rounded-xl sm:h-80 sm:gap-3">
                  {testimonial.images.map((src, index) => (
                    <img
                      key={src}
                      src={src}
                      alt={`Sameer’s Elevate journey photo ${index + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ))}
                </div>
              ) : null}

              {testimonial.title ? (
                <p className="mb-4 font-heading text-2xl uppercase text-accent sm:text-3xl">{testimonial.title}</p>
              ) : null}

              <Quote size={38} className="text-accent" aria-hidden="true" />
              <blockquote className="mt-5 whitespace-pre-line text-xl font-medium leading-9 text-white sm:text-2xl sm:leading-10">
                “{testimonial.quote}”
              </blockquote>
              <figcaption className="mt-7 flex items-center gap-3 border-t border-white/10 pt-5">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-accent font-heading text-lg uppercase text-black">
                  {testimonial.name.charAt(0)}
                </span>
                <div>
                  <p className="font-heading text-xl uppercase text-white">{testimonial.name}</p>
                  <p className="text-sm text-body">{testimonial.role}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-4">
        <button type="button" onClick={previous} className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-accent/60 hover:text-accent" aria-label="Previous testimonial">
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          {testimonials.map((testimonial, index) => (
            <button
              key={testimonial.name}
              type="button"
              onClick={() => setActive(index)}
              className={`h-2.5 rounded-full transition-all ${index === active ? 'w-8 bg-accent' : 'w-2.5 bg-white/25 hover:bg-white/50'}`}
              aria-label={`Show ${testimonial.name} testimonial`}
              aria-current={index === active ? 'true' : undefined}
            />
          ))}
        </div>
        <button type="button" onClick={next} className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-accent/60 hover:text-accent" aria-label="Next testimonial">
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  )
}
